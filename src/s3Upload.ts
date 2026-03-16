const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function uploadImageToS3(
  file: File,
  folder: 'brands' | 'models' | 'ads' | 'avatars',
): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.error('Supabase URL or anon key is not set')
    return null
  }

  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/s3-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: form,
    })

    if (!resp.ok) {
      const text = await resp.text()
      // eslint-disable-next-line no-console
      console.error('s3-upload edge function error', resp.status, text)
      return null
    }

    const json = (await resp.json()) as { publicUrl?: string }
    return json.publicUrl ?? null
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to call s3-upload function', error)
    return null
  }
}

