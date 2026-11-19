
begin;

-- 1. Agregar dirección física al negocio.
alter table public.businesses
add column if not exists address text;

-- 2. Validar la longitud sin afectar los negocios existentes.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_address_length_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
    add constraint businesses_address_length_check
    check (
      address is null
      or char_length(trim(address)) between 5 and 200
    );
  end if;
end;
$$;

comment on column public.businesses.address is
'Dirección física privada del establecimiento comercial.';

-- 3. No conceder lectura directa de la dirección.
revoke select (address)
on table public.businesses
from public, anon, authenticated;

-- 4. Retirar la función anterior que no exigía dirección.
drop function if exists public.save_business_profile(
  text, text, text, text, text, text
);

-- 5. Crear la nueva función que exige dirección.
create or replace function public.save_business_profile(
  p_contact_name text,
  p_name text,
  p_city text,
  p_sector text,
  p_phone text,
  p_address text,
  p_description text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_business public.businesses%rowtype;
  v_description text := coalesce(trim(p_description), '');
  v_address text := coalesce(trim(p_address), '');
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '28000';
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is distinct from 'comercio' then
    raise exception 'Solo los comercios pueden configurar este perfil.'
      using errcode = '42501';
  end if;

  if p_contact_name is null
    or char_length(trim(p_contact_name)) not between 1 and 100 then
    raise exception 'El nombre de contacto no es válido.'
      using errcode = '22023';
  end if;

  if p_name is null
    or char_length(trim(p_name)) not between 2 and 80 then
    raise exception 'El nombre comercial debe tener entre 2 y 80 caracteres.'
      using errcode = '22023';
  end if;

  if p_city is null
    or char_length(trim(p_city)) not between 1 and 80 then
    raise exception 'Ingresa una ciudad válida.'
      using errcode = '22023';
  end if;

  if p_sector is null
    or char_length(trim(p_sector)) not between 1 and 80 then
    raise exception 'Ingresa un barrio o sector válido.'
      using errcode = '22023';
  end if;

  if char_length(v_address) not between 5 and 200 then
    raise exception 'La dirección debe tener entre 5 y 200 caracteres.'
      using errcode = '22023';
  end if;

  if p_phone is null or p_phone !~ '^[0-9]{7,15}$' then
    raise exception 'El teléfono debe tener entre 7 y 15 dígitos.'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 500 then
    raise exception 'La descripción no puede superar los 500 caracteres.'
      using errcode = '22023';
  end if;

  insert into public.businesses (
    owner_id,
    name,
    city,
    sector,
    address,
    description
  )
  values (
    v_user_id,
    trim(p_name),
    trim(p_city),
    trim(p_sector),
    v_address,
    v_description
  )
  on conflict (owner_id)
  do update set
    name = excluded.name,
    city = excluded.city,
    sector = excluded.sector,
    address = excluded.address,
    description = excluded.description,
    updated_at = now()
  where public.businesses.status = 'habilitado'
  returning * into v_business;

  if not found then
    raise exception 'La cuenta está suspendida y no puede modificar su perfil.'
      using errcode = '42501';
  end if;

  update public.profiles
  set contact_name = trim(p_contact_name)
  where id = v_user_id;

  insert into public.business_contacts (business_id, phone)
  values (v_business.id, p_phone)
  on conflict (business_id)
  do update set
    phone = excluded.phone,
    updated_at = now();

  return jsonb_build_object(
    'id', v_business.id,
    'name', v_business.name,
    'city', v_business.city,
    'sector', v_business.sector,
    'address', v_business.address,
    'description', v_business.description,
    'status', v_business.status,
    'created_at', v_business.created_at,
    'updated_at', v_business.updated_at
  );
end;
$$;

revoke all on function public.save_business_profile(
  text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.save_business_profile(
  text, text, text, text, text, text, text
) to authenticated;

-- 6. Consulta privada de la dirección del propietario.
create or replace function public.mi_direccion_negocio()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select b.address
  from public.businesses b
  where b.owner_id = auth.uid()
  limit 1;
$$;

revoke all on function public.mi_direccion_negocio()
from public, anon, authenticated;

grant execute on function public.mi_direccion_negocio()
to authenticated;

-- 7. Consulta de la dirección de la contraparte.
-- Solo disponible para participantes de acuerdos aceptados.
create or replace function public.direccion_contraparte(
  p_request_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select b.address
  from public.requests r
  join public.businesses b
    on b.owner_id = case
      when auth.uid() = r.buyer_id then r.seller_id
      else r.buyer_id
    end
  where r.id = p_request_id
    and auth.uid() in (r.buyer_id, r.seller_id)
    and r.status in ('aceptada', 'despachada', 'recibida')
  limit 1;
$$;

revoke all on function public.direccion_contraparte(uuid)
from public, anon, authenticated;

grant execute on function public.direccion_contraparte(uuid)
to authenticated;

notify pgrst, 'reload schema';

commit;
