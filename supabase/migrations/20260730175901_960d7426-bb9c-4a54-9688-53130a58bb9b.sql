-- ============ 1. ENUMS ============
ALTER TYPE public.rol_miembro_enum ADD VALUE IF NOT EXISTS 'lector';
ALTER TYPE public.tipo_recurso_enum ADD VALUE IF NOT EXISTS 'apelacion';
ALTER TYPE public.tipo_recurso_enum ADD VALUE IF NOT EXISTS 'tsj';

-- ============ 2. HELPERS DE PERMISO ============
CREATE OR REPLACE FUNCTION public.puede_editar_vocalia(p_vocalia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.es_superadmin() OR EXISTS (
    SELECT 1 FROM vocalias v
    JOIN miembros_tribunal m ON m.tribunal_id = v.tribunal_id
    JOIN tribunales t ON t.id = v.tribunal_id
    WHERE v.id = p_vocalia_id
      AND m.usuario_id = auth.uid()
      AND m.rol::text <> 'lector'
      AND t.eliminado_en IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.es_lector_tribunal(p_tribunal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM miembros_tribunal m
    WHERE m.tribunal_id = p_tribunal_id
      AND m.usuario_id = auth.uid()
      AND m.rol::text = 'lector'
  )
$$;

-- ============ 3. RLS: bloquear mutaciones a lectores ============
DROP POLICY IF EXISTS causas_insert ON public.causas;
DROP POLICY IF EXISTS causas_update ON public.causas;
DROP POLICY IF EXISTS causas_delete ON public.causas;
CREATE POLICY causas_insert ON public.causas FOR INSERT TO authenticated WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY causas_update ON public.causas FOR UPDATE TO authenticated USING (public.puede_editar_vocalia(vocalia_id)) WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY causas_delete ON public.causas FOR DELETE TO authenticated USING (public.puede_editar_vocalia(vocalia_id));

DROP POLICY IF EXISTS sujetos_insert ON public.sujetos;
DROP POLICY IF EXISTS sujetos_update ON public.sujetos;
DROP POLICY IF EXISTS sujetos_delete ON public.sujetos;
CREATE POLICY sujetos_insert ON public.sujetos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM causas c WHERE c.id = sujetos.causa_id AND public.puede_editar_vocalia(c.vocalia_id)));
CREATE POLICY sujetos_update ON public.sujetos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM causas c WHERE c.id = sujetos.causa_id AND public.puede_editar_vocalia(c.vocalia_id))) WITH CHECK (EXISTS (SELECT 1 FROM causas c WHERE c.id = sujetos.causa_id AND public.puede_editar_vocalia(c.vocalia_id)));
CREATE POLICY sujetos_delete ON public.sujetos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM causas c WHERE c.id = sujetos.causa_id AND public.puede_editar_vocalia(c.vocalia_id)));

DROP POLICY IF EXISTS eventos_insert ON public.eventos;
DROP POLICY IF EXISTS eventos_update ON public.eventos;
DROP POLICY IF EXISTS eventos_delete ON public.eventos;
CREATE POLICY eventos_insert ON public.eventos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM causas c WHERE c.id = eventos.causa_id AND public.puede_editar_vocalia(c.vocalia_id)));
CREATE POLICY eventos_update ON public.eventos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM causas c WHERE c.id = eventos.causa_id AND public.puede_editar_vocalia(c.vocalia_id))) WITH CHECK (EXISTS (SELECT 1 FROM causas c WHERE c.id = eventos.causa_id AND public.puede_editar_vocalia(c.vocalia_id)));
CREATE POLICY eventos_delete ON public.eventos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM causas c WHERE c.id = eventos.causa_id AND public.puede_editar_vocalia(c.vocalia_id)));

