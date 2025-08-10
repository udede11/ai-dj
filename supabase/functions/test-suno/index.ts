import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiUrl = Deno.env.get('SUNO_API_URL') || 'https://suno-api-2.onrender.com'
    const sunoAuthToken = Deno.env.get('SUNO_AUTH_TOKEN')
    
    console.log(`Testing Suno API at: ${sunoApiUrl}`)
    
    const tests = []
    
    // Test 1: Check credits/limit
    try {
      const limitResponse = await fetch(`${sunoApiUrl}/api/get_limit`)
      const limitData = await limitResponse.json()
      tests.push({
        test: 'Check Credits',
        endpoint: '/api/get_limit',
        status: limitResponse.status,
        success: limitResponse.ok,
        data: limitData
      })
    } catch (e) {
      tests.push({
        test: 'Check Credits',
        endpoint: '/api/get_limit',
        success: false,
        error: e.message
      })
    }
    
    // Test 2: Get existing tracks
    try {
      const getResponse = await fetch(`${sunoApiUrl}/api/get`)
      const getData = await getResponse.json()
      tests.push({
        test: 'Get Tracks',
        endpoint: '/api/get',
        status: getResponse.status,
        success: getResponse.ok,
        trackCount: Array.isArray(getData) ? getData.length : 0
      })
    } catch (e) {
      tests.push({
        test: 'Get Tracks',
        endpoint: '/api/get',
        success: false,
        error: e.message
      })
    }
    
    // Test 3: Try to generate (small test)
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      }
      
      if (sunoAuthToken) {
        headers['Authorization'] = `Bearer ${sunoAuthToken}`
      }
      
      const generateResponse = await fetch(`${sunoApiUrl}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: "Test track, 120 bpm electronic",
          make_instrumental: false,
          model: 'chirp-v3-5',
          wait_audio: false
        })
      })
      
      let responseData = null
      const responseText = await generateResponse.text()
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }
      
      tests.push({
        test: 'Generate Track',
        endpoint: '/api/generate',
        status: generateResponse.status,
        success: generateResponse.ok,
        response: responseData,
        note: generateResponse.status === 500 ? 
          'SUNO_COOKIE may need to be set in Vercel deployment' : 
          'Generation endpoint working'
      })
    } catch (e) {
      tests.push({
        test: 'Generate Track',
        endpoint: '/api/generate',
        success: false,
        error: e.message
      })
    }
    
    return new Response(
      JSON.stringify({
        sunoApiUrl,
        hasAuthToken: !!sunoAuthToken,
        tests,
        recommendation: tests.some(t => !t.success) ? 
          'Some tests failed. Check if SUNO_COOKIE is set in your Vercel deployment at https://vercel.com/dashboard' :
          'All tests passed!'
      }, null, 2),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  }
})