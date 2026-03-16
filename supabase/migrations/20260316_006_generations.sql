-- Adds generations (поколения) for models with title + photo

create table public.model_generations (
  id bigserial primary key,
  model_id bigint not null references public.models(id) on delete cascade,
  title text not null,
  subtitle text,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

create index model_generations_model_id_idx on public.model_generations(model_id);

alter table public.model_generations enable row level security;

-- Public read (for site pages)
create policy "Public can read model generations"
on public.model_generations
for select
to anon, authenticated
using (true);

-- Admin manage
create policy "Admins can manage model generations"
on public.model_generations
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

