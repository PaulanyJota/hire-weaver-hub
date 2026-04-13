-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', true);

-- Allow anyone to read CVs
CREATE POLICY "CVs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'cvs');

-- Allow anyone to upload CVs (no auth in this app)
CREATE POLICY "Anyone can upload CVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cvs');

-- Allow anyone to update CVs
CREATE POLICY "Anyone can update CVs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cvs');

-- Allow anyone to delete CVs
CREATE POLICY "Anyone can delete CVs"
ON storage.objects FOR DELETE
USING (bucket_id = 'cvs');