-- Add ordering for regions (admin drag & drop)

alter table public.regions
add column if not exists sort_order integer;

with ranked as (
  select id, row_number() over (order by name asc) - 1 as rn
  from public.regions
)
update public.regions r
set sort_order = ranked.rn
from ranked
where r.id = ranked.id
  and r.sort_order is null;

alter table public.regions
alter column sort_order set default 0;