DROP POLICY IF EXISTS categorias_insert ON public.categorias_personalizadas;
DROP POLICY IF EXISTS categorias_update ON public.categorias_personalizadas;
DROP POLICY IF EXISTS categorias_delete ON public.categorias_personalizadas;
CREATE POLICY categorias_insert ON public.categorias_personalizadas FOR INSERT TO authenticated WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY categorias_update ON public.categorias_personalizadas FOR UPDATE TO authenticated USING (public.puede_editar_vocalia(vocalia_id)) WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY categorias_delete ON public.categorias_personalizadas FOR DELETE TO authenticated USING (public.puede_editar_vocalia(vocalia_id));

DROP POLICY IF EXISTS "Miembros de la vocalía crean listas" ON public.listas_personalizadas;
DROP POLICY IF EXISTS "Miembros de la vocalía editan listas" ON public.listas_personalizadas;
DROP POLICY IF EXISTS "Miembros de la vocalía borran listas" ON public.listas_personalizadas;
CREATE POLICY listas_insert ON public.listas_personalizadas FOR INSERT TO authenticated WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY listas_update ON public.listas_personalizadas FOR UPDATE TO authenticated USING (public.puede_editar_vocalia(vocalia_id)) WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY listas_delete ON public.listas_personalizadas FOR DELETE TO authenticated USING (public.puede_editar_vocalia(vocalia_id));

DROP POLICY IF EXISTS "Miembros agregan causas a listas" ON public.listas_personalizadas_causas;
DROP POLICY IF EXISTS "Miembros sacan causas de listas" ON public.listas_personalizadas_causas;
CREATE POLICY listas_causas_insert ON public.listas_personalizadas_causas FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM listas_personalizadas lp WHERE lp.id = listas_personalizadas_causas.lista_id AND public.puede_editar_vocalia(lp.vocalia_id)));
CREATE POLICY listas_causas_delete ON public.listas_personalizadas_causas FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM listas_personalizadas lp WHERE lp.id = listas_personalizadas_causas.lista_id AND public.puede_editar_vocalia(lp.vocalia_id)));

DROP POLICY IF EXISTS prescripciones_insert ON public.prescripciones;
DROP POLICY IF EXISTS prescripciones_update ON public.prescripciones;
DROP POLICY IF EXISTS prescripciones_delete ON public.prescripciones;
CREATE POLICY prescripciones_insert ON public.prescripciones FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM sujetos s JOIN causas c ON c.id = s.causa_id WHERE s.id = prescripciones.sujeto_id AND public.puede_editar_vocalia(c.vocalia_id)));
CREATE POLICY prescripciones_update ON public.prescripciones FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM sujetos s JOIN causas c ON c.id = s.causa_id WHERE s.id = prescripciones.sujeto_id AND public.puede_editar_vocalia(c.vocalia_id))) WITH CHECK (EXISTS (SELECT 1 FROM sujetos s JOIN causas c ON c.id = s.causa_id WHERE s.id = prescripciones.sujeto_id AND public.puede_editar_vocalia(c.vocalia_id)));
CREATE POLICY prescripciones_delete ON public.prescripciones FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM sujetos s JOIN causas c ON c.id = s.causa_id WHERE s.id = prescripciones.sujeto_id AND public.puede_editar_vocalia(c.vocalia_id)));

