-- Create storage bucket for party images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'party-frames',
    'party-frames',
    false,
    5242880, -- 5MB limit per image
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage
CREATE POLICY "Allow anonymous uploads to party-frames" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'party-frames');

CREATE POLICY "Allow anonymous reads from party-frames" ON storage.objects
    FOR SELECT USING (bucket_id = 'party-frames');

CREATE POLICY "Allow anonymous deletes from party-frames" ON storage.objects
    FOR DELETE USING (bucket_id = 'party-frames');