
-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own subs select" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users manage own subs insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users manage own subs update" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users manage own subs delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_push_subs_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

-- push alerts sent (avoid duplicates)
CREATE TABLE public.push_alertas_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,             -- 'evento' | 'pp' | 'pena' | 'sjp' | 'prescripcion'
  recurso_id UUID NOT NULL,       -- evento.id | sujeto.id | prescripcion.id
  ventana TEXT NOT NULL,          -- '3d' | '1d' | '1h'
  fecha_objetivo TIMESTAMPTZ NOT NULL,
  enviada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo, recurso_id, ventana, fecha_objetivo)
);

GRANT SELECT ON public.push_alertas_enviadas TO authenticated;
GRANT ALL ON public.push_alertas_enviadas TO service_role;

ALTER TABLE public.push_alertas_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas read by miembros" ON public.push_alertas_enviadas
  FOR SELECT TO authenticated USING (true);

-- Schedule cron job (hourly)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'enviar-push-alertas-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wgmacqnypvrlkqiucdig.supabase.co/functions/v1/enviar-push-alertas',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnbWFjcW55cHZybGtxaXVjZGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzAzMDEsImV4cCI6MjA5MzUwNjMwMX0.P9MiSS8_NBq9KpBUyKrr33k3VfiDPJ9tmmkKx27wtLY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
