
ALTER TABLE public.code_submissions ADD COLUMN grade text;
ALTER TABLE public.code_submissions ADD COLUMN feedback text;

CREATE POLICY "Teachers can update submissions"
ON public.code_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'))
WITH CHECK (public.has_role(auth.uid(), 'teacher'));
