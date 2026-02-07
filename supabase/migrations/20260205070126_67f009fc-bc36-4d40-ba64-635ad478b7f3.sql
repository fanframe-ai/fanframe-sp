-- Allow uploads to tryon-assets bucket (for admin setup)
CREATE POLICY "Allow uploads to tryon-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tryon-assets');

-- Allow updates (for upsert)
CREATE POLICY "Allow updates to tryon-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tryon-assets');