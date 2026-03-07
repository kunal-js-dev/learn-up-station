-- Create storage bucket for student submission images
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-images', 'submission-images', false)
ON CONFLICT (id) DO NOTHING;

-- Allow students to upload their own images
CREATE POLICY "Students can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'submission-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow students to read their own images
CREATE POLICY "Students can read own images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'submission-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow teachers to read all submission images
CREATE POLICY "Teachers can read all submission images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'submission-images' AND public.has_role(auth.uid(), 'teacher'));

-- Add image_url column to code_submissions
ALTER TABLE public.code_submissions ADD COLUMN IF NOT EXISTS image_url text;