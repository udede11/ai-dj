import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { images, partyId, musicContext } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get OpenAI API key
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Get Beatoven API key
    const beatovenKey = Deno.env.get('BEATOVEN_API_KEY')
    if (!beatovenKey) {
      throw new Error('Beatoven API key not configured')
    }

    console.log(`Analyzing batch of ${images.length} images`)
    console.log('Current music context:', musicContext)

    // Prepare prompt for batch analysis
    const analysisPrompt = `Analyze these ${images.length} party scene images captured over 30 seconds and provide:

1. Overall party analysis:
   - mood: current party mood
   - energy_level: 0-1 (average across all images)
   - trend: "increasing", "stable", or "decreasing" energy
   - crowd_size: estimated average
   - description: brief summary of the party state

2. Music decision based on the scene analysis:
   ${musicContext.currentGenre ? `
   Current music: ${musicContext.currentGenre} playing for ${musicContext.playDuration} seconds
   
   Decide whether to:
   - Keep the current music (if it still fits the vibe)
   - Change to something new (if the energy has shifted)
   
   Consider:
   - Has the energy changed significantly?
   - Has the crowd size changed?
   - Is ${musicContext.playDuration}s too long for the same track?
   - Does the current genre still match the mood?
   ` : `
   No music currently playing. Recommend initial music.
   `}

Return JSON with:
{
  "mood": "string",
  "energy_level": number,
  "trend": "string",
  "crowd_size": number,
  "description": "string",
  "shouldChangeMusic": boolean,
  "reason": "string explaining decision",
  "musicPrompt": "string (only if shouldChangeMusic is true)",
  "recommendedGenre": "string",
  "recommendedBpm": number
}`

    // Prepare images for GPT-5
    const imageInputs = images.map(base64 => ({
      type: 'input_image',
      image_url: `data:image/jpeg;base64,${base64}`
    }))

    // Call GPT-5 with all images
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
              text: analysisPrompt
            },
            ...imageInputs
          ]
        }]
      })
    })

    if (!openAiResponse.ok) {
      const error = await openAiResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const aiResult = await openAiResponse.json()
    console.log('AI Response:', JSON.stringify(aiResult))

    // Parse GPT-5 response
    let analysis = {}
    if (aiResult.output && Array.isArray(aiResult.output)) {
      const messageOutput = aiResult.output.find(o => o.type === 'message')
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find(c => c.type === 'output_text')
        if (textContent && textContent.text) {
          try {
            analysis = JSON.parse(textContent.text)
            console.log('Parsed analysis:', analysis)
          } catch (e) {
            console.error('Failed to parse AI response:', e)
            analysis = {
              mood: "Party Mode",
              energy_level: 0.5,
              shouldChangeMusic: !musicContext.currentGenre,
              reason: "Analysis in progress"
            }
          }
        }
      }
    }

    // Store analysis in database
    if (partyId) {
      const { error: updateError } = await supabase
        .from('parties')
        .update({
          mood: analysis.mood,
          energy_level: analysis.energy_level,
          crowd_size: analysis.crowd_size
        })
        .eq('id', partyId)

      if (updateError) console.error('Failed to update party:', updateError)

      // Add to mood history
      const { error: historyError } = await supabase
        .from('mood_history')
        .insert({
          party_id: partyId,
          mood: analysis.mood,
          energy_level: analysis.energy_level,
          frame_data: analysis
        })

      if (historyError) console.error('Failed to add history:', historyError)
    }

    // Handle music generation if needed
    let newTrackUrl = null
    if (analysis.shouldChangeMusic && analysis.musicPrompt) {
      console.log('Generating new music with prompt:', analysis.musicPrompt)
      
      // Call Beatoven API
      const composeResponse = await fetch('https://public-api.beatoven.ai/api/v1/tracks/compose', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${beatovenKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            text: analysis.musicPrompt
          },
          format: 'mp3',
          looping: true
        })
      })

      if (composeResponse.ok) {
        const composeResult = await composeResponse.json()
        const taskId = composeResult.task_id
        
        // Poll for completion (simplified - in production would be async)
        let attempts = 0
        while (attempts < 15 && !newTrackUrl) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const statusResponse = await fetch(`https://public-api.beatoven.ai/api/v1/tasks/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${beatovenKey}`,
            }
          })

          if (statusResponse.ok) {
            const statusResult = await statusResponse.json()
            if (statusResult.status === 'composed' && statusResult.meta?.track_url) {
              newTrackUrl = statusResult.meta.track_url
              
              // Store in music queue
              if (partyId) {
                await supabase
                  .from('music_queue')
                  .insert({
                    party_id: partyId,
                    genre: analysis.recommendedGenre,
                    bpm: analysis.recommendedBpm,
                    energy_match: analysis.energy_level,
                    song_title: `AI DJ - ${analysis.mood}`,
                    artist: 'AI DJ'
                  })
              }
              break
            }
          }
          attempts++
        }

        // If still processing, return taskId for client polling
        if (!newTrackUrl && taskId) {
          analysis.musicStatus = 'processing'
          analysis.taskId = taskId
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...analysis,
        newTrackUrl: newTrackUrl,
        genre: analysis.recommendedGenre
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-batch-decide:', error)
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