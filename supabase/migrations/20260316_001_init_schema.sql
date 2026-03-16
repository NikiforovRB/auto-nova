-- AUTONOVA: базовая схема данных (справочники, профили, объявления, RLS без S3 и seed)

create extension if not exists "uuid-ossp";

-- Регионы России
create table if not exists public.regions (
  id serial primary key,
  name text not null unique
);

comment on table public.regions is 'Регионы РФ для фильтрации объявлений';

-- Марки
create table if not exists public.brands (
  id serial primary key,
  name text not null unique,
  logo_url text
);

comment on table public.brands is 'Марки автомобилей (бренды)';

-- Модели
create table if not exists public.models (
  id serial primary key,
  brand_id integer not null references public.brands(id) on delete cascade,
  name text not null,
  image_url text,
  unique (brand_id, name)
);

comment on table public.models is 'Модели автомобилей, привязанные к маркам';

-- Профили пользователей
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  region_id integer references public.regions(id),
  phone text,
  is_admin boolean not null default false
);

comment on table public.profiles is 'Профили пользователей AUTONOVA';

-- Автосоздание профиля при создании пользователя
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- Объявления
create table if not exists public.ads (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id integer not null references public.brands(id),
  model_id integer not null references public.models(id),
  price numeric(12,2) not null,
  year integer not null,
  mileage integer not null,
  region_id integer references public.regions(id),
  city text,
  description text,
  created_at timestamptz not null default now(),
  status text not null default 'active'
);

comment on table public.ads is 'Объявления о продаже автомобилей';

-- Фото объявлений
create table if not exists public.ad_photos (
  id serial primary key,
  ad_id integer not null references public.ads(id) on delete cascade,
  url text not null,
  order_index integer,
  created_at timestamptz not null default now()
);

comment on table public.ad_photos is 'Фотографии объявлений (URL в S3)';

-- Избранное
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ad_id integer not null references public.ads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ad_id)
);

comment on table public.favorites is 'Избранные объявления пользователей';

-- Включение RLS
alter table public.profiles enable row level security;
alter table public.ads enable row level security;
alter table public.ad_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.regions enable row level security;

-- Профили: только владелец
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Объявления
create policy "Public view active ads"
on public.ads
for select
using (status = 'active');

create policy "Owner view own ads"
on public.ads
for select
using (auth.uid() = user_id);

create policy "Owner insert ads"
on public.ads
for insert
with check (auth.uid() = user_id);

create policy "Owner update ads"
on public.ads
for update
using (auth.uid() = user_id);

-- Фото объявлений
create policy "Public view photos of active ads"
on public.ad_photos
for select
using (
  exists (
    select 1 from public.ads
    where ads.id = ad_photos.ad_id
      and ads.status = 'active'
  )
);

create policy "Owner manage ad photos"
on public.ad_photos
for all
using (
  exists (
    select 1 from public.ads
    where ads.id = ad_photos.ad_id
      and ads.user_id = auth.uid()
  )
);

-- Избранное
create policy "User manage own favorites"
on public.favorites
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Публичное чтение справочников
create policy "Public read brands"
on public.brands
for select
using (true);

create policy "Public read models"
on public.models
for select
using (true);

create policy "Public read regions"
on public.regions
for select
using (true);

-- Админские права на справочники (по полю is_admin)
create policy "Admins manage brands"
on public.brands
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins manage models"
on public.models
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins manage regions"
on public.regions
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