-- ============ 4. ANOTACIONES: LISTAS ANIDADAS ============
CREATE TABLE public.tablero_listas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tablero_id uuid NOT NULL REFERENCES public.tableros(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  nombre text NOT NULL,
  ambito text NOT NULL DEFAULT 'personal' CHECK (ambito IN ('personal','vocalia')),
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tablero_listas TO authenticated;
GRANT ALL ON public.tablero_listas TO service_role;
ALTER TABLE public.tablero_listas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tablero_columnas ADD COLUMN lista_id uuid REFERENCES public.tablero_listas(id) ON DELETE CASCADE;

-- Backfill: una lista por tablero existente
INSERT INTO public.tablero_listas (tablero_id, usuario_id, nombre, ambito, orden)
SELECT t.id, t.usuario_id, 'General', t.ambito, 0 FROM public.tableros t;

UPDATE public.tablero_columnas c
SET lista_id = l.id
FROM public.tablero_listas l
WHERE l.tablero_id = c.tablero_id AND c.lista_id IS NULL;

DELETE FROM public.tablero_columnas WHERE lista_id IS NULL;
ALTER TABLE public.tablero_columnas ALTER COLUMN lista_id SET NOT NULL;

-- El tablero deja de tener ámbito
DROP POLICY IF EXISTS tableros_select ON public.tableros;
DROP POLICY IF EXISTS tableros_insert ON public.tableros;
DROP POLICY IF EXISTS tableros_update ON public.tableros;
DROP POLICY IF EXISTS tableros_delete ON public.tableros;
ALTER TABLE public.tableros DROP COLUMN ambito;

CREATE OR REPLACE FUNCTION public.puede_acceder_tablero(p_tablero_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tableros t
    WHERE t.id = p_tablero_id
      AND (t.usuario_id = auth.uid() OR public.es_miembro_de_vocalia(t.vocalia_id))
  )
$$;

CREATE POLICY tableros_select ON public.tableros FOR SELECT TO authenticated USING (public.puede_acceder_tablero(id));
CREATE POLICY tableros_insert ON public.tableros FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid() AND public.es_miembro_de_vocalia(vocalia_id));
CREATE POLICY tableros_update ON public.tableros FOR UPDATE TO authenticated USING (public.puede_acceder_tablero(id)) WITH CHECK (public.puede_acceder_tablero(id));
CREATE POLICY tableros_delete ON public.tableros FOR DELETE TO authenticated USING (public.puede_acceder_tablero(id));

