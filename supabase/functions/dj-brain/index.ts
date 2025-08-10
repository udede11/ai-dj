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
    const { 
      images, 
      partyId, 
      currentTrack,
      queue,
      playHistory 
    } = await req.json()

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    const beatovenKey = Deno.env.get('BEATOVEN_API_KEY')
    
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }
    
    if (!beatovenKey) {
      console.error('WARNING: BEATOVEN_API_KEY not configured - music generation will fail')
      console.error('Set it in Supabase Dashboard → Edge Functions → Settings')
    }

    console.log(`DJ Brain analyzing: ${images.length} images, queue: ${queue?.length || 0} tracks`)
    
    // Quick start mode for first track (single image)
    const isQuickStart = images.length === 1 && !currentTrack && (!queue || queue.length === 0)
    
    // Prepare the DJ prompt with professional mixing knowledge
    const djPrompt = isQuickStart ? 
    `You are an AI DJ starting a party. This is the FIRST track - analyze this single image and quickly decide on an opening track to get the party started.

Look at the scene and choose a safe, universally appealing opening that works for most situations:
- If it looks relaxed/casual: start with lo-fi chillhop or soft house
- If it looks energetic: start with upbeat pop or light electronic
- If unclear: default to warm, medium-tempo electronic

IMPORTANT - Beatoven prompt format:
- Always include duration: "60 seconds"
- Describe genre, mood, and instruments
- Can include BPM if needed
- Keep it simple and clear
- Example: "60 seconds upbeat house music with driving bass and synths, 125 bpm"

Return JSON with:
{
  "analysis": {
    "mood": "opening party mood",
    "energy": 0.3-0.5,
    "trend": "building",
    "crowdSize": estimated,
    "engagement": "warming_up",
    "socialDynamics": "initial_gathering",
    "empathyNotes": "Setting the initial vibe"
  },
  "djDecision": {
    "action": "quick_start",
    "reasoning": "Opening track to establish baseline",
    "timing": "immediate",
    "confidence": 0.8
  },
  "queueUpdates": [
    {
      "position": 1,
      "prompt": "60 seconds warm electronic track with soft synths and gentle drums, medium tempo, welcoming mood for party opening",
      "genre": "electronic",
      "instrument": "synths",
      "bpm": 110,
      "energy": 0.4,
      "purpose": "opening_track"
    }
  ],
  "djNotes": "Quick start mode - getting music playing ASAP"
}` :
    `You are an elite AI DJ with deep understanding of crowd psychology, music theory, and mixing techniques.

CURRENT SITUATION:
${currentTrack ? `
- Now Playing: ${currentTrack.genre} at ${currentTrack.bpm} BPM (${currentTrack.playDuration}s elapsed)
- Track Energy: ${currentTrack.energy}
- Queue: ${queue?.map(t => `${t.genre} ${t.bpm}BPM`).join(', ') || 'Empty'}
- Recent History: ${playHistory?.slice(-3).map(t => t.genre).join(' → ') || 'None'}
` : 'No music playing yet - this is the opening set!'}

Analyze these ${images.length} party images (30-second timespan) and make professional DJ decisions:

1. CROWD ANALYSIS with empathy:
   - Read body language, facial expressions, engagement levels
   - Identify energy trend (building, peaking, cooling, stable)
   - Spot individuals who might need energy boost or are leading the vibe
   - Understand the social dynamics (groups talking, dancing, mingling)
   - Predict what the crowd needs next (not just what they have now)

2. PROFESSIONAL MIXING DECISION:
   ${currentTrack ? `
   Should we:
   a) KEEP current track (if crowd is vibing with it)
   b) SMOOTH TRANSITION to queued track (natural progression)
   c) EMERGENCY SWITCH (crowd losing energy - need immediate change)
   d) BUILD ENERGY (add to queue for gradual buildup)
   e) SURPRISE DROP (unexpected banger to re-energize)
   ` : 'Choose the perfect opening track to set the mood'}

3. TRANSITION PLANNING like a pro DJ:
   - Consider smooth genre transitions (what flows naturally vs creative contrasts)
   - Tempo progression (gradual speed changes vs dramatic shifts)
   - Energy curve (build tension → release → cool down → build again)
   - Crowd anticipation (when to satisfy vs when to tease)
   - Instrument layering (complementary sounds)

4. QUEUE STRATEGY:
   - If queue is low (<3 tracks), generate 2-3 upcoming tracks
   - Plan 10-15 minutes ahead
   - Consider journey arc (where we're taking the crowd)
   - Balance familiar vibes with surprises

5. EMPATHY FACTORS:
   - Are people looking tired? (might need energy injection or cooling period)
   - New arrivals? (integrate them with accessible beats)
   - Peak moment approaching? (prepare the perfect drop)
   - Conversations happening? (keep music complementary, not overpowering)
   - Someone's birthday/celebration visible? (time for an anthem)

CRITICAL - Create music prompts for Beatoven AI:
- Write natural language prompts describing the track
- Include duration (60 seconds), genre, mood, and energy
- Can mention BPM, instruments, and style
- Example: "60 seconds energetic electronic dance track with synths and drums, 128 bpm"
- Example: "60 seconds peaceful lo-fi chill hop track with piano and soft drums"
- Keep prompts concise but descriptive

Return JSON with:
{
  "analysis": {
    "mood": "string",
    "energy": 0-1,
    "trend": "building|stable|cooling|peaking",
    "crowdSize": number,
    "engagement": "high|medium|low",
    "socialDynamics": "dancing|talking|mixed|waiting",
    "empathyNotes": "what you sense the crowd needs"
  },
  "djDecision": {
    "action": "keep|smooth_transition|emergency_switch|queue_builds|surprise_drop",
    "reasoning": "professional explanation",
    "timing": "immediate|next_track|in_2_tracks",
    "confidence": 0-1
  },
  "transitions": [
    {
      "fromGenre": "current genre",
      "toGenre": "next genre",
      "technique": "smooth_blend|energy_shift|mood_change",
      "tempoShift": "maintain|speed_up|slow_down",
      "energyShift": "maintain|boost|cool|surprise"
    }
  ],
  "queueUpdates": [
    {
      "position": 1,
      "prompt": "60 seconds warm electronic track with soft synths and gentle drums, medium tempo, welcoming mood for party opening",
      "genre": "indian|western|ambient|electronic",
      "instrument": "piano|guitar|sitar|flute|drums|pads|synths|strings",
      "bpm": number,
      "energy": 0-1,
      "purpose": "energy_build|maintain_vibe|cool_down|surprise|climax"
    }
  ],
  "djNotes": "internal monologue about the crowd and strategy"
}`

    // Prepare images for GPT-5
    const imageInputs = images.map(base64 => ({
      type: 'input_image',
      image_url: `data:image/jpeg;base64,${base64}`
    }))

    // Call GPT-5 for DJ analysis
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
            { type: 'input_text', text: djPrompt },
            ...imageInputs
          ]
        }]
      })
    })

    if (!openAiResponse.ok) {
      throw new Error(`OpenAI API error: ${await openAiResponse.text()}`)
    }

    const aiResult = await openAiResponse.json()
    
    // Parse DJ decision
    let djAnalysis = {}
    if (aiResult.output && Array.isArray(aiResult.output)) {
      const messageOutput = aiResult.output.find(o => o.type === 'message')
      if (messageOutput?.content) {
        const textContent = messageOutput.content.find(c => c.type === 'output_text')
        if (textContent?.text) {
          try {
            djAnalysis = JSON.parse(textContent.text)
            console.log('DJ Brain Decision:', djAnalysis)
          } catch (e) {
            console.error('Failed to parse DJ response:', e)
          }
        }
      }
    }

    // Store analysis
    if (partyId && djAnalysis.analysis) {
      await supabase
        .from('parties')
        .update({
          mood: djAnalysis.analysis.mood,
          energy_level: djAnalysis.analysis.energy,
          crowd_size: djAnalysis.analysis.crowdSize
        })
        .eq('id', partyId)

      await supabase
        .from('mood_history')
        .insert({
          party_id: partyId,
          mood: djAnalysis.analysis.mood,
          energy_level: djAnalysis.analysis.energy,
          frame_data: djAnalysis
        })
    }

    // Generate new tracks if needed
    const tracksToGenerate = djAnalysis.queueUpdates || []
    const generatedTracks = []
    let firstTrackUrl = null

    // Generate first track and wait for it if no music is playing
    if (!currentTrack && tracksToGenerate.length > 0) {
      const firstTrack = tracksToGenerate[0]
      const isQuickStartTrack = firstTrack.purpose === 'opening_track'
      console.log(isQuickStartTrack ? 
        `🚀 QUICK START: Generating opening track ASAP` : 
        `Generating FIRST track urgently: ${firstTrack.prompt}`)
      
      try {
        // Ensure we have valid Beatoven values
        const beatovenGenre = ['indian', 'western', 'ambient', 'electronic'].includes(firstTrack.genre?.toLowerCase()) 
          ? firstTrack.genre.toLowerCase() 
          : 'electronic'
        const beatovenInstrument = firstTrack.instrument || 'synths'
        
        console.log(`Generating first track urgently: ${beatovenGenre} with ${beatovenInstrument}`)
        
        const composeResponse = await fetch('https://public-api.beatoven.ai/api/v1/tracks/compose', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${beatovenKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: {
              text: `${firstTrack.prompt || `60 seconds ${beatovenGenre} track with ${beatovenInstrument}, ${firstTrack.bpm || 120} bpm, ${firstTrack.purpose?.replace('_', ' ') || 'party opening'}`}`
            },
            format: 'wav',
            looping: false
          })
        })

        console.log(`Beatoven API response status: ${composeResponse.status}`)
        
        if (!composeResponse.ok) {
          const errorText = await composeResponse.text()
          console.error(`Beatoven API error: ${composeResponse.status} - ${errorText}`)
          throw new Error(`Beatoven API failed: ${composeResponse.status}`)
        }
        
        if (composeResponse.ok) {
          const result = await composeResponse.json()
          console.log('Beatoven API compose response:', JSON.stringify(result))
          
          if (result.task_id) {
            const taskId = result.task_id
            console.log(`Received task_id: ${taskId}`)
            const tempTitle = `${beatovenGenre} - ${firstTrack.purpose?.replace('_', ' ') || 'opening'} (Generating...)`
            
            // Poll for track completion (wait up to 60 seconds)
            let pollCount = 0
            const maxPolls = 20 // 20 * 3 seconds = 60 seconds
            
            while (pollCount < maxPolls) {
              await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
              
              const statusResponse = await fetch(`https://public-api.beatoven.ai/api/v1/tasks/${taskId}`, {
                headers: {
                  'Authorization': `Bearer ${beatovenKey}`,
                }
              })
              
              if (statusResponse.ok) {
                const statusResult = await statusResponse.json()
                console.log(`Poll ${pollCount + 1}: Task ${taskId} status: ${statusResult.status}`)
                
                if (statusResult.status === 'composed' && statusResult.meta?.track_url) {
                  firstTrackUrl = statusResult.meta.track_url
                  const trackTitle = statusResult.meta?.prompt?.text || tempTitle.replace(' (Generating...)', '')
                  
                  // Store track in database
                  if (partyId) {
                    console.log(`Track ready: "${trackTitle}", URL: ${firstTrackUrl}`)
                    await supabase.from('music_queue').insert({
                      party_id: partyId,
                      genre: beatovenGenre,
                      bpm: firstTrack.bpm,
                      energy_match: firstTrack.energy,
                      song_title: trackTitle,
                      artist: 'Beatoven AI',
                      queue_position: 0,
                      task_id: taskId,
                      track_url: firstTrackUrl
                    })
                  }
                  
                  generatedTracks.push({
                    taskId: taskId,
                    position: 0,
                    purpose: firstTrack.purpose,
                    ready: true
                  })
                  
                  break // Exit polling loop
                }
              }
              
              pollCount++
            }
            
            // If we didn't get a URL after polling, store with task_id for later polling
            if (!firstTrackUrl && partyId) {
              await supabase.from('music_queue').insert({
                party_id: partyId,
                genre: beatovenGenre,
                bpm: firstTrack.bpm,
                energy_match: firstTrack.energy,
                song_title: tempTitle,
                artist: 'Beatoven AI',
                queue_position: 0,
                task_id: taskId,
                track_url: null
              })
              
              generatedTracks.push({
                taskId: taskId,
                position: 0,
                purpose: firstTrack.purpose
              })
            }
          }
          
          // Mark first track as handled
          tracksToGenerate.shift()
        }
      } catch (e) {
        console.error('Failed to generate first track:', e)
        console.error('Stack trace:', e.stack)
      }
    }

    // Generate remaining tracks in background (don't wait)
    for (const trackRequest of tracksToGenerate) {
      // Ensure we have valid Beatoven values
      const beatovenGenre = ['indian', 'western', 'ambient', 'electronic'].includes(trackRequest.genre?.toLowerCase()) 
        ? trackRequest.genre.toLowerCase() 
        : 'electronic'
      const beatovenInstrument = trackRequest.instrument || 'synths'
      
      console.log(`Queueing track generation: ${beatovenGenre} with ${beatovenInstrument}`)
      
      try {
        const composeResponse = await fetch('https://public-api.beatoven.ai/api/v1/tracks/compose', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${beatovenKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: {
              text: `${trackRequest.prompt || `60 seconds ${beatovenGenre} track with ${beatovenInstrument}, ${trackRequest.bpm || 120} bpm, ${trackRequest.purpose?.replace('_', ' ')}`}`
            },
            format: 'wav',
            looping: false
          })
        })

        if (!composeResponse.ok) {
          const errorText = await composeResponse.text()
          console.error(`Beatoven API error for background track: ${composeResponse.status} - ${errorText}`)
          continue  // Skip this track and try the next one
        }
        
        if (composeResponse.ok) {
          const result = await composeResponse.json()
          console.log('Beatoven background generation response:', JSON.stringify(result))
          
          if (result.task_id && partyId) {
            console.log(`Background track task_id: ${result.task_id}`)
            const tempTitle = `${beatovenGenre} - ${trackRequest.purpose?.replace('_', ' ') || 'track'} (Generating...)`
            await supabase.from('music_queue').insert({
              party_id: partyId,
              genre: beatovenGenre,
              bpm: trackRequest.bpm,
              energy_match: trackRequest.energy,
              song_title: tempTitle,
              artist: 'Beatoven AI',
              queue_position: trackRequest.position,
              task_id: result.task_id,
              track_url: null  // Will be filled by polling
            })
            
            generatedTracks.push({
              taskId: result.task_id,
              position: trackRequest.position,
              purpose: trackRequest.purpose
            })
          }
        }
      } catch (e) {
        console.error('Failed to generate track:', e)
        console.error('Stack trace:', e.stack)
      }
    }

    // Get current queue status from database
    let currentQueue = []
    if (partyId) {
      const { data: queueData } = await supabase
        .from('music_queue')
        .select('*')
        .eq('party_id', partyId)
        .is('played_at', null)
        .order('queue_position', { ascending: true })
        .limit(5)
      
      currentQueue = queueData || []
    }

    return new Response(
      JSON.stringify({
        success: true,
        djAnalysis,
        generatedTracks,
        currentQueue,
        firstTrackUrl,  // Include first track URL for immediate playback
        action: djAnalysis.djDecision?.action,
        timing: djAnalysis.djDecision?.timing,
        djNotes: djAnalysis.djNotes
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('DJ Brain error:', error)
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