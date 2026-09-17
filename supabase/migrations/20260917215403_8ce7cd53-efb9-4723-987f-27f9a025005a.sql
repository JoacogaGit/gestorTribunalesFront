CREATE OR REPLACE FUNCTION public.eliminar_tribunal_definitivo(p_tribunal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadmin puede eliminar una oficina de forma definitiva';
  END IF;

  DELETE FROM public.tribunales WHERE id = p_tribunal_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_tribunal_definitivo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_tribunal_definitivo(uuid) TO authenticated;