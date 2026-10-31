CREATE OR REPLACE FUNCTION public.list_public_event_photos()
 RETURNS TABLE(id text, title text, department text, college text, event_date text, venue text, event_type text, photo_ids text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT e.id, COALESCE(e.data->>'title','Untitled event'),
  COALESCE(d.data->>'name',''), COALESCE(c.data->>'name',''),
  COALESCE(e.data->>'date',''), COALESCE(e.data->>'venue',''), COALESCE(e.data->>'type',''),
  ARRAY(SELECT f->>'id' FROM jsonb_each(COALESCE(r.data->'files','{}'::jsonb)) g(k,v), jsonb_array_elements(CASE WHEN jsonb_typeof(g.v)='array' THEN g.v ELSE '[]'::jsonb END) f
        WHERE f->>'type' LIKE 'image/%' AND COALESCE(f->>'id','')<>'' LIMIT 4)
 FROM public.app_items e
 JOIN public.app_items r ON r.collection='recs' AND r.id=e.data->>'recId' AND r.dept_id=e.dept_id AND r.college_id=e.college_id
 LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id
 LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id
 WHERE e.collection='events' AND e.data->>'status'='COMPLETED'
 ORDER BY e.data->>'date' DESC, e.id
 LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_photos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_event_photos() TO service_role;