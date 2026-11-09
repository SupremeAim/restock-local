
begin;

create or replace function public.update_offer_details(
  p_offer_id uuid,
  p_description text,
  p_unit_price numeric,
  p_image_path text default null,
  p_remove_image boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer public.offers%rowtype;
  v_role text;
  v_new_image_path text;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '28000';
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is distinct from 'comercio' then
    raise exception 'No tienes permiso para editar ofertas.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.businesses
    where owner_id = v_user_id
      and status = 'habilitado'
  ) then
    raise exception 'Tu negocio no está habilitado.'
      using errcode = '42501';
  end if;

  select * into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found or v_offer.seller_id <> v_user_id then
    raise exception 'No encontramos esta publicación.'
      using errcode = '42501';
  end if;

  if v_offer.status = 'archivada' or v_offer.blocked then
    raise exception 'Esta publicación no se puede editar.'
      using errcode = '42501';
  end if;

  if p_description is null
    or char_length(trim(p_description)) not between 10 and 1000 then
    raise exception 'La descripción debe tener entre 10 y 1000 caracteres.'
      using errcode = '22023';
  end if;

  if p_unit_price is null
    or p_unit_price <= 0
    or p_unit_price <> round(p_unit_price, 2) then
    raise exception 'El precio debe ser positivo y tener máximo dos decimales.'
      using errcode = '22023';
  end if;

  if p_remove_image and p_image_path is not null then
    raise exception 'No puedes reemplazar y quitar la imagen al mismo tiempo.'
      using errcode = '22023';
  end if;

  v_new_image_path := v_offer.image_path;

  if p_remove_image then
    v_new_image_path := null;
  elsif p_image_path is not null then
    if split_part(p_image_path, '/', 1) <> v_user_id::text then
      raise exception 'La imagen no pertenece a tu cuenta.'
        using errcode = '42501';
    end if;

    if lower(p_image_path) !~ '\.(jpg|jpeg|png)$' then
      raise exception 'La imagen debe ser JPG o PNG.'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'offer-images'
        and name = p_image_path
    ) then
      raise exception 'No se encontró la imagen cargada.'
        using errcode = '22023';
    end if;

    v_new_image_path := p_image_path;
  end if;

  update public.offers
  set
    description = trim(p_description),
    unit_price = p_unit_price,
    image_path = v_new_image_path,
    updated_at = now()
  where id = p_offer_id;

  return jsonb_build_object(
    'old_image_path',
    case
      when v_offer.image_path is distinct from v_new_image_path
      then v_offer.image_path
      else null
    end,
    'image_path', v_new_image_path
  );
end;
$$;

create or replace function public.pause_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer public.offers%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'comercio'
  ) or not exists (
    select 1
    from public.businesses
    where owner_id = v_user_id
      and status = 'habilitado'
  ) then
    raise exception 'No tienes permiso para realizar esta acción.'
      using errcode = '42501';
  end if;

  select * into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found or v_offer.seller_id <> v_user_id then
    raise exception 'No encontramos esta publicación.'
      using errcode = '42501';
  end if;

  if v_offer.blocked then
    raise exception 'Esta publicación tiene un bloqueo administrativo.'
      using errcode = '42501';
  end if;

  if v_offer.status <> 'activa' or v_offer.qty_available <= 0 then
    raise exception 'Esta publicación no se puede pausar.'
      using errcode = '22023';
  end if;

  update public.offers
  set status = 'pausada', updated_at = now()
  where id = p_offer_id;
end;
$$;

create or replace function public.resume_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer public.offers%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'comercio'
  ) or not exists (
    select 1
    from public.businesses
    where owner_id = v_user_id
      and status = 'habilitado'
  ) then
    raise exception 'No tienes permiso para realizar esta acción.'
      using errcode = '42501';
  end if;

  select * into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found or v_offer.seller_id <> v_user_id then
    raise exception 'No encontramos esta publicación.'
      using errcode = '42501';
  end if;

  if v_offer.blocked then
    raise exception 'Esta publicación tiene un bloqueo administrativo.'
      using errcode = '42501';
  end if;

  if v_offer.status <> 'pausada' then
    raise exception 'Esta publicación no está pausada.'
      using errcode = '22023';
  end if;

  update public.offers
  set
    status = case
      when qty_available = 0 then 'agotada'
      else 'activa'
    end,
    updated_at = now()
  where id = p_offer_id;
end;
$$;

create or replace function public.archive_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer public.offers%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'comercio'
  ) or not exists (
    select 1
    from public.businesses
    where owner_id = v_user_id
      and status = 'habilitado'
  ) then
    raise exception 'No tienes permiso para realizar esta acción.'
      using errcode = '42501';
  end if;

  select * into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found or v_offer.seller_id <> v_user_id then
    raise exception 'No encontramos esta publicación.'
      using errcode = '42501';
  end if;

  if v_offer.blocked then
    raise exception 'Esta publicación tiene un bloqueo administrativo.'
      using errcode = '42501';
  end if;

  if v_offer.status = 'archivada' then
    raise exception 'Esta publicación ya está archivada.'
      using errcode = '22023';
  end if;

  update public.offers
  set status = 'archivada', updated_at = now()
  where id = p_offer_id;
end;
$$;

revoke all on function public.update_offer_details(
  uuid, text, numeric, text, boolean
) from public, anon, authenticated;

revoke all on function public.pause_offer(uuid)
from public, anon, authenticated;

revoke all on function public.resume_offer(uuid)
from public, anon, authenticated;

revoke all on function public.archive_offer(uuid)
from public, anon, authenticated;

grant execute on function public.update_offer_details(
  uuid, text, numeric, text, boolean
) to authenticated;

grant execute on function public.pause_offer(uuid)
to authenticated;

grant execute on function public.resume_offer(uuid)
to authenticated;

grant execute on function public.archive_offer(uuid)
to authenticated;

commit;
