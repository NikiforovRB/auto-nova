-- Adds ordering fields for admin drag & drop sorting

alter table public.brands
add column if not exists sort_order integer;

alter table public.models
add column if not exists sort_order integer;

-- Backfill brands sort order by name
with ranked as (
  select id, row_number() over (order by name asc) - 1 as rn
  from public.brands
)
update public.brands b
set sort_order = r.rn
from ranked r
where b.id = r.id
  and b.sort_order is null;

-- Backfill models sort order per brand by name
with ranked as (
  select id, brand_id, row_number() over (partition by brand_id order by name asc) - 1 as rn
  from public.models
)
update public.models m
set sort_order = r.rn
from ranked r
where m.id = r.id
  and m.sort_order is null;

-- Defaults for new rows
alter table public.brands
alter column sort_order set default 0;

alter table public.models
alter column sort_order set default 0;

