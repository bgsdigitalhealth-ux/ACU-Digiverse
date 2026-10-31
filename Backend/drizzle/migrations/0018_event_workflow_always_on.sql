ALTER TABLE public.app_settings DISABLE TRIGGER protect_event_workflow_switch;
UPDATE public.app_settings SET event_workflow_enabled = true WHERE id = 1;
ALTER TABLE public.app_settings ENABLE TRIGGER protect_event_workflow_switch;
ALTER TABLE public.app_settings ALTER COLUMN event_workflow_enabled SET DEFAULT true;
CREATE OR REPLACE FUNCTION public.guard_event_workflow_switch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.event_workflow_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'Event workflow must stay ON' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;