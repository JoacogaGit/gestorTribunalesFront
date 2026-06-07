
-- 1) Columnas papelera
ALTER TABLE public.tribunales
  ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS eliminado_por UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tribunales_eliminado_en_idx ON public.tribunales (eliminado_en);

-- 2) Ignorar tribunales archivados en helpers de RLS (superadmin no usa estos helpers)
CREATE OR REPLACE FUNCTION public.es_miembro_tribunal(p_tribunal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM miembros_tribunal m
    JOIN tribunales t ON t.id = m.tribunal_id
    WHERE m.tribunal_id = p_tribunal_id
      AND m.usuario_id = auth.uid()
      AND t.eliminado_en IS NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.es_admin_tribunal(p_tribunal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM miembros_tribunal m
    JOIN tribunales t ON t.id = m.tribunal_id
    WHERE m.tribunal_id = p_tribunal_id
      AND m.usuario_id = auth.uid()
      AND m.rol = 'admin'
      AND t.eliminado_en IS NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.es_miembro_de_vocalia(p_vocalia_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM vocalias v
    INNER JOIN miembros_tribunal m ON m.tribunal_id = v.tribunal_id
    INNER JOIN tribunales t ON t.id = v.tribunal_id
    WHERE v.id = p_vocalia_id
      AND m.usuario_id = auth.uid()
      AND t.eliminado_en IS NULL
  );
END;
$function$;

-- 3) Archivar tribunal (papelera 30d) y dejar de ser miembro
CREATE OR REPLACE FUNCTION public.abandonar_tribunal_archivar(p_tribunal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_miembros_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Sólo el último miembro puede archivar
  SELECT COUNT(*) INTO v_miembros_count FROM miembros_tribunal WHERE tribunal_id = p_tribunal_id;
  IF v_miembros_count <> 1 THEN
    RAISE EXCEPTION 'Solo el último miembro del tribunal puede archivarlo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM miembros_tribunal
    WHERE tribunal_id = p_tribunal_id AND usuario_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'No sos miembro de este tribunal';
  END IF;

  UPDATE tribunales
  SET eliminado_en = now(), eliminado_por = v_user_id
  WHERE id = p_tribunal_id AND eliminado_en IS NULL;

  DELETE FROM miembros_tribunal
  WHERE tribunal_id = p_tribunal_id AND usuario_id = v_user_id;
END;
$function$;

-- 4) Eliminar todo en cascada
CREATE OR REPLACE FUNCTION public.abandonar_tribunal_eliminar_todo(p_tribunal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_miembros_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT COUNT(*) INTO v_miembros_count FROM miembros_tribunal WHERE tribunal_id = p_tribunal_id;
  IF v_miembros_count <> 1 THEN
    RAISE EXCEPTION 'Solo el último miembro del tribunal puede eliminarlo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM miembros_tribunal
    WHERE tribunal_id = p_tribunal_id AND usuario_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'No sos miembro de este tribunal';
  END IF;

  -- Todas las FKs descendientes son ON DELETE CASCADE
  DELETE FROM tribunales WHERE id = p_tribunal_id;
END;
$function$;

-- 5) Restaurar (sólo superadmin)
CREATE OR REPLACE FUNCTION public.restaurar_tribunal(p_tribunal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadmin puede restaurar tribunales';
  END IF;

  UPDATE tribunales
  SET eliminado_en = NULL, eliminado_por = NULL
  WHERE id = p_tribunal_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.abandonar_tribunal_archivar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandonar_tribunal_eliminar_todo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurar_tribunal(uuid) TO authenticated;
