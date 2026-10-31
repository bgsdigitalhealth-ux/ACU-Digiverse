CREATE OR REPLACE FUNCTION public.cer_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  approver boolean;
  s_new text; s_old text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.collection NOT IN ('cerReports','cerDepts') THEN RETURN NEW; END IF;
  approver := public.is_global() OR public.has_role(auth.uid(),'dean')
    OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'cer_reviewer');
  IF NEW.collection = 'cerDepts' THEN
    IF NOT (public.is_global() OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'principal')) THEN
      RAISE EXCEPTION 'Only the college Principal can manage departments';
    END IF;
    RETURN NEW;
  END IF;
  s_new := NEW.data->>'status';
  s_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.data->>'status' ELSE NULL END;
  IF s_new IN ('Approved','Rejected','Revision Requested')
     AND (TG_OP = 'INSERT' OR s_old IS DISTINCT FROM s_new
          OR (OLD.data->'approvedSnapshot') IS DISTINCT FROM (NEW.data->'approvedSnapshot')
          OR (OLD.data->'decisions') IS DISTINCT FROM (NEW.data->'decisions'))
     AND NOT approver THEN
    RAISE EXCEPTION 'Only the Principal or a reviewer can make approval decisions';
  END IF;
  IF TG_OP = 'UPDATE' AND s_old = 'Approved'
     AND (OLD.data->'approvedSnapshot') IS DISTINCT FROM (NEW.data->'approvedSnapshot')
     AND NOT public.is_global() THEN
    RAISE EXCEPTION 'Approved reports are locked';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cer_guard_trg ON public.app_items;
CREATE TRIGGER cer_guard_trg BEFORE INSERT OR UPDATE ON public.app_items
FOR EACH ROW EXECUTE FUNCTION public.cer_guard();