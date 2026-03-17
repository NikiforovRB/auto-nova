import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Server is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => null)) as { ad_id?: unknown } | null
    const adId = typeof body?.ad_id === 'number' ? body.ad_id : Number(body?.ad_id)

    if (!Number.isFinite(adId) || adId <= 0) {
      return new Response(JSON.stringify({ error: 'ad_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: adRow, error: adError } = await supabaseAdmin
      .from('ads')
      .select('id,user_id,status')
      .eq('id', adId)
      .maybeSingle()

    if (adError) {
      return new Response(JSON.stringify({ error: 'Failed to load ad', details: adError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!adRow || (adRow as { status?: string | null }).status !== 'active') {
      return new Response(JSON.stringify({ phone: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = (adRow as { user_id: string }).user_id

    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Failed to load profile', details: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phone = (profileRow as { phone: string | null } | null)?.phone ?? null

    return new Response(JSON.stringify({ phone }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

