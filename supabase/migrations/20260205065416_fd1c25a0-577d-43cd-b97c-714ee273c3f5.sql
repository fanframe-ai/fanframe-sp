-- Create tryon-assets bucket for permanent static assets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('tryon-assets', 'tryon-assets', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to tryon-assets
CREATE POLICY "Public read access for tryon assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-assets');