# Supabase Remote Setup Instructions

## 1. Get Your Supabase Credentials

1. Go to [app.supabase.com](https://app.supabase.com)
2. Open your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy these values:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJS...` (the long string)

## 2. Update Your iOS App

Open `/ai-dj/ai-dj-party/ai-dj/supabase/Supabase.swift` and replace:
```swift
private let SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"
private let SUPABASE_ANON_KEY = "YOUR_ANON_KEY"
```

With your actual values from step 1.

## 3. Create Database Tables

Go to your Supabase Dashboard → **SQL Editor** and run this SQL:

```sql
-- Create parties table for tracking party sessions and moods
CREATE TABLE IF NOT EXISTS parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mood TEXT NOT NULL,
    energy_level DECIMAL(3,2) CHECK (energy_level >= 0 AND energy_level <= 1),
    crowd_size INTEGER,
    dominant_colors JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id UUID,
    is_active BOOLEAN DEFAULT true
);

-- Create mood_history table for tracking mood changes over time
CREATE TABLE IF NOT EXISTS mood_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    mood TEXT NOT NULL,
    energy_level DECIMAL(3,2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    frame_data JSONB
);

-- Create music_queue table for DJ recommendations
CREATE TABLE IF NOT EXISTS music_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    song_title TEXT,
    artist TEXT,
    genre TEXT,
    bpm INTEGER,
    energy_match DECIMAL(3,2),
    played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_parties_session_id ON parties(session_id);
CREATE INDEX idx_parties_created_at ON parties(created_at DESC);
CREATE INDEX idx_mood_history_party_id ON mood_history(party_id);
CREATE INDEX idx_mood_history_timestamp ON mood_history(timestamp DESC);
CREATE INDEX idx_music_queue_party_id ON music_queue(party_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for development)
CREATE POLICY "Allow anonymous read access to parties" ON parties
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to parties" ON parties
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to parties" ON parties
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access to mood_history" ON mood_history
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to mood_history" ON mood_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to music_queue" ON music_queue
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to music_queue" ON music_queue
    FOR INSERT WITH CHECK (true);
```

## 4. Test Your Connection

In your iOS app's `ContentView.swift`, uncomment the Supabase test code:

```swift
// Find this in toggleParty() function and uncomment:
Task {
    await fetchPartyData()
}

// And uncomment the fetchPartyData function:
private func fetchPartyData() async {
    do {
        let parties = try await SupabaseManager.shared.fetchPartyMood()
        print("Fetched \(parties.count) party records")
    } catch {
        print("Error fetching party data: \(error)")
    }
}
```

## 5. Verify Setup

1. Build and run your app
2. Tap "Start Party"
3. Check Xcode console for "Fetched X party records" message
4. Check Supabase Dashboard → **Table Editor** → **parties** to see if records are being created

## Troubleshooting

- **"Invalid API key"**: Double-check your anon key in Supabase.swift
- **"Connection refused"**: Verify your project URL is correct
- **"Table not found"**: Make sure you ran the SQL to create tables
- **Build errors**: Ensure you added the Supabase Swift package in Xcode

## Next Steps

Once connected, the app will:
1. Create a party session when you tap "Start Party"
2. Capture frames every 5 seconds
3. Store mood analysis in the database
4. Track energy levels and mood history

You can now integrate AI analysis to process the captured frames and update the party mood!