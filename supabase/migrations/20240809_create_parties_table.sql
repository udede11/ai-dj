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