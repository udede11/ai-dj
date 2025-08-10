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
    const { partyId, prompt, analyses } = await req.json()
    
    console.log('Received request with prompt:', prompt)
    console.log('Analyses count:', analyses?.length || 0)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Beatoven API key from secrets
    const beatovenKey = Deno.env.get('BEATOVEN_API_KEY')
    if (!beatovenKey) {
      throw new Error('Beatoven API key not configured')
    }

    // Use provided prompt or create one from analyses
    let musicPrompt = prompt
    console.log('Initial musicPrompt:', musicPrompt)
    let avgEnergy = 0.5
    let avgBpm = 120
    let topGenre = 'electronic'
    
    if (!musicPrompt && analyses && analyses.length > 0) {
      // Aggregate mood analyses to create a music prompt
      let dominantMood = ''
      let genres = []
      let descriptions = []

      // Calculate averages and collect data
      analyses.forEach(analysis => {
        avgEnergy += analysis.energy_level || 0.5
        avgBpm += analysis.recommended_bpm || 120
        if (analysis.music_genre) genres.push(analysis.music_genre)
        if (analysis.mood) descriptions.push(analysis.mood)
        if (analysis.description) descriptions.push(analysis.description)
      })

      avgEnergy = avgEnergy / analyses.length
      avgBpm = Math.round(avgBpm / analyses.length)
      
      // Determine dominant mood based on energy
      if (avgEnergy < 0.3) {
        dominantMood = 'chill relaxed'
      } else if (avgEnergy < 0.5) {
        dominantMood = 'laid-back groovy'
      } else if (avgEnergy < 0.7) {
        dominantMood = 'upbeat energetic'
      } else {
        dominantMood = 'high-energy pumping'
      }

      // Get most common genre
      if (genres.length > 0) {
        const genreCount = genres.reduce((acc, genre) => {
          acc[genre] = (acc[genre] || 0) + 1
          return acc
        }, {})
        topGenre = Object.keys(genreCount).reduce((a, b) => 
          genreCount[a] > genreCount[b] ? a : b, 'electronic'
        )
      }
      
      musicPrompt = `30 seconds ${dominantMood} ${topGenre} track at ${avgBpm} BPM for a party atmosphere`
    } else if (!musicPrompt) {
      // Fallback prompt
      musicPrompt = '30 seconds upbeat electronic party track at 120 BPM'
    }
    
    console.log('Generating music with prompt:', musicPrompt)

    // Call Beatoven API to compose track
    const composeResponse = await fetch('https://public-api.beatoven.ai/api/v1/tracks/compose', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${beatovenKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          text: musicPrompt
        },
        format: 'mp3',
        looping: true // Enable looping for continuous party music
      })
    })

    if (!composeResponse.ok) {
      const error = await composeResponse.text()
      throw new Error(`Beatoven API error: ${error}`)
    }

    const composeResult = await composeResponse.json()
    const taskId = composeResult.task_id

    // Store the task ID in the database for tracking
    if (partyId) {
      const { error: insertError } = await supabase
        .from('music_queue')
        .insert({
          party_id: partyId,
          genre: topGenre,
          bpm: avgBpm,
          energy_match: avgEnergy,
          song_title: `AI Generated - ${musicPrompt.split(' ').slice(2, 5).join(' ')}`,
          artist: 'AI DJ'
        })

      if (insertError) console.error('Failed to store music queue:', insertError)
    }

    // Start polling for completion
    let trackUrl = null
    let attempts = 0
    const maxAttempts = 30 // Poll for up to 30 seconds

    while (!trackUrl && attempts < maxAttempts) {
      // Wait 1 second between polls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check status
      const statusResponse = await fetch(`https://public-api.beatoven.ai/api/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${beatovenKey}`,
        }
      })

      if (statusResponse.ok) {
        const statusResult = await statusResponse.json()
        
        if (statusResult.status === 'composed' && statusResult.meta?.track_url) {
          trackUrl = statusResult.meta.track_url
          
          // Update the music queue with the track URL
          if (partyId) {
            const { error: updateError } = await supabase
              .from('music_queue')
              .update({
                song_title: `AI Generated - ${topGenre} (Ready)`,
                played_at: new Date().toISOString()
              })
              .eq('party_id', partyId)
              .order('created_at', { ascending: false })
              .limit(1)

            if (updateError) console.error('Failed to update music queue:', updateError)
          }
          
          break
        } else if (statusResult.status === 'failed') {
          throw new Error('Music generation failed')
        }
      }
      
      attempts++
    }

    if (!trackUrl && attempts >= maxAttempts) {
      // Return task ID for client to poll
      return new Response(
        JSON.stringify({
          success: true,
          status: 'processing',
          taskId: taskId,
          prompt: musicPrompt,
          message: 'Track is being generated, poll with task ID'
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        trackUrl: trackUrl,
        prompt: musicPrompt,
        energy: avgEnergy,
        bpm: avgBpm
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in generate-party-music function:', error)
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