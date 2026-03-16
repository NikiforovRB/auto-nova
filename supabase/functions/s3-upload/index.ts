// Supabase Edge Function: s3-upload
// Загружает файл в S3 Reg.ru и возвращает публичный URL.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// Use Deno-targeted bundle for Supabase Edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const STORAGE_BUCKET = Deno.env.get('STORAGE_BUCKET') ?? 'autonova-bucket'

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null

// CORS headers so browser can call this function from your frontend
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({
          error: 'Server is not configured',
          details:
            'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Storage upload.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const form = await req.formData()
    const file = form.get('file')
    const folder = (form.get('folder') as string) ?? 'uploads'

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'file is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const originalName = file.name || 'upload.bin'
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin'
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const fileBuffer = await file.arrayBuffer()

    const contentType = file.type || 'application/octet-stream'
    console.log('storage-upload: uploading', { bucket: STORAGE_BUCKET, key, contentType })

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(key, new Uint8Array(fileBuffer), {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('storage-upload error', uploadError)
      return new Response(JSON.stringify({ error: 'Upload failed', details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: pub } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(key)
    const publicUrl = pub.publicUrl

    return new Response(JSON.stringify({ publicUrl, key }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('s3-upload error', error)
    return new Response(
      JSON.stringify({ error: 'Upload failed', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

