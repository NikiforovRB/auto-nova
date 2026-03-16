-- Adds generation_id to ads, to link specific model generation

alter table public.ads
add column if not exists generation_id bigint references public.model_generations(id);

