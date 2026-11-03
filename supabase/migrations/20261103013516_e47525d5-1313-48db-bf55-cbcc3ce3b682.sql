ALTER TYPE public.situacion_libertad_enum ADD VALUE IF NOT EXISTS 'paradero';

ALTER TABLE public.subestados_tramite
  ADD COLUMN IF NOT EXISTS estado_causa public.estado_causa_enum NOT NULL DEFAULT 'tramite';

ALTER TABLE public.tribunales
  ADD COLUMN IF NOT EXISTS nombres_listas jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.marcar_delegada_permanente()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado_causa = 'delegada' THEN
    NEW.delegada := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_delegada_permanente ON public.causas;
CREATE TRIGGER trg_marcar_delegada_permanente
  BEFORE INSERT OR UPDATE ON public.causas
  FOR EACH ROW EXECUTE FUNCTION public.marcar_delegada_permanente();

-- Alinear datos: las causas en trámite con la marca "delegada" pasan al estado "delegada"
-- (siguen viéndose en la lista Delegadas), sin tocar su fecha de modificación.
ALTER TABLE public.causas DISABLE TRIGGER trg_registrar_modificacion_causa;
ALTER TABLE public.causas DISABLE TRIGGER trg_causas_updated_at;
UPDATE public.causas
   SET estado_causa = 'delegada', tipo_recurso = NULL
 WHERE delegada = true AND estado_causa = 'tramite';
ALTER TABLE public.causas ENABLE TRIGGER trg_registrar_modificacion_causa;
ALTER TABLE public.causas ENABLE TRIGGER trg_causas_updated_at;

CREATE OR REPLACE FUNCTION public.superadmin_cambiar_rol_global(p_usuario_id uuid, p_rol public.rol_global_enum)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual public.rol_global_enum;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo un superadmin puede cambiar roles globales';
  END IF;
  SELECT rol_global INTO v_actual FROM public.perfiles WHERE id = p_usuario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  IF v_actual = 'superadmin' AND p_rol <> 'superadmin'
     AND (SELECT count(*) FROM public.perfiles WHERE rol_global = 'superadmin') <= 1 THEN
    RAISE EXCEPTION 'Tiene que quedar al menos un superadmin en el sistema';
  END IF;
  UPDATE public.perfiles SET rol_global = p_rol WHERE id = p_usuario_id;
END;
$$;

REVOKE ALL ON FUNCTION public.superadmin_cambiar_rol_global(uuid, public.rol_global_enum) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.superadmin_cambiar_rol_global(uuid, public.rol_global_enum) TO authenticated;