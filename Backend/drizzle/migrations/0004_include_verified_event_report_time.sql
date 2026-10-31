CREATE OR REPLACE FUNCTION public.list_public_event_resources()
RETURNS TABLE (id text, title text, department text, college text, event_date text, end_date text, event_time text, venue text, event_type text, mode text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT e.id, COALESCE(e.data->>'title','Untitled event'),
 COALESCE(d.data->>'name','Department not specified'), COALESCE(c.data->>'name','College not specified'),
 COALESCE(e.data->>'date',''), COALESCE(e.data->>'dateTo',''), COALESCE(NULLIF(e.data->>'time',''), r.data->'data'->>'Time',''),
 COALESCE(e.data->>'venue',''), COALESCE(e.data->>'type',''), COALESCE(e.data->>'mode',''), e.data->>'status'
 FROM public.app_items e
 LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id
 LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id
 LEFT JOIN public.app_items r ON e.data->>'status'='COMPLETED' AND r.collection='recs' AND r.id=e.data->>'recId' AND r.dept_id=e.dept_id AND r.college_id=e.college_id
 WHERE e.collection='events' AND e.data->>'status' IN ('APPROVED','COMPLETED')
 ORDER BY e.data->>'date' DESC, e.id
 LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_resources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_event_resources() TO anon, authenticated, service_role;