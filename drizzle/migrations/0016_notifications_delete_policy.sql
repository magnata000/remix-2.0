GRANT DELETE ON public.notifications TO authenticated;
CREATE POLICY "Recipient delete" ON public.notifications FOR DELETE TO authenticated
USING ((recipient_user_id = auth.uid()) OR ((recipient_user_id IS NULL) AND public.has_role(auth.uid(), 'admin'::app_role)));