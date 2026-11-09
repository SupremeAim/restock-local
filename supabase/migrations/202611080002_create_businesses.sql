
begin;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name varchar(80) not null,
  city varchar(80) not null,
  sector varchar(80) not null,
  description varchar(500) not null default '',
  status text not null default 'habilitado'
    check (status in ('habilitado', 'suspendido')),
  suspend_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) between 2 and 80),
  check (char_length(trim(city)) between 1 and 80),
  check (char_length(trim(sector)) between 1 and 80),
  check (char_length(description) <= 500)
);

create table if not exists public.business_contacts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  phone varchar(15) not null
    check (phone ~ '^[0-9]{7,15}$'),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_status_idx
on public.businesses(status);

alter table public.businesses enable row level security;
alter table public.business_contacts enable row level security;

revoke all on public.businesses from public, anon, authenticated;
revoke all on public.business_contacts from public, anon, authenticated;

grant select (id, owner_id, name, city, sector, description, status, created_at, updated_at)
on public.businesses to authenticated;

grant select (business_id, phone)
on public.business_contacts to authenticated;

drop policy if exists businesses_read_enabled on public.businesses;
create policy businesses_read_enabled
on public.businesses
for select
to authenticated
using (status = 'habilitado');

drop policy if exists businesses_owner_read on public.businesses;
create policy businesses_owner_read
on public.businesses
for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists businesses_admin_read on public.businesses;
create policy businesses_admin_read
on public.businesses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists business_contacts_owner_read on public.business_contacts;
create policy business_contacts_owner_read
on public.business_contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = business_contacts.business_id
      and b.owner_id = (select auth.uid())
  )
);

create or replace function public.save_business_profile(
  p_contact_name text,
  p_name text,
  p_city text,
  p_sector text,
  p_phone text,
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

  if p_phone is null or p_phone !~ '^[0-9]{7,15}$' then
    raise exception 'El teléfono debe tener entre 7 y 15 dígitos.'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 500 then
    raise exception 'La descripción no puede superar los 500 caracteres.'
      using errcode = '22023';
  end if;

  insert into public.businesses (
    owner_id, name, city, sector, description
  )
  values (
    v_user_id,
    trim(p_name),
    trim(p_city),
    trim(p_sector),
    v_description
  )
  on conflict (owner_id)
  do update set
    name = excluded.name,
    city = excluded.city,
    sector = excluded.sector,
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
    'description', v_business.description,
    'status', v_business.status,
    'created_at', v_business.created_at,
    'updated_at', v_business.updated_at
  );
end;
$$;

revoke all on function public.save_business_profile(
  text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.save_business_profile(
  text, text, text, text, text, text
) to authenticated;

commit;
