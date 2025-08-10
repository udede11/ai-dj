-- Add status column to music_queue for tracking generation progress
ALTER TABLE music_queue 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Status values:
-- 'pending' - Track requested but not started
-- 'composing' - In Beatoven queue
-- 'running' - Actively being generated
-- 'composed' - Ready to play
-- 'failed' - Generation failed

-- Update any existing records
UPDATE music_queue 
SET status = CASE 
    WHEN track_url IS NOT NULL THEN 'composed'
    WHEN task_id IS NOT NULL THEN 'composing'
    ELSE 'pending'
END;