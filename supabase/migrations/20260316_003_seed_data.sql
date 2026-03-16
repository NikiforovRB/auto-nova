-- AUTONOVA: первичные данные (seed) для регионов, марок и моделей

insert into public.regions (name) values
  ('Москва'),
  ('Московская область'),
  ('Санкт-Петербург'),
  ('Ленинградская область'),
  ('Краснодарский край'),
  ('Свердловская область')
on conflict (name) do nothing;

insert into public.brands (name) values
  ('BMW'),
  ('Mercedes-Benz'),
  ('Audi'),
  ('Toyota'),
  ('LADA')
on conflict (name) do nothing;

insert into public.models (brand_id, name)
select b.id, m.name
from (
  values
    ('BMW', '3 Series'),
    ('BMW', '5 Series'),
    ('Mercedes-Benz', 'C-Class'),
    ('Mercedes-Benz', 'E-Class'),
    ('Audi', 'A4'),
    ('Audi', 'A6'),
    ('Toyota', 'Camry'),
    ('Toyota', 'Corolla'),
    ('LADA', 'Vesta'),
    ('LADA', 'Granta')
) as m(brand_name, name)
join public.brands b on b.name = m.brand_name
on conflict (brand_id, name) do nothing;

