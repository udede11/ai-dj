import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageUrl, partyId, imageData } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get OpenAI API key from secrets
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Use base64 image directly
    let imageForAnalysis: string
    
    if (imageData) {
      // GPT-5 expects just the base64 string without data URL prefix
      imageForAnalysis = imageData
    } else if (imageUrl) {
      imageForAnalysis = imageUrl
    } else {
      throw new Error('No image provided')
    }
    
    // Optionally store image in storage for history (but don't use for analysis)
    if (imageData && partyId) {
      try {
        const fileName = `${partyId}/${Date.now()}.jpg`
        await supabase.storage
          .from('party-frames')
          .upload(fileName, decode(imageData), {
            contentType: 'image/jpeg',
            upsert: false
          })
      } catch (e) {
        console.log('Storage upload failed, continuing:', e)
      }
    }

    // Call GPT-5 Responses API to analyze the image - exactly as shown in docs
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text', 
              text: `Analyze this party scene image and provide a JSON response with:
              - mood: mood description (e.g., "High Energy", "Chill Vibes", "Getting Started", "Peak Party")
              - energy_level: number from 0 to 1 (0 = very calm, 1 = maximum energy)
              - crowd_size: estimated number of people
              - dominant_colors: array of 3 main colors in the scene
              - music_genre: recommended music genre based on the vibe
              - recommended_bpm: BPM recommendation (60-180)
              - description: brief description of the scene
              
              Return ONLY valid JSON, no other text.`
            },
            {
              type: 'input_image',
              image_url: `data:image/jpeg;base64,${imageForAnalysis}`
            }
          ]
        }]
      })
    })

    if (!openAiResponse.ok) {
      const error = await openAiResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const aiResult = await openAiResponse.json()
    console.log('OpenAI Response:', JSON.stringify(aiResult))
    
    // GPT-5 returns output nested in a specific structure
    let content = ''
    if (aiResult.output && Array.isArray(aiResult.output)) {
      const messageOutput = aiResult.output.find(o => o.type === 'message')
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find(c => c.type === 'output_text')
        if (textContent) {
          content = textContent.text
        }
      }
    }
    
    console.log('Content to parse:', content)
    
    // Parse the JSON response
    let moodAnalysis
    try {
      if (!content) {
        throw new Error('No content returned from OpenAI')
      }
      moodAnalysis = JSON.parse(content)
      console.log('Parsed analysis:', moodAnalysis)
    } catch (e) {
      console.error('Failed to parse AI response:', e)
      console.error('Raw content was:', content)
      // Fallback if JSON parsing fails
      moodAnalysis = {
        mood: "Party Mode",
        energy_level: 0.5,
        description: content || "Analysis failed"
      }
    }

    // Update party record if partyId is provided
    if (partyId) {
      // Update party mood
      const { error: updateError } = await supabase
        .from('parties')
        .update({
          mood: moodAnalysis.mood,
          energy_level: moodAnalysis.energy_level,
          crowd_size: moodAnalysis.crowd_size,
          dominant_colors: {
            primary: moodAnalysis.dominant_colors?.[0],
            secondary: moodAnalysis.dominant_colors?.[1],
            accent: moodAnalysis.dominant_colors?.[2]
          }
        })
        .eq('id', partyId)

      if (updateError) throw updateError

      // Add to mood history
      const { error: historyError } = await supabase
        .from('mood_history')
        .insert({
          party_id: partyId,
          mood: moodAnalysis.mood,
          energy_level: moodAnalysis.energy_level,
          frame_data: moodAnalysis
        })

      if (historyError) throw historyError

      // Add music recommendation to queue
      if (moodAnalysis.music_genre && moodAnalysis.recommended_bpm) {
        const { error: queueError } = await supabase
          .from('music_queue')
          .insert({
            party_id: partyId,
            genre: moodAnalysis.music_genre,
            bpm: moodAnalysis.recommended_bpm,
            energy_match: moodAnalysis.energy_level
          })

        if (queueError) throw queueError
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: moodAnalysis
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-party-mood function:', error)
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

// Helper function to decode base64 image data
function decode(base64: string): Uint8Array {
  const binString = atob(base64)
  const size = binString.length
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i)
  }
  return bytes
}