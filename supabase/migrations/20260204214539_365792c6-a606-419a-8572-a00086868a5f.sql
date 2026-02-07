-- Create temporary storage bucket for try-on images
INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-temp', 'tryon-temp', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (OpenRouter needs to fetch images)
CREATE POLICY "Public read access for tryon-temp"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-temp');

-- Allow edge functions to upload (service role)
CREATE POLICY "Service role upload for tryon-temp"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tryon-temp');

-- Allow edge functions to delete (cleanup)
CREATE POLICY "Service role delete for tryon-temp"
ON storage.objects FOR DELETE
USING (bucket_id = 'tryon-temp');