CREATE TABLE public.tableros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocalia_id UUID NOT NULL REFERENCES public.vocalias(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  ambito TEXT NOT NULL CHECK (ambito IN ('personal','vocalia')),
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tablero_columnas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablero_id UUID NOT NULL REFERENCES public.tableros(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tablero_tarjetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  columna_id UUID NOT NULL REFERENCES public.tablero_columnas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_hora TIMESTAMPTZ,
  fecha_hora_fin TIMESTAMPTZ,
  causa_id UUID REFERENCES public.causas(id) ON DELETE SET NULL,
  orden INT NOT NULL DEFAULT 0,
  creado_por UUID,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tableros_vocalia ON public.tableros(vocalia_id);
CREATE INDEX idx_tablero_columnas_tablero ON public.tablero_columnas(tablero_id);
CREATE INDEX idx_tablero_tarjetas_columna ON public.tablero_tarjetas(columna_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tableros TO authenticated;
GRANT ALL ON public.tableros TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tablero_columnas TO authenticated;
GRANT ALL ON public.tablero_columnas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tablero_tarjetas TO authenticated;
GRANT ALL ON public.tablero_tarjetas TO service_role;

ALTER TABLE public.tableros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablero_columnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablero_tarjetas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.puede_acceder_tablero(p_tablero_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tableros t
    WHERE t.id = p_tablero_id
      AND (
        (t.ambito = 'personal' AND t.usuario_id = auth.uid())
        OR (t.ambito = 'vocalia' AND public.es_miembro_de_vocalia(t.vocalia_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.puede_acceder_columna(p_columna_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_columnas c
    WHERE c.id = p_columna_id
      AND public.puede_acceder_tablero(c.tablero_id)
  )
$$;

CREATE POLICY "tableros_select" ON public.tableros FOR SELECT TO authenticated
USING ((ambito = 'personal' AND usuario_id = auth.uid()) OR (ambito = 'vocalia' AND public.es_miembro_de_vocalia(vocalia_id)));

CREATE POLICY "tableros_insert" ON public.tableros FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() AND public.es_miembro_de_vocalia(vocalia_id));

CREATE POLICY "tableros_update" ON public.tableros FOR UPDATE TO authenticated
USING ((ambito = 'personal' AND usuario_id = auth.uid()) OR (ambito = 'vocalia' AND public.es_miembro_de_vocalia(vocalia_id)))
WITH CHECK ((ambito = 'personal' AND usuario_id = auth.uid()) OR (ambito = 'vocalia' AND public.es_miembro_de_vocalia(vocalia_id)));

CREATE POLICY "tableros_delete" ON public.tableros FOR DELETE TO authenticated
USING ((ambito = 'personal' AND usuario_id = auth.uid()) OR (ambito = 'vocalia' AND public.es_miembro_de_vocalia(vocalia_id)));

CREATE POLICY "tablero_columnas_select" ON public.tablero_columnas FOR SELECT TO authenticated USING (public.puede_acceder_tablero(tablero_id));
CREATE POLICY "tablero_columnas_insert" ON public.tablero_columnas FOR INSERT TO authenticated WITH CHECK (public.puede_acceder_tablero(tablero_id));
CREATE POLICY "tablero_columnas_update" ON public.tablero_columnas FOR UPDATE TO authenticated USING (public.puede_acceder_tablero(tablero_id)) WITH CHECK (public.puede_acceder_tablero(tablero_id));
CREATE POLICY "tablero_columnas_delete" ON public.tablero_columnas FOR DELETE TO authenticated USING (public.puede_acceder_tablero(tablero_id));

CREATE POLICY "tablero_tarjetas_select" ON public.tablero_tarjetas FOR SELECT TO authenticated USING (public.puede_acceder_columna(columna_id));
CREATE POLICY "tablero_tarjetas_insert" ON public.tablero_tarjetas FOR INSERT TO authenticated WITH CHECK (public.puede_acceder_columna(columna_id));
CREATE POLICY "tablero_tarjetas_update" ON public.tablero_tarjetas FOR UPDATE TO authenticated USING (public.puede_acceder_columna(columna_id)) WITH CHECK (public.puede_acceder_columna(columna_id));
CREATE POLICY "tablero_tarjetas_delete" ON public.tablero_tarjetas FOR DELETE TO authenticated USING (public.puede_acceder_columna(columna_id));