
CREATE TABLE public.migraciones_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocalia_id UUID NOT NULL REFERENCES public.vocalias(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archivo_nombre TEXT NOT NULL,
  archivo_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  total_lotes INT NOT NULL DEFAULT 0,
  lotes_procesados INT NOT NULL DEFAULT 0,
  lotes_fallidos INT NOT NULL DEFAULT 0,
  lotes_pendientes JSONB NOT NULL DEFAULT '[]'::jsonb,
  resultados JSONB NOT NULL DEFAULT '[]'::jsonb,
  filas_rojas JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_mensaje TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT migraciones_jobs_estado_check CHECK (estado IN ('pendiente','procesando','revision','completado','error'))
);

CREATE INDEX idx_migraciones_jobs_usr_voc_estado ON public.migraciones_jobs (usuario_id, vocalia_id, estado);
CREATE INDEX idx_migraciones_jobs_estado_updated ON public.migraciones_jobs (estado, updated_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.migraciones_jobs TO authenticated;
GRANT ALL ON public.migraciones_jobs TO service_role;

ALTER TABLE public.migraciones_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus jobs o superadmin todos"
  ON public.migraciones_jobs FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR public.es_superadmin());

CREATE POLICY "Usuario crea sus jobs"
  ON public.migraciones_jobs FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuario actualiza sus jobs o superadmin"
  ON public.migraciones_jobs FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid() OR public.es_superadmin())
  WITH CHECK (usuario_id = auth.uid() OR public.es_superadmin());

CREATE POLICY "Usuario borra sus jobs"
  ON public.migraciones_jobs FOR DELETE
  TO authenticated
  USING (usuario_id = auth.uid() OR public.es_superadmin());

CREATE TRIGGER trg_migraciones_jobs_updated_at
  BEFORE UPDATE ON public.migraciones_jobs
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();
