DROP POLICY "event workflow visibility gate" ON public.app_items;
CREATE POLICY "event workflow visibility gate" ON public.app_items AS RESTRICTIVE FOR ALL
USING (event_workflow_enabled() OR NOT (collection = 'events' OR (collection = ANY (ARRAY['recs','zeros']) AND COALESCE(data->>'evId','') <> '')))
WITH CHECK (event_workflow_enabled() OR NOT (collection = 'events' OR (collection = ANY (ARRAY['recs','zeros']) AND COALESCE(data->>'evId','') <> '')));