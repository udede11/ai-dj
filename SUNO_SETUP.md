# Suno AI Integration Setup

## Overview
This AI DJ app now uses Suno AI for music generation instead of Beatoven. Suno provides much higher quality music generation with better genre support and faster generation times.

## Environment Variables

### For Supabase Edge Functions

Add these environment variables in your Supabase Dashboard → **Edge Functions** → **Settings**:

1. **OPENAI_API_KEY**: Your OpenAI API key for DJ Brain analysis
2. **SUNO_API_URL**: Your Suno API deployment URL
   - Default: `https://suno-api-2.onrender.com`
   - Or your own deployment if you've deployed the Suno API yourself

### Setting Environment Variables in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Click **Add new secret**
4. Add each environment variable:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Click **Save**
5. Repeat for `SUNO_API_URL`

## Key Differences from Beatoven

### Advantages of Suno:
- **Better Quality**: Much more realistic and professional sounding music
- **2 Tracks per Request**: Each API call generates 2 variations (uses 10 credits)
- **Flexible Prompts**: Can specify BPM, vocals, specific instruments
- **Faster Generation**: With `wait_audio: true`, tracks are ready in ~30-60 seconds
- **Direct URLs**: Returns actual audio URLs, no complex polling needed

### API Changes:
- Endpoint: `/api/generate` instead of Beatoven's compose endpoint
- Response format: Returns array of track objects with direct audio URLs
- No authorization header needed (using your deployed instance)
- Supports both synchronous (`wait_audio: true`) and background generation

## Suno API Usage

### Generate Music (Synchronous)
```javascript
const response = await fetch(`${sunoApiUrl}/api/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: "128 bpm progressive house with euphoric synths",
    make_instrumental: false,
    model: 'chirp-v3-5',
    wait_audio: true  // Wait for completion
  })
})

// Returns array with 2 tracks
const tracks = await response.json()
// tracks[0].audio_url - Direct URL to first track
// tracks[0].title - Generated title
```

### Check Track Status (Background Mode)
```javascript
const response = await fetch(`${sunoApiUrl}/api/get?ids=${trackId}`)
const tracks = await response.json()
if (tracks[0].status === 'complete') {
  // Track is ready
  const audioUrl = tracks[0].audio_url
}
```

## Prompt Guidelines for Suno

### Good Prompts:
- "128 bpm deep house with rolling bassline and atmospheric pads"
- "Chill lo-fi hip hop beat, 85 bpm, jazzy piano samples, vinyl crackle"
- "Epic orchestral score with building tension, cinematic drums"
- "Uplifting future bass, 140 bpm, female vocal chops, heavy drops"

### Include in Prompts:
- Genre and sub-genre
- BPM (if specific tempo needed)
- Key instruments or sounds
- Mood and energy level
- Vocal style (if any)

## Testing the Integration

1. Deploy your edge functions:
```bash
supabase functions deploy dj-brain
supabase functions deploy poll-track-status
```

2. Test Suno API directly:
```bash
curl https://suno-api-2.onrender.com/api/get_limit
```

3. Start the app and watch the logs for Suno API calls

## Troubleshooting

- **No audio generated**: Check Suno API credits at `/api/get_limit`
- **Slow generation**: Normal for first request, Suno needs to warm up
- **Failed tracks**: Check the Suno API logs in your Vercel dashboard
- **Wrong genre**: Be more specific in prompts with sub-genres

## Credits Management

Suno uses a credit system:
- Each generation uses 10 credits (generates 2 tracks)
- Check remaining credits: `GET /api/get_limit`
- Free tier typically includes 50 credits/day

## Migration from Beatoven

The app has been updated to:
1. Use Suno API endpoints instead of Beatoven
2. Handle Suno's response format (array of tracks)
3. Store both generated tracks when available
4. Use more descriptive prompts with BPM and specific styles