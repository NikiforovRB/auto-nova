-- Site documents editable from admin panel

create table if not exists public.site_documents (
  key text primary key,
  title text not null,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_documents enable row level security;

create policy "Public read site documents"
on public.site_documents
for select
using (true);

create policy "Admins manage site documents"
on public.site_documents
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

insert into public.site_documents (key, title, content)
values
  ('privacy', 'Политика конфиденциальности', ''),
  ('personal_data', 'Политика обработки персональных данных', '')
on conflict (key) do nothing;

