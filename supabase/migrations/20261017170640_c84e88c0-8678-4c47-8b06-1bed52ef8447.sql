create extension if not exists pgcrypto;

-- 1. Causa secreta
alter table public.causas add column if not exists secreta boolean not null default false;

create or replace function public.es_admin_de_vocalia(p_vocalia_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_superadmin() or exists (
    select 1 from vocalias v
    join miembros_tribunal m on m.tribunal_id = v.tribunal_id
    join tribunales t on t.id = v.tribunal_id
    where v.id = p_vocalia_id and m.usuario_id = auth.uid() and m.rol = 'admin' and t.eliminado_en is null
  )
$$;

-- Solo el admin ve causas secretas (y sus sujetos/eventos)
drop policy if exists causas_select on public.causas;
create policy causas_select on public.causas for select using (
  (es_miembro_de_vocalia(vocalia_id) or es_superadmin())
  and (not secreta or es_admin_de_vocalia(vocalia_id))
);

drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos for select using (
  exists (select 1 from causas c where c.id = eventos.causa_id
    and (es_miembro_de_vocalia(c.vocalia_id) or es_superadmin())
    and (not c.secreta or es_admin_de_vocalia(c.vocalia_id)))
);

drop policy if exists sujetos_select on public.sujetos;
create policy sujetos_select on public.sujetos for select using (
  exists (select 1 from causas c where c.id = sujetos.causa_id
    and (es_miembro_de_vocalia(c.vocalia_id) or es_superadmin())
    and (not c.secreta or es_admin_de_vocalia(c.vocalia_id)))
);

-- 2. Contraseña de espacio (hash en tabla sin acceso directo)
create table public.vocalia_passwords (
  vocalia_id uuid primary key references public.vocalias(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.vocalia_passwords to service_role;
alter table public.vocalia_passwords enable row level security;

create or replace function public.definir_password_vocalia(p_vocalia_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not public.es_admin_de_vocalia(p_vocalia_id) then
    raise exception 'Solo un administrador puede definir la contraseña del espacio';
  end if;
  if p_password is null or length(trim(p_password)) = 0 then
    delete from public.vocalia_passwords where vocalia_id = p_vocalia_id;
  else
    insert into public.vocalia_passwords (vocalia_id, password_hash)
    values (p_vocalia_id, crypt(trim(p_password), gen_salt('bf')))
    on conflict (vocalia_id) do update set password_hash = excluded.password_hash, updated_at = now();
  end if;
end;
$$;

create or replace function public.verificar_password_vocalia(p_vocalia_id uuid, p_password text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_hash text;
begin
  if auth.uid() is null then return false; end if;
  select password_hash into v_hash from public.vocalia_passwords where vocalia_id = p_vocalia_id;
  if v_hash is null then return true; end if;
  if p_password is null then return false; end if;
  return v_hash = crypt(trim(p_password), v_hash);
end;
$$;

create or replace function public.vocalia_tiene_password(p_vocalia_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vocalia_passwords where vocalia_id = p_vocalia_id)
$$;

-- 3. Permisos de edición por lista del tablero
alter table public.tablero_listas add column if not exists editores uuid[] not null default '{}';

create or replace function public.puede_editar_lista_tablero(p_lista_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tablero_listas l
    join public.tableros t on t.id = l.tablero_id
    where l.id = p_lista_id
      and (
        l.usuario_id = auth.uid()
        or (l.ambito <> 'personal' and public.es_miembro_de_vocalia(t.vocalia_id)
            and (cardinality(l.editores) = 0 or auth.uid() = any(l.editores)
                 or public.es_admin_de_vocalia(t.vocalia_id)))
      )
  )
$$;

-- 4. Opciones de listas personalizadas
alter table public.listas_personalizadas add column if not exists seleccionable_click_derecho boolean not null default true;
alter table public.listas_personalizadas add column if not exists mostrar_en_calendario boolean not null default true;
alter table public.listas_personalizadas add column if not exists solo_admin boolean not null default false;

drop policy if exists "Miembros de la vocalía ven sus listas" on public.listas_personalizadas;
create policy "Miembros de la vocalía ven sus listas" on public.listas_personalizadas for select using (
  (es_miembro_de_vocalia(vocalia_id) or es_superadmin())
  and (not solo_admin or es_admin_de_vocalia(vocalia_id))
);

drop policy if exists "Miembros ven asociaciones de sus listas" on public.listas_personalizadas_causas;
create policy "Miembros ven asociaciones de sus listas" on public.listas_personalizadas_causas for select using (
  exists (select 1 from listas_personalizadas lp where lp.id = listas_personalizadas_causas.lista_id
    and (es_miembro_de_vocalia(lp.vocalia_id) or es_superadmin())
    and (not lp.solo_admin or es_admin_de_vocalia(lp.vocalia_id)))
);