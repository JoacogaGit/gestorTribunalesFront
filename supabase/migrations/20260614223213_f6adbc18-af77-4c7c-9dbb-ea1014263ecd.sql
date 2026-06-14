-- Listas personalizadas por vocalía (carpetas de acomodo)

CREATE TABLE public.listas_personalizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vocalia_id uuid NOT NULL REFERENCES public.vocalias(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listas_personalizadas_vocalia ON public.listas_personalizadas(vocalia_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listas_personalizadas TO authenticated;
GRANT ALL ON public.listas_personalizadas TO service_role;

ALTER TABLE public.listas_personalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros de la vocalía ven sus listas"
  ON public.listas_personalizadas FOR SELECT TO authenticated
  USING (public.es_miembro_de_vocalia(vocalia_id) OR public.es_superadmin());

CREATE POLICY "Miembros de la vocalía crean listas"
  ON public.listas_personalizadas FOR INSERT TO authenticated
  WITH CHECK (public.es_miembro_de_vocalia(vocalia_id) OR public.es_superadmin());

CREATE POLICY "Miembros de la vocalía editan listas"
  ON public.listas_personalizadas FOR UPDATE TO authenticated
  USING (public.es_miembro_de_vocalia(vocalia_id) OR public.es_superadmin());

CREATE POLICY "Miembros de la vocalía borran listas"
  ON public.listas_personalizadas FOR DELETE TO authenticated
  USING (public.es_miembro_de_vocalia(vocalia_id) OR public.es_superadmin());

-- Pivot lista <-> causa
CREATE TABLE public.listas_personalizadas_causas (
  lista_id uuid NOT NULL REFERENCES public.listas_personalizadas(id) ON DELETE CASCADE,
  causa_id uuid NOT NULL REFERENCES public.causas(id) ON DELETE CASCADE,
  agregado_por uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lista_id, causa_id)
);

CREATE INDEX idx_lpc_causa ON public.listas_personalizadas_causas(causa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listas_personalizadas_causas TO authenticated;
GRANT ALL ON public.listas_personalizadas_causas TO service_role;

ALTER TABLE public.listas_personalizadas_causas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros ven asociaciones de sus listas"
  ON public.listas_personalizadas_causas FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listas_personalizadas lp
    WHERE lp.id = lista_id
      AND (public.es_miembro_de_vocalia(lp.vocalia_id) OR public.es_superadmin())
  ));

CREATE POLICY "Miembros agregan causas a listas"
  ON public.listas_personalizadas_causas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.listas_personalizadas lp
    WHERE lp.id = lista_id
      AND (public.es_miembro_de_vocalia(lp.vocalia_id) OR public.es_superadmin())
  ));

CREATE POLICY "Miembros sacan causas de listas"
  ON public.listas_personalizadas_causas FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listas_personalizadas lp
    WHERE lp.id = lista_id
      AND (public.es_miembro_de_vocalia(lp.vocalia_id) OR public.es_superadmin())
  ));

-- Función para crear lista con límite de 2 por vocalía
CREATE OR REPLACE FUNCTION public.crear_lista_personalizada(p_vocalia_id uuid, p_nombre text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF NOT (public.es_miembro_de_vocalia(p_vocalia_id) OR public.es_superadmin()) THEN
    RAISE EXCEPTION 'Sin permiso sobre esta vocalía';
  END IF;
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN
    RAISE EXCEPTION 'Nombre de lista requerido';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.listas_personalizadas
  WHERE vocalia_id = p_vocalia_id;

  IF v_count >= 2 THEN
    RAISE EXCEPTION 'Llegaste al límite de 2 listas personalizadas para esta vocalía';
  END IF;

  INSERT INTO public.listas_personalizadas (vocalia_id, nombre, creado_por)
  VALUES (p_vocalia_id, trim(p_nombre), v_user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_lista_personalizada(uuid, text) TO authenticated;