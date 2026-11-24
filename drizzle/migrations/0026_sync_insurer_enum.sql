CREATE OR REPLACE FUNCTION public.trg_insurer_enum_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  EXECUTE format('ALTER TYPE public.insurer ADD VALUE IF NOT EXISTS %L', NEW.name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_insurer_enum_sync ON public.insurers;
CREATE TRIGGER trg_insurer_enum_sync
AFTER INSERT OR UPDATE OF name ON public.insurers
FOR EACH ROW EXECUTE FUNCTION public.trg_insurer_enum_sync();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT name FROM public.insurers LOOP
    EXECUTE format('ALTER TYPE public.insurer ADD VALUE IF NOT EXISTS %L', r.name);
  END LOOP;
END $$;