CREATE OR REPLACE FUNCTION public.puede_ver_lista_tablero(p_lista_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_listas l
    JOIN public.tableros t ON t.id = l.tablero_id
    WHERE l.id = p_lista_id
      AND (
        (l.ambito = 'personal' AND l.usuario_id = auth.uid())
        OR (l.ambito = 'vocalia' AND public.es_miembro_de_vocalia(t.vocalia_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.puede_editar_lista_tablero(p_lista_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_listas l
    JOIN public.tableros t ON t.id = l.tablero_id
    WHERE l.id = p_lista_id
      AND (
        (l.ambito = 'personal' AND l.usuario_id = auth.uid())
        OR (l.ambito = 'vocalia' AND public.puede_editar_vocalia(t.vocalia_id))
      )
  )
$$;

CREATE POLICY listas_tablero_select ON public.tablero_listas FOR SELECT TO authenticated USING (public.puede_ver_lista_tablero(id));
CREATE POLICY listas_tablero_insert ON public.tablero_listas FOR INSERT TO authenticated WITH CHECK (
  usuario_id = auth.uid()
  AND public.puede_acceder_tablero(tablero_id)
  AND (ambito = 'personal' OR EXISTS (SELECT 1 FROM public.tableros t WHERE t.id = tablero_id AND public.puede_editar_vocalia(t.vocalia_id)))
);
CREATE POLICY listas_tablero_update ON public.tablero_listas FOR UPDATE TO authenticated USING (public.puede_editar_lista_tablero(id)) WITH CHECK (public.puede_editar_lista_tablero(id));
CREATE POLICY listas_tablero_delete ON public.tablero_listas FOR DELETE TO authenticated USING (public.puede_editar_lista_tablero(id));

CREATE OR REPLACE FUNCTION public.puede_acceder_columna(p_columna_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_columnas c
    WHERE c.id = p_columna_id AND public.puede_ver_lista_tablero(c.lista_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.puede_editar_columna(p_columna_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_columnas c
    WHERE c.id = p_columna_id AND public.puede_editar_lista_tablero(c.lista_id)
  )
$$;

DROP POLICY IF EXISTS columnas_select ON public.tablero_columnas;
DROP POLICY IF EXISTS columnas_insert ON public.tablero_columnas;
DROP POLICY IF EXISTS columnas_update ON public.tablero_columnas;
DROP POLICY IF EXISTS columnas_delete ON public.tablero_columnas;
CREATE POLICY columnas_select ON public.tablero_columnas FOR SELECT TO authenticated USING (public.puede_ver_lista_tablero(lista_id));
CREATE POLICY columnas_insert ON public.tablero_columnas FOR INSERT TO authenticated WITH CHECK (public.puede_editar_lista_tablero(lista_id));
CREATE POLICY columnas_update ON public.tablero_columnas FOR UPDATE TO authenticated USING (public.puede_editar_lista_tablero(lista_id)) WITH CHECK (public.puede_editar_lista_tablero(lista_id));
CREATE POLICY columnas_delete ON public.tablero_columnas FOR DELETE TO authenticated USING (public.puede_editar_lista_tablero(lista_id));

DROP POLICY IF EXISTS tarjetas_select ON public.tablero_tarjetas;
DROP POLICY IF EXISTS tarjetas_insert ON public.tablero_tarjetas;
DROP POLICY IF EXISTS tarjetas_update ON public.tablero_tarjetas;
DROP POLICY IF EXISTS tarjetas_delete ON public.tablero_tarjetas;
CREATE POLICY tarjetas_select ON public.tablero_tarjetas FOR SELECT TO authenticated USING (public.puede_acceder_columna(columna_id));
CREATE POLICY tarjetas_insert ON public.tablero_tarjetas FOR INSERT TO authenticated WITH CHECK (public.puede_editar_columna(columna_id));
CREATE POLICY tarjetas_update ON public.tablero_tarjetas FOR UPDATE TO authenticated USING (public.puede_editar_columna(columna_id)) WITH CHECK (public.puede_editar_columna(columna_id));
CREATE POLICY tarjetas_delete ON public.tablero_tarjetas FOR DELETE TO authenticated USING (public.puede_editar_columna(columna_id));

-- ============ 5. SUBESTADOS DE TRÁMITE ============
CREATE TABLE public.subestados_tramite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vocalia_id uuid NOT NULL REFERENCES public.vocalias(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vocalia_id, nombre)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subestados_tramite TO authenticated;
GRANT ALL ON public.subestados_tramite TO service_role;
ALTER TABLE public.subestados_tramite ENABLE ROW LEVEL SECURITY;
CREATE POLICY subestados_select ON public.subestados_tramite FOR SELECT TO authenticated USING (public.es_miembro_de_vocalia(vocalia_id) OR public.es_superadmin());
CREATE POLICY subestados_insert ON public.subestados_tramite FOR INSERT TO authenticated WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY subestados_update ON public.subestados_tramite FOR UPDATE TO authenticated USING (public.puede_editar_vocalia(vocalia_id)) WITH CHECK (public.puede_editar_vocalia(vocalia_id));
CREATE POLICY subestados_delete ON public.subestados_tramite FOR DELETE TO authenticated USING (public.puede_editar_vocalia(vocalia_id));

ALTER TABLE public.causas ADD COLUMN subestado_tramite_id uuid REFERENCES public.subestados_tramite(id) ON DELETE SET NULL;

INSERT INTO public.subestados_tramite (vocalia_id, nombre, orden)
SELECT v.id, d.nombre, d.orden
FROM public.vocalias v
CROSS JOIN (VALUES ('Para indagar',0),('Indagado',1),('Procesado',2),('Elevado',3)) AS d(nombre, orden)
ON CONFLICT (vocalia_id, nombre) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crear_subestados_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.subestados_tramite (vocalia_id, nombre, orden)
  VALUES (NEW.id, 'Para indagar', 0), (NEW.id, 'Indagado', 1), (NEW.id, 'Procesado', 2), (NEW.id, 'Elevado', 3)
  ON CONFLICT (vocalia_id, nombre) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subestados_default ON public.vocalias;
CREATE TRIGGER trg_subestados_default AFTER INSERT ON public.vocalias
FOR EACH ROW EXECUTE FUNCTION public.crear_subestados_default();

-- ============ 6. TUTORIAL ============
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS tutorial_completado boolean NOT NULL DEFAULT false;