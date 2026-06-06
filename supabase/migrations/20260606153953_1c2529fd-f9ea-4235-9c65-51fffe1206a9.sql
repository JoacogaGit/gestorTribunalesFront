CREATE TYPE public.modo_tribunal_enum AS ENUM ('lista_unica', 'vocalias_separadas');

ALTER TABLE public.tribunales
  ADD COLUMN modo public.modo_tribunal_enum NOT NULL DEFAULT 'vocalias_separadas';