CREATE OR REPLACE FUNCTION public.registrar_modificacion_causa()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.modificado_por := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_registrar_modificacion_causa ON public.causas;
CREATE TRIGGER trg_registrar_modificacion_causa
BEFORE UPDATE ON public.causas
FOR EACH ROW EXECUTE FUNCTION public.registrar_modificacion_causa();

CREATE OR REPLACE FUNCTION public.registrar_modificacion_sujeto()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    UPDATE public.causas SET modificado_por = auth.uid(), updated_at = now()
    WHERE id = COALESCE(NEW.causa_id, OLD.causa_id);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_registrar_modificacion_sujeto ON public.sujetos;
CREATE TRIGGER trg_registrar_modificacion_sujeto
AFTER INSERT OR UPDATE ON public.sujetos
FOR EACH ROW EXECUTE FUNCTION public.registrar_modificacion_sujeto();