-- Add queue management columns to music_queue table
ALTER TABLE music_queue 
ADD COLUMN IF NOT EXISTS queue_position INTEGER,
ADD COLUMN IF NOT EXISTS transition_type TEXT,
ADD COLUMN IF NOT EXISTS task_id TEXT,
ADD COLUMN IF NOT EXISTS track_url TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT false;

-- Create index for queue ordering
CREATE INDEX IF NOT EXISTS idx_music_queue_position 
ON music_queue(party_id, queue_position) 
WHERE played_at IS NULL;

-- Create index for task polling
CREATE INDEX IF NOT EXISTS idx_music_queue_task 
ON music_queue(task_id) 
WHERE task_id IS NOT NULL;