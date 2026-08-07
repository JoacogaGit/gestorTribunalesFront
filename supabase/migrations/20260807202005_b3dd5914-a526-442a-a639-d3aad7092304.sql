
-- Helper: puede editar el tablero (dueño o miembro no-lector de la vocalía)
CREATE OR REPLACE FUNCTION public.puede_editar_tablero(p_tablero_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tableros t
    WHERE t.id = p_tablero_id
      AND (t.usuario_id = auth.uid() OR public.puede_editar_vocalia(t.vocalia_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.puede_editar_lista_tablero(p_lista_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_listas l
    JOIN public.tableros t ON t.id = l.tablero_id
    WHERE l.id = p_lista_id
      AND (
        l.usuario_id = auth.uid()
        OR t.usuario_id = auth.uid()
        OR (l.ambito = 'vocalia' AND public.puede_editar_vocalia(t.vocalia_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.puede_ver_lista_tablero(p_lista_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tablero_listas l
    JOIN public.tableros t ON t.id = l.tablero_id
    WHERE l.id = p_lista_id
      AND (
        l.usuario_id = auth.uid()
        OR t.usuario_id = auth.uid()
        OR (l.ambito = 'vocalia' AND public.es_miembro_de_vocalia(t.vocalia_id))
      )
  )
$$;

-- LISTAS
DROP POLICY IF EXISTS listas_tablero_insert ON public.tablero_listas;
CREATE POLICY listas_tablero_insert ON public.tablero_listas
FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() AND public.puede_editar_tablero(tablero_id));

-- COLUMNAS: quitar políticas duplicadas basadas solo en acceso al tablero
DROP POLICY IF EXISTS tablero_columnas_insert ON public.tablero_columnas;
DROP POLICY IF EXISTS tablero_columnas_update ON public.tablero_columnas;
DROP POLICY IF EXISTS tablero_columnas_delete ON public.tablero_columnas;
DROP POLICY IF EXISTS tablero_columnas_select ON public.tablero_columnas;
DROP POLICY IF EXISTS columnas_insert ON public.tablero_columnas;
CREATE POLICY columnas_insert ON public.tablero_columnas
FOR INSERT TO authenticated
WITH CHECK (public.puede_editar_lista_tablero(lista_id) AND public.puede_editar_tablero(tablero_id));

-- TARJETAS
DROP POLICY IF EXISTS tablero_tarjetas_insert ON public.tablero_tarjetas;
DROP POLICY IF EXISTS tablero_tarjetas_update ON public.tablero_tarjetas;
DROP POLICY IF EXISTS tablero_tarjetas_delete ON public.tablero_tarjetas;
DROP POLICY IF EXISTS tablero_tarjetas_select ON public.tablero_tarjetas;
