
begin;

create or replace function public.delete_my_offer(
  p_offer_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_offer public.offers%rowtype;
begin
  -- Verificar sesión.
  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'sin_sesion';
  end if;

  -- Verificar que sea un comercio.
  select role
  into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is distinct from 'comercio' then
    raise exception using
      errcode = '42501',
      message = 'sin_permiso';
  end if;

  if p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'publicacion_invalida';
  end if;

  -- Bloquear la fila y verificar que pertenezca al usuario.
  select *
  into v_offer
  from public.offers
  where id = p_offer_id
    and seller_id = v_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'publicacion_no_encontrada';
  end if;

  -- Solo se pueden eliminar publicaciones archivadas.
  if v_offer.status <> 'archivada' then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_no_archivada';
  end if;

  -- No permitir eliminar publicaciones bloqueadas por administración.
  if v_offer.blocked then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_bloqueada';
  end if;

  -- Proteger cantidades reservadas.
  if v_offer.qty_reserved > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_con_reservas';
  end if;

  -- Proteger cantidades ya entregadas.
  if v_offer.qty_delivered > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_con_entregas';
  end if;

  -- No eliminar publicaciones que tengan historial de solicitudes.
  if exists (
    select 1
    from public.requests r
    where r.offer_id = v_offer.id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_con_historial';
  end if;

  -- Eliminar la publicación.
  delete from public.offers
  where id = v_offer.id
    and seller_id = v_user_id;

  -- Devolver la ruta de la imagen para eliminarla de Storage.
  return v_offer.image_path;
end;
$$;

-- Proteger la función.
revoke all on function public.delete_my_offer(uuid)
from public, anon, authenticated;

grant execute on function public.delete_my_offer(uuid)
to authenticated;

notify pgrst, 'reload schema';

commit;
