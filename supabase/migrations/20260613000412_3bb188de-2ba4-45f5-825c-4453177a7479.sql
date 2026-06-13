
-- 1) Despachante en causas
ALTER TABLE public.causas
  ADD COLUMN IF NOT EXISTS despachante text;
ALTER TABLE public.causas
  DROP CONSTRAINT IF EXISTS causas_despachante_len_chk;
ALTER TABLE public.causas
  ADD CONSTRAINT causas_despachante_len_chk
  CHECK (despachante IS NULL OR length(despachante) <= 3);

-- 2) Categoria personalizada referenciada desde eventos
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS categoria_personalizada_id uuid
  REFERENCES public.categorias_personalizadas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS eventos_categoria_personalizada_id_idx
  ON public.eventos(categoria_personalizada_id);

-- 3) Drop tabla vieja de etiquetas (sin UI, sin datos relevantes)
DROP TABLE IF EXISTS public.causas_en_categorias;

-- 4) RPC para crear categoría y materializar eventos vacíos
CREATE OR REPLACE FUNCTION public.crear_categoria_con_eventos(
  p_vocalia_id uuid,
  p_nombre text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_categoria_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF NOT (public.es_miembro_de_vocalia(p_vocalia_id) OR public.es_superadmin()) THEN
    RAISE EXCEPTION 'Sin permiso sobre esta vocalía';
  END IF;
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN
    RAISE EXCEPTION 'Nombre de categoría requerido';
  END IF;

  INSERT INTO public.categorias_personalizadas (vocalia_id, nombre_categoria, creado_por)
  VALUES (p_vocalia_id, trim(p_nombre), v_user_id)
  RETURNING id INTO v_categoria_id;

  INSERT INTO public.eventos (causa_id, titulo, descripcion, fecha_hora, categoria_personalizada_id, creado_por)
  SELECT c.id, trim(p_nombre), NULL, NULL, v_categoria_id, v_user_id
  FROM public.causas c
  WHERE c.vocalia_id = p_vocalia_id
    AND c.estado_causa <> 'terminada'
    AND c.borrado_en IS NULL;

  RETURN v_categoria_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_categoria_con_eventos(uuid, text) TO authenticated;
