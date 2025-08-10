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
    const { partyId } = await req.json()
    
    if (!partyId) {
      throw new Error('Party ID is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Beatoven API key
    const beatovenKey = Deno.env.get('BEATOVEN_API_KEY')
    
    if (!beatovenKey) {
      console.error('WARNING: BEATOVEN_API_KEY not configured - cannot check track status')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'BEATOVEN_API_KEY not configured in Supabase environment variables',
          updatedTracks: 0,
          pendingCount: pendingTracks?.length || 0,
          currentQueue: []
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    console.log(`Polling track status for party: ${partyId}`)

    // Get all pending tracks (have task_id but no track_url, and not played)
    const { data: pendingTracks, error: fetchError } = await supabase
      .from('music_queue')
      .select('*')
      .eq('party_id', partyId)
      .not('task_id', 'is', null)
      .or('track_url.is.null,track_url.eq.')
      .is('played_at', null)  // Only check unplayed tracks
      .order('queue_position', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch pending tracks: ${fetchError.message}`)
    }

    console.log(`Found ${pendingTracks?.length || 0} pending tracks`)

    const updatedTracks = []
    
    // Check status of each pending track
    for (const track of pendingTracks || []) {
      if (!track.task_id) continue
      
      console.log(`Checking status for task: ${track.task_id}`)
      
      try {
        // For Beatoven, use the tasks endpoint
        const statusResponse = await fetch(`https://public-api.beatoven.ai/api/v1/tasks/${track.task_id}`, {
          headers: {
            'Authorization': `Bearer ${beatovenKey}`,
            'Content-Type': 'application/json',
          }
        })

        console.log(`Status check response code: ${statusResponse.status} for task: ${track.task_id}`)
        
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text()
          console.error(`Beatoven status check failed: ${statusResponse.status} - ${errorText}`)
          continue
        }
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json()
          console.log(`Task ${track.task_id} full response:`, JSON.stringify(statusResult))
          console.log(`Task ${track.task_id} status: ${statusResult.status}`)
          
          // Check if track is complete (status is 'composed')
          if (statusResult.status === 'composed' && statusResult.meta?.track_url) {
            // Extract the actual track title from the prompt
            const trackTitle = statusResult.meta?.prompt?.text || 
                             track.song_title?.replace(' (Generating...)', '') || 
                             'AI DJ Mix'
            
            // Update the database with the track URL and proper title
            const { error: updateError } = await supabase
              .from('music_queue')
              .update({
                track_url: statusResult.meta.track_url,
                song_title: trackTitle
              })
              .eq('id', track.id)

            if (updateError) {
              console.error(`Failed to update track ${track.id}:`, updateError)
            } else {
              console.log(`Updated track ${track.id} with URL: ${statusResult.meta.track_url}`)
              updatedTracks.push({
                ...track,
                track_url: statusResult.meta.track_url,
                song_title: trackTitle
              })
            }
          } else if (statusResult.status === 'failed' || statusResult.status === 'error') {
            console.error(`Task ${track.task_id} failed with status: ${statusResult.status}`)
            // Mark as failed in database
            await supabase
              .from('music_queue')
              .update({
                song_title: track.song_title + ' (Failed)'
              })
              .eq('id', track.id)
          }
        }
      } catch (e) {
        console.error(`Error checking task ${track.task_id}:`, e)
      }
    }

    // Get updated queue (only unplayed tracks)
    const { data: currentQueue } = await supabase
      .from('music_queue')
      .select('*')
      .eq('party_id', partyId)
      .is('played_at', null)  // Only fetch unplayed tracks
      .order('queue_position', { ascending: true })
      .limit(10)

    return new Response(
      JSON.stringify({
        success: true,
        updatedTracks: updatedTracks.length,
        pendingCount: (pendingTracks?.length || 0) - updatedTracks.length,
        currentQueue: currentQueue || []
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in poll-track-status:', error)
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