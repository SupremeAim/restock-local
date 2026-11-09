begin;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  city text not null check (char_length(trim(city)) between 2 and 60),
  sector text check (sector is null or char_length(sector) <= 80),
  description text check (description is null or char_length(description) <= 500),
  status text not null default 'habilitado' check (status in ('habilitado', 'suspendido')),
  suspend_reason text check (suspend_reason is null or char_length(suspend_reason) <= 500),
  show_in_network boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_contacts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  phone text not null check (phone ~ '^[0-9]{7,15}$')
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 100),
  description text not null check (char_length(trim(description)) between 10 and 1000),
  category text not null check (char_length(category) between 2 and 60),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  min_purchase integer not null check (min_purchase >= 1),
  qty_available integer not null check (qty_available >= 0),
  qty_reserved integer not null default 0 check (qty_reserved >= 0),
  qty_delivered integer not null default 0 check (qty_delivered >= 0),
  image_path text,
  status text not null default 'activa'
    check (status in ('activa', 'pausada', 'agotada', 'archivada')),
  blocked boolean not null default false,
  block_reason text check (block_reason is null or char_length(block_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_catalogo on public.offers (status, blocked, qty_available desc);
create index offers_vendedor on public.offers (seller_id, status);

create function public.rl_fallar(p_codigo text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_codigo;
end;
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.rl_usuario_habilitado(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where b.owner_id = p_usuario
      and b.status = 'habilitado'
      and p.role = 'comercio'
  );
$$;

create function public.rl_exigir_habilitado(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_usuario is null then
    perform public.rl_fallar('sin_sesion');
  end if;

  if not exists (select 1 from public.businesses where owner_id = p_usuario) then
    perform public.rl_fallar('negocio_no_configurado');
  end if;

  if not public.rl_usuario_habilitado(p_usuario) then
    perform public.rl_fallar('cuenta_suspendida');
  end if;
end;
$$;

create function public.rl_marcar_actualizacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger businesses_actualizado
before update on public.businesses
for each row execute function public.rl_marcar_actualizacion();

create trigger offers_actualizado
before update on public.offers
for each row execute function public.rl_marcar_actualizacion();

create function public.rl_validar_estado_oferta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or new.status = old.status then
    return new;
  end if;

  if old.status = 'activa' and new.status = 'pausada' then
    return new;
  end if;

  if old.status = 'pausada' and new.status = 'activa' then
    if new.qty_available = 0 then
      new.status := 'agotada';
    end if;
    return new;
  end if;

  if old.status in ('activa', 'pausada', 'agotada') and new.status = 'archivada' then
    return new;
  end if;

  perform public.rl_fallar('cambio_estado_invalido');
  return null;
end;
$$;

create trigger offers_validar_estado
before update of status on public.offers
for each row execute function public.rl_validar_estado_oferta();

alter table public.businesses enable row level security;
alter table public.business_contacts enable row level security;
alter table public.offers enable row level security;

revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.business_contacts from public, anon, authenticated;
revoke all on table public.offers from public, anon, authenticated;

grant select on table public.businesses to authenticated;
grant insert (owner_id, name, city, sector, description, show_in_network)
  on table public.businesses to authenticated;
grant update (name, city, sector, description, show_in_network)
  on table public.businesses to authenticated;

grant select on table public.business_contacts to authenticated;
grant insert (business_id, phone) on table public.business_contacts to authenticated;
grant update (phone) on table public.business_contacts to authenticated;

grant select on table public.offers to authenticated;
grant insert (seller_id, title, description, category, unit_price, min_purchase, qty_available, image_path)
  on table public.offers to authenticated;
grant update (description, image_path, unit_price, status)
  on table public.offers to authenticated;

create policy businesses_select_comercios
on public.businesses
for select
to authenticated
using (true);

create policy businesses_insert_propio
on public.businesses
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'comercio'
  )
);

create policy businesses_update_propio
on public.businesses
for update
to authenticated
using (owner_id = (select auth.uid()) and status = 'habilitado')
with check (owner_id = (select auth.uid()));

create policy business_contacts_select_propio
on public.business_contacts
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  )
);

create policy business_contacts_insert_propio
on public.business_contacts
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  )
);

create policy business_contacts_update_propio
on public.business_contacts
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id
      and b.owner_id = (select auth.uid())
      and b.status = 'habilitado'
  )
);

create policy offers_select_catalogo
on public.offers
for select
to authenticated
using (
  status = 'activa'
  and not blocked
  and qty_available > 0
  and public.rl_usuario_habilitado(seller_id)
);

create policy offers_select_propias
on public.offers
for select
to authenticated
using (seller_id = (select auth.uid()));

create policy offers_select_admin
on public.offers
for select
to authenticated
using (public.es_admin());

create policy offers_insert_propia
on public.offers
for insert
to authenticated
with check (
  seller_id = (select auth.uid())
  and public.rl_usuario_habilitado((select auth.uid()))
  and min_purchase <= qty_available
  and qty_available > 0
);

create policy offers_update_propia
on public.offers
for update
to authenticated
using (seller_id = (select auth.uid()) and public.rl_usuario_habilitado((select auth.uid())))
with check (seller_id = (select auth.uid()));

revoke all on function public.rl_fallar(text) from public, anon;
grant execute on function public.rl_fallar(text) to authenticated;
revoke all on function public.rl_exigir_habilitado(uuid) from public, anon, authenticated;
revoke all on function public.rl_marcar_actualizacion() from public, anon, authenticated;
revoke all on function public.rl_validar_estado_oferta() from public, anon, authenticated;
revoke all on function public.rl_usuario_habilitado(uuid) from public, anon;
revoke all on function public.es_admin() from public, anon;
grant execute on function public.rl_usuario_habilitado(uuid) to authenticated;
grant execute on function public.es_admin() to authenticated;

commit;
