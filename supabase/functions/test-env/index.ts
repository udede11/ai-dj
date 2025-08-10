import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY')
  const hasBeatoven = !!Deno.env.get('BEATOVEN_API_KEY')
  const hasSupabaseUrl = !!Deno.env.get('SUPABASE_URL')
  const hasSupabaseKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  return new Response(
    JSON.stringify({
      environment: {
        hasOpenAI,
        hasBeatoven,
        hasSupabaseUrl,
        hasSupabaseKey
      },
      message: !hasBeatoven ? 'Beatoven API key is missing! Set it with: supabase secrets set BEATOVEN_API_KEY=your_key' : 'All keys configured'
    }),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      } 
    }
  )
})