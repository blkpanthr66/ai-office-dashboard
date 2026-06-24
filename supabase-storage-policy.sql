-- Allow uploads to the assets bucket (blog-covers folder)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → your project → SQL Editor

CREATE POLICY "Allow public uploads to blog-covers"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'blog-covers');

-- Also allow public reads (in case not already set)
CREATE POLICY "Allow public reads from assets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'assets');
