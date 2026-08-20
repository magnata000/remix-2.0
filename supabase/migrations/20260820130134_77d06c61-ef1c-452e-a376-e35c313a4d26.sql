BEGIN;

DROP POLICY IF EXISTS "Client documents access" ON storage.objects;

CREATE POLICY "Client documents access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = (storage.foldername(name))[1]::uuid
        AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = (storage.foldername(name))[1]::uuid
        AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

COMMIT;