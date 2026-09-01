CREATE OR REPLACE FUNCTION public.crear_subestados_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subestados_tramite (vocalia_id, nombre, orden)
  VALUES (NEW.id, 'Para indagar', 0),
         (NEW.id, 'Indagado', 1),
         (NEW.id, 'Procesado', 2),
         (NEW.id, 'Elevado', 3),
         (NEW.id, 'Para fijar juicio', 4),
         (NEW.id, 'Para proveer prueba', 5)
  ON CONFLICT (vocalia_id, nombre) DO NOTHING;
  RETURN NEW;
END;
$function$;