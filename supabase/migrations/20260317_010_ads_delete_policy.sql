-- Allow listing owners to delete their own ads.
-- Without this, DELETE may be blocked by RLS (and look like "nothing happened").

create policy "Owner delete ads"
on public.ads
for delete
using (auth.uid() = user_id);

