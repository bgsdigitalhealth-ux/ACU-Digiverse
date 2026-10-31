CREATE POLICY "cer files college only read" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));
CREATE POLICY "cer files college only insert" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));
CREATE POLICY "cer files college only update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));
CREATE POLICY "cer files college only delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));