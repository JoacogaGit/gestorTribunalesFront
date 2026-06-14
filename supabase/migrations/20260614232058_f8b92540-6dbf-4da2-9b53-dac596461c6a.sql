-- Tabla de vinculación con Google Calendar
CREATE TABLE public.google_calendar_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocalia_id uuid NOT NULL REFERENCES public.vocalias(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_sync_user_unique UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_sync TO authenticated;
GRANT ALL ON public.google_calendar_sync TO service_role;

ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gcs_select_own"
  ON public.google_calendar_sync
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "gcs_insert_own"
  ON public.google_calendar_sync
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gcs_update_own"
  ON public.google_calendar_sync
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gcs_delete_own"
  ON public.google_calendar_sync
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger de updated_at
CREATE TRIGGER trg_gcs_updated_at
  BEFORE UPDATE ON public.google_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

-- Mapeo de eventos JusTrack <-> Google Calendar
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE INDEX IF NOT EXISTS idx_eventos_google_event_id
  ON public.eventos (google_event_id)
  WHERE google_event_id IS NOT NULL;