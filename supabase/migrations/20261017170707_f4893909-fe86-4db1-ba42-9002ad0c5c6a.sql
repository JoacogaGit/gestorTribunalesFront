revoke execute on function public.es_admin_de_vocalia(uuid) from public, anon;
grant execute on function public.es_admin_de_vocalia(uuid) to authenticated;

revoke execute on function public.definir_password_vocalia(uuid, text) from public, anon;
grant execute on function public.definir_password_vocalia(uuid, text) to authenticated;

revoke execute on function public.verificar_password_vocalia(uuid, text) from public, anon;
grant execute on function public.verificar_password_vocalia(uuid, text) to authenticated;

revoke execute on function public.vocalia_tiene_password(uuid) from public, anon;
grant execute on function public.vocalia_tiene_password(uuid) to authenticated;

create policy "sin acceso directo" on public.vocalia_passwords for select to authenticated using (false);