-- AUTONOVA: функция для получения URL загрузки в S3 Reg.ru
-- Фронт вызывает: select create_s3_signed_url('ads/123.jpg', 'image/jpeg');

create or replace function public.create_s3_signed_url(
  path text,
  content_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  upload_url text;
  public_url text;
begin
  -- Публичный URL (virtual-hosted-style)
  public_url := format('https://auto-nova.website.regru.cloud/%s', path);

  -- Упрощённый вариант: path-style URL как upload_url.
  -- В продакшене сюда стоит добавить реальную генерацию pre-signed URL.
  upload_url := format('https://s3.regru.cloud/auto-nova/%s', path);

  return jsonb_build_object(
    'upload_url', upload_url,
    'public_url', public_url
  );
end;
$$;

revoke all on function public.create_s3_signed_url(text, text) from public;
grant execute on function public.create_s3_signed_url(text, text) to anon, authenticated;

