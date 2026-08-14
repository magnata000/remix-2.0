CREATE POLICY "Task attachments read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');
CREATE POLICY "Task attachments insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "Task attachments update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task-attachments') WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "Task attachments delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');