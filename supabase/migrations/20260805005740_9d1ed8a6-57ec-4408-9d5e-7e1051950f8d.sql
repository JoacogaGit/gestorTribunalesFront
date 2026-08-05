ALTER TABLE public.vocalias
  ADD COLUMN IF NOT EXISTS eliminado_en timestamptz NULL,
  ADD COLUMN IF NOT EXISTS eliminado_por uuid NULL REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_vocalias_eliminado_en ON public.vocalias (eliminado_en);

CREATE OR REPLACE FUNCTION public.eliminar_vocalia(p_vocalia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tribunal_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT tribunal_id INTO v_tribunal_id FROM public.vocalias WHERE id = p_vocalia_id;
  IF v_tribunal_id IS NULL THEN
    RAISE EXCEPTION 'Espacio inexistente';
  END IF;

  IF NOT (public.es_admin_tribunal(v_tribunal_id) OR public.es_superadmin()) THEN
    RAISE EXCEPTION 'Solo un administrador de la oficina puede eliminar un espacio';
  END IF;

  UPDATE public.vocalias
  SET eliminado_en = now(), eliminado_por = auth.uid()
  WHERE id = p_vocalia_id AND eliminado_en IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurar_vocalia(p_vocalia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadmin puede restaurar espacios';
  END IF;

  UPDATE public.vocalias
  SET eliminado_en = NULL, eliminado_por = NULL
  WHERE id = p_vocalia_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_vocalias_papelera()
RETURNS TABLE (
  id uuid,
  nombre text,
  tribunal_id uuid,
  tribunal_nombre text,
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_por_nombre text,
  causas_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id,
         v.nombre,
         v.tribunal_id,
         t.nombre AS tribunal_nombre,
         v.eliminado_en,
         v.eliminado_por,
         COALESCE(p.nombre_completo, p.email) AS eliminado_por_nombre,
         (SELECT COUNT(*) FROM public.causas c WHERE c.vocalia_id = v.id AND c.borrado_en IS NULL) AS causas_count
  FROM public.vocalias v
  JOIN public.tribunales t ON t.id = v.tribunal_id
  LEFT JOIN public.perfiles p ON p.id = v.eliminado_por
  WHERE v.eliminado_en IS NOT NULL
    AND public.es_superadmin()
  ORDER BY v.eliminado_en DESC;
$$;