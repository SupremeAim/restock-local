
begin;

-- =========================================================
-- 1. AUDITORIA DE ACCIONES ADMINISTRATIVAS
-- =========================================================

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),

  admin_id uuid not null
    references public.profiles(id) on delete restrict,

  target_type text not null
    check (target_type in ('comercio', 'publicacion')),

  target_id uuid not null,

  action text not null
    check (action in (
      'suspender_comercio',
      'rehabilitar_comercio',
      'bloquear_publicacion',
      'desbloquear_publicacion'
    )),

  reason text not null,

  created_at timestamptz not null default now(),

  constraint admin_actions_reason_check
    check (char_length(trim(reason)) between 5 and 500),

  constraint admin_actions_target_check
    check (
      (
        target_type = 'comercio'
        and action in (
          'suspender_comercio',
          'rehabilitar_comercio'
        )
      )
      or
      (
        target_type = 'publicacion'
        and action in (
          'bloquear_publicacion',
          'desbloquear_publicacion'
        )
      )
    )
);

create index if not exists admin_actions_target_idx
on public.admin_actions(target_type, target_id, created_at desc);

create index if not exists admin_actions_admin_idx
on public.admin_actions(admin_id, created_at desc);

alter table public.admin_actions enable row level security;

revoke all on public.admin_actions
from public, anon, authenticated;

grant select on public.admin_actions to authenticated;

drop policy if exists admin_actions_admin_read
on public.admin_actions;

create policy admin_actions_admin_read
on public.admin_actions
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


-- =========================================================
-- 2. FUNCION PARA COMPROBAR SI MI CUENTA ESTA HABILITADA
-- =========================================================

create or replace function public.rl_mi_cuenta_habilitada()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.rl_usuario_habilitado(auth.uid()),
    false
  );
$$;

revoke all on function public.rl_mi_cuenta_habilitada()
from public, anon, authenticated;

grant execute on function public.rl_mi_cuenta_habilitada()
to authenticated;


-- =========================================================
-- 3. VALIDACION CENTRAL DEL ADMINISTRADOR
-- =========================================================

create or replace function public.rl_exigir_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null then
    raise exception using
      errcode = '28000',
      message = 'sin_sesion';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_admin_id
      and p.role = 'admin'
  ) then
    raise exception using
      errcode = '42501',
      message = 'sin_permiso';
  end if;

  return v_admin_id;
end;
$$;

revoke all on function public.rl_exigir_admin()
from public, anon, authenticated;


-- =========================================================
-- 4. PROTEGER SOLICITUDES E HISTORIALES
-- =========================================================

drop policy if exists requests_select_participantes
on public.requests;

create policy requests_select_participantes
on public.requests
for select
to authenticated
using (
  (select auth.uid()) in (buyer_id, seller_id)
  and (select public.rl_mi_cuenta_habilitada())
);

drop policy if exists request_events_select_participantes
on public.request_events;

create policy request_events_select_participantes
on public.request_events
for select
to authenticated
using (
  (select public.rl_mi_cuenta_habilitada())
  and exists (
    select 1
    from public.requests r
    where r.id = request_events.request_id
      and (select auth.uid()) in (r.buyer_id, r.seller_id)
  )
);


-- =========================================================
-- 5. PROTEGER LA LECTURA DE PUBLICACIONES PROPIAS
-- =========================================================

drop policy if exists offers_owner_read
on public.offers;

create policy offers_owner_read
on public.offers
for select
to authenticated
using (
  seller_id = (select auth.uid())
  and (select public.rl_mi_cuenta_habilitada())
);


-- =========================================================
-- 6. ACTUALIZAR CONSULTA DEL TELEFONO DE LA CONTRAPARTE
-- =========================================================

create or replace function public.telefono_contraparte(
  p_request_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.phone
  from public.requests r
  join public.businesses b
    on b.owner_id = case
      when auth.uid() = r.buyer_id then r.seller_id
      else r.buyer_id
    end
  join public.business_contacts c
    on c.business_id = b.id
  where r.id = p_request_id
    and auth.uid() in (r.buyer_id, r.seller_id)
    and public.rl_mi_cuenta_habilitada()
    and r.status in ('aceptada', 'despachada', 'recibida')
  limit 1;
$$;


-- =========================================================
-- 7. ACTUALIZAR LISTADO DE SOLICITUDES
-- =========================================================

create or replace function public.listar_solicitudes(p_tipo text)
returns table (
  id uuid,
  offer_id uuid,
  buyer_id uuid,
  seller_id uuid,
  status text,
  current_qty integer,
  current_price numeric,
  current_author_id uuid,
  version integer,
  cancel_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  offer_title text,
  offer_unit_price numeric,
  counterpart_name text,
  counterpart_city text,
  comentario text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.offer_id,
    r.buyer_id,
    r.seller_id,
    r.status,
    r.current_qty,
    r.current_price,
    r.current_author_id,
    r.version,
    r.cancel_reason,
    r.created_at,
    r.updated_at,
    o.title::text,
    o.unit_price,
    b.name::text,
    b.city::text,
    (
      select e.note
      from public.request_events e
      where e.request_id = r.id
        and e.seq = 1
    )
  from public.requests r
  join public.offers o
    on o.id = r.offer_id
  join public.businesses b
    on b.owner_id = case
      when p_tipo = 'recibidas' then r.buyer_id
      else r.seller_id
    end
  where (
    (p_tipo = 'recibidas' and r.seller_id = auth.uid())
    or
    (p_tipo = 'enviadas' and r.buyer_id = auth.uid())
  )
  and public.rl_mi_cuenta_habilitada()
  order by r.created_at desc, r.id;
$$;


-- =========================================================
-- 8. ACTUALIZAR DETALLE DE SOLICITUD
-- =========================================================

create or replace function public.detalle_solicitud(
  p_request_id uuid
)
returns table (
  id uuid,
  offer_id uuid,
  buyer_id uuid,
  seller_id uuid,
  status text,
  current_qty integer,
  current_price numeric,
  current_author_id uuid,
  version integer,
  cancel_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  offer_title text,
  offer_description text,
  offer_unit_price numeric,
  offer_min_purchase integer,
  offer_qty_available integer,
  offer_qty_reserved integer,
  offer_qty_delivered integer,
  offer_status text,
  offer_blocked boolean,
  offer_image_path text,
  buyer_name text,
  buyer_city text,
  buyer_sector text,
  seller_name text,
  seller_city text,
  seller_sector text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.offer_id,
    r.buyer_id,
    r.seller_id,
    r.status,
    r.current_qty,
    r.current_price,
    r.current_author_id,
    r.version,
    r.cancel_reason,
    r.created_at,
    r.updated_at,
    o.title::text,
    o.description::text,
    o.unit_price,
    o.min_purchase,
    o.qty_available,
    case when auth.uid() = r.seller_id
      then o.qty_reserved end,
    case when auth.uid() = r.seller_id
      then o.qty_delivered end,
    o.status,
    o.blocked,
    o.image_path,
    bc.name::text,
    bc.city::text,
    bc.sector::text,
    bv.name::text,
    bv.city::text,
    bv.sector::text
  from public.requests r
  join public.offers o
    on o.id = r.offer_id
  join public.businesses bc
    on bc.owner_id = r.buyer_id
  join public.businesses bv
    on bv.owner_id = r.seller_id
  where r.id = p_request_id
    and auth.uid() in (r.buyer_id, r.seller_id)
    and public.rl_mi_cuenta_habilitada();
$$;


-- =========================================================
-- 9. LISTAR COMERCIOS PARA EL ADMINISTRADOR
-- =========================================================

create or replace function public.admin_list_businesses(
  p_search text default null,
  p_status text default 'todos'
)
returns table (
  business_id uuid,
  owner_id uuid,
  business_name text,
  city text,
  sector text,
  description text,
  status text,
  suspend_reason text,
  contact_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.rl_exigir_admin();

  if coalesce(p_status, 'todos')
    not in ('todos', 'habilitado', 'suspendido') then
    raise exception using
      errcode = '22023',
      message = 'estado_comercio_invalido';
  end if;

  return query
  select
    b.id,
    b.owner_id,
    b.name::text,
    b.city::text,
    b.sector::text,
    b.description::text,
    b.status::text,
    b.suspend_reason::text,
    p.contact_name::text,
    b.created_at,
    b.updated_at
  from public.businesses b
  join public.profiles p
    on p.id = b.owner_id
  where (
    coalesce(p_status, 'todos') = 'todos'
    or b.status = p_status
  )
  and (
    nullif(trim(coalesce(p_search, '')), '') is null
    or b.name ilike '%' || trim(p_search) || '%'
  )
  order by b.created_at desc, b.name asc;
end;
$$;


-- =========================================================
-- 10. LISTAR PUBLICACIONES PARA EL ADMINISTRADOR
-- =========================================================

create or replace function public.admin_list_offers(
  p_search text default null,
  p_status text default 'todos',
  p_blocked boolean default null
)
returns table (
  offer_id uuid,
  seller_id uuid,
  seller_name text,
  seller_city text,
  title text,
  category text,
  unit_price numeric,
  min_purchase integer,
  qty_available integer,
  qty_reserved integer,
  qty_delivered integer,
  status text,
  blocked boolean,
  block_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.rl_exigir_admin();

  if coalesce(p_status, 'todos') not in (
    'todos', 'activa', 'pausada', 'agotada', 'archivada'
  ) then
    raise exception using
      errcode = '22023',
      message = 'estado_publicacion_invalido';
  end if;

  return query
  select
    o.id,
    o.seller_id,
    b.name::text,
    b.city::text,
    o.title::text,
    o.category::text,
    o.unit_price,
    o.min_purchase,
    o.qty_available,
    o.qty_reserved,
    o.qty_delivered,
    o.status::text,
    o.blocked,
    o.block_reason::text,
    o.created_at,
    o.updated_at
  from public.offers o
  join public.businesses b
    on b.owner_id = o.seller_id
  where (
    coalesce(p_status, 'todos') = 'todos'
    or o.status = p_status
  )
  and (
    p_blocked is null
    or o.blocked = p_blocked
  )
  and (
    nullif(trim(coalesce(p_search, '')), '') is null
    or o.title ilike '%' || trim(p_search) || '%'
    or o.category ilike '%' || trim(p_search) || '%'
    or b.name ilike '%' || trim(p_search) || '%'
    or b.city ilike '%' || trim(p_search) || '%'
  )
  order by o.created_at desc, o.id;
end;
$$;


-- =========================================================
-- 11. CONSULTAR HISTORIAL DE ACCIONES ADMINISTRATIVAS
-- =========================================================

create or replace function public.admin_list_actions(
  p_target_type text default 'todos',
  p_target_id uuid default null
)
returns table (
  action_id uuid,
  admin_id uuid,
  admin_name text,
  target_type text,
  target_id uuid,
  action text,
  reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.rl_exigir_admin();

  if coalesce(p_target_type, 'todos')
    not in ('todos', 'comercio', 'publicacion') then
    raise exception using
      errcode = '22023',
      message = 'tipo_objetivo_invalido';
  end if;

  return query
  select
    aa.id,
    aa.admin_id,
    p.contact_name::text,
    aa.target_type::text,
    aa.target_id,
    aa.action::text,
    aa.reason::text,
    aa.created_at
  from public.admin_actions aa
  join public.profiles p
    on p.id = aa.admin_id
  where (
    coalesce(p_target_type, 'todos') = 'todos'
    or aa.target_type = p_target_type
  )
  and (
    p_target_id is null
    or aa.target_id = p_target_id
  )
  order by aa.created_at desc, aa.id desc;
end;
$$;


-- =========================================================
-- 12. SUSPENDER COMERCIO
-- =========================================================

create or replace function public.admin_suspend_business(
  p_business_id uuid,
  p_reason text
)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_business public.businesses;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  v_admin_id := public.rl_exigir_admin();

  if p_business_id is null then
    raise exception using
      errcode = '22023',
      message = 'comercio_invalido';
  end if;

  if char_length(v_reason) not between 5 and 500 then
    raise exception using
      errcode = '22023',
      message = 'motivo_invalido';
  end if;

  select *
  into v_business
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'comercio_no_encontrado';
  end if;

  if v_business.status = 'suspendido' then
    raise exception using
      errcode = 'P0001',
      message = 'comercio_ya_suspendido';
  end if;

  update public.businesses
  set
    status = 'suspendido',
    suspend_reason = v_reason,
    updated_at = now()
  where id = p_business_id
  returning * into v_business;

  insert into public.admin_actions (
    admin_id,
    target_type,
    target_id,
    action,
    reason
  )
  values (
    v_admin_id,
    'comercio',
    p_business_id,
    'suspender_comercio',
    v_reason
  );

  return v_business;
end;
$$;


-- =========================================================
-- 13. REHABILITAR COMERCIO
-- =========================================================

create or replace function public.admin_reactivate_business(
  p_business_id uuid,
  p_reason text
)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_business public.businesses;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  v_admin_id := public.rl_exigir_admin();

  if p_business_id is null then
    raise exception using
      errcode = '22023',
      message = 'comercio_invalido';
  end if;

  if char_length(v_reason) not between 5 and 500 then
    raise exception using
      errcode = '22023',
      message = 'motivo_invalido';
  end if;

  select *
  into v_business
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'comercio_no_encontrado';
  end if;

  if v_business.status <> 'suspendido' then
    raise exception using
      errcode = 'P0001',
      message = 'comercio_no_suspendido';
  end if;

  update public.businesses
  set
    status = 'habilitado',
    suspend_reason = null,
    updated_at = now()
  where id = p_business_id
  returning * into v_business;

  insert into public.admin_actions (
    admin_id,
    target_type,
    target_id,
    action,
    reason
  )
  values (
    v_admin_id,
    'comercio',
    p_business_id,
    'rehabilitar_comercio',
    v_reason
  );

  return v_business;
end;
$$;


-- =========================================================
-- 14. BLOQUEAR PUBLICACION
-- =========================================================

create or replace function public.admin_block_offer(
  p_offer_id uuid,
  p_reason text
)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_offer public.offers;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  v_admin_id := public.rl_exigir_admin();

  if p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'publicacion_invalida';
  end if;

  if char_length(v_reason) not between 5 and 500 then
    raise exception using
      errcode = '22023',
      message = 'motivo_invalido';
  end if;

  select *
  into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'publicacion_no_encontrada';
  end if;

  if v_offer.blocked then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_ya_bloqueada';
  end if;

  -- El bloqueo no modifica el estado operativo ni las cantidades.

  update public.offers
  set
    blocked = true,
    block_reason = v_reason,
    updated_at = now()
  where id = p_offer_id
  returning * into v_offer;

  insert into public.admin_actions (
    admin_id,
    target_type,
    target_id,
    action,
    reason
  )
  values (
    v_admin_id,
    'publicacion',
    p_offer_id,
    'bloquear_publicacion',
    v_reason
  );

  return v_offer;
end;
$$;


-- =========================================================
-- 15. DESBLOQUEAR PUBLICACION
-- =========================================================

create or replace function public.admin_unblock_offer(
  p_offer_id uuid,
  p_reason text
)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_offer public.offers;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  v_admin_id := public.rl_exigir_admin();

  if p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'publicacion_invalida';
  end if;

  if char_length(v_reason) not between 5 and 500 then
    raise exception using
      errcode = '22023',
      message = 'motivo_invalido';
  end if;

  select *
  into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'publicacion_no_encontrada';
  end if;

  if not v_offer.blocked then
    raise exception using
      errcode = 'P0001',
      message = 'publicacion_no_bloqueada';
  end if;

  -- Se conserva el estado operativo anterior.

  update public.offers
  set
    blocked = false,
    block_reason = null,
    updated_at = now()
  where id = p_offer_id
  returning * into v_offer;

  insert into public.admin_actions (
    admin_id,
    target_type,
    target_id,
    action,
    reason
  )
  values (
    v_admin_id,
    'publicacion',
    p_offer_id,
    'desbloquear_publicacion',
    v_reason
  );

  return v_offer;
end;
$$;


-- =========================================================
-- 16. PERMISOS DE LAS FUNCIONES
-- =========================================================

revoke all on function public.telefono_contraparte(uuid)
from public, anon;

revoke all on function public.listar_solicitudes(text)
from public, anon;

revoke all on function public.detalle_solicitud(uuid)
from public, anon;

grant execute on function public.telefono_contraparte(uuid)
to authenticated;

grant execute on function public.listar_solicitudes(text)
to authenticated;

grant execute on function public.detalle_solicitud(uuid)
to authenticated;


revoke all on function public.admin_list_businesses(text, text)
from public, anon, authenticated;

revoke all on function public.admin_list_offers(text, text, boolean)
from public, anon, authenticated;

revoke all on function public.admin_list_actions(text, uuid)
from public, anon, authenticated;

revoke all on function public.admin_suspend_business(uuid, text)
from public, anon, authenticated;

revoke all on function public.admin_reactivate_business(uuid, text)
from public, anon, authenticated;

revoke all on function public.admin_block_offer(uuid, text)
from public, anon, authenticated;

revoke all on function public.admin_unblock_offer(uuid, text)
from public, anon, authenticated;


grant execute on function public.admin_list_businesses(text, text)
to authenticated;

grant execute on function public.admin_list_offers(text, text, boolean)
to authenticated;

grant execute on function public.admin_list_actions(text, uuid)
to authenticated;

grant execute on function public.admin_suspend_business(uuid, text)
to authenticated;

grant execute on function public.admin_reactivate_business(uuid, text)
to authenticated;

grant execute on function public.admin_block_offer(uuid, text)
to authenticated;

grant execute on function public.admin_unblock_offer(uuid, text)
to authenticated;


commit;
