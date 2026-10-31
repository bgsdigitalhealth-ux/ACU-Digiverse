DROP TRIGGER IF EXISTS cer_guard_trg ON public.app_items;
DROP FUNCTION IF EXISTS public.cer_guard();
DROP POLICY IF EXISTS "cer files college only read" ON storage.objects;
DROP POLICY IF EXISTS "cer files college only insert" ON storage.objects;
DROP POLICY IF EXISTS "cer files college only update" ON storage.objects;
DROP POLICY IF EXISTS "cer files college only delete" ON storage.objects;