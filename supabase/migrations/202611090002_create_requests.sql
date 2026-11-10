begin;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  status text not null default 'pendiente'
    check (status in (
      'pendiente', 'en_negociacion', 'aceptada', 'despachada',
      'recibida', 'rechazada', 'cancelada'
    )),
  current_qty integer not null check (current_qty > 0),
  current_price numeric(12, 2) not null check (current_price > 0),
  current_author_id uuid not null references public.profiles(id),
  version integer not null default 1 check (version > 0),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  check (current_author_id in (buyer_id, seller_id))
);

create unique index requests_una_abierta_por_oferta
on public.requests (offer_id, buyer_id)
where status in ('pendiente', 'en_negociacion', 'aceptada', 'despachada');

create index requests_cola_vendedor
on public.requests (seller_id, status, created_at, id);

create index requests_comprador
on public.requests (buyer_id, created_at desc);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  seq integer not null check (seq > 0),
  actor_id uuid not null references public.profiles(id),
  type text not null
    check (type in (
      'creada', 'revision_iniciada', 'contrapropuesta', 'aceptada',
      'rechazada', 'cancelada', 'despachada', 'recibida'
    )),
  qty integer check (qty is null or qty > 0),
  price numeric(12, 2) check (price is null or price > 0),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (request_id, seq)
);

alter table public.requests enable row level security;
alter table public.request_events enable row level security;

revoke all on table public.requests from public, anon, authenticated;
revoke all on table public.request_events from public, anon, authenticated;
grant select on table public.requests to authenticated;
grant select on table public.request_events to authenticated;

create policy requests_select_participantes
on public.requests
for select
to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));

create policy request_events_select_participantes
on public.request_events
for select
to authenticated
using (
  exists (
    select 1
    from public.requests r
    where r.id = request_id
      and (select auth.uid()) in (r.buyer_id, r.seller_id)
  )
);

create function public.rl_fallar(p_codigo text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_codigo;
end;
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

create function public.rl_validar_terminos(p_qty integer, p_price numeric, p_note text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_qty is null or p_qty <= 0 then
    perform public.rl_fallar('cantidad_invalida');
  end if;

  if p_price is null or p_price <= 0 or p_price <> round(p_price, 2) then
    perform public.rl_fallar('precio_invalido');
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    perform public.rl_fallar('nota_muy_larga');
  end if;
end;
$$;

create function public.rl_bloquear_solicitud(p_request_id uuid, p_version integer)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
begin
  select * into v_solicitud
  from public.requests
  where id = p_request_id
  for update;

  if not found or auth.uid() not in (v_solicitud.buyer_id, v_solicitud.seller_id) then
    perform public.rl_fallar('solicitud_no_encontrada');
  end if;

  if p_version is null or v_solicitud.version <> p_version then
    perform public.rl_fallar('version_desactualizada');
  end if;

  return v_solicitud;
end;
$$;

create function public.rl_registrar_evento(
  p_request_id uuid,
  p_type text,
  p_qty integer default null,
  p_price numeric default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.request_events (request_id, seq, actor_id, type, qty, price, note)
  values (
    p_request_id,
    coalesce((select max(seq) from public.request_events where request_id = p_request_id), 0) + 1,
    auth.uid(),
    p_type,
    p_qty,
    p_price,
    nullif(trim(p_note), '')
  );
end;
$$;

create function public.crear_solicitud(
  p_offer_id uuid,
  p_qty integer,
  p_price numeric,
  p_note text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_oferta public.offers;
  v_solicitud public.requests;
begin
  perform public.rl_exigir_habilitado(v_usuario);
  perform public.rl_validar_terminos(p_qty, p_price, p_note);

  select * into v_oferta
  from public.offers
  where id = p_offer_id
  for share;

  if not found then
    perform public.rl_fallar('oferta_no_disponible');
  end if;

  if v_oferta.seller_id = v_usuario then
    perform public.rl_fallar('oferta_propia');
  end if;

  if v_oferta.status <> 'activa' or v_oferta.blocked
    or not public.rl_usuario_habilitado(v_oferta.seller_id) then
    perform public.rl_fallar('oferta_no_disponible');
  end if;

  if p_qty < v_oferta.min_purchase or p_qty > v_oferta.qty_available then
    perform public.rl_fallar('cantidad_fuera_de_rango');
  end if;

  begin
    insert into public.requests (
      offer_id, buyer_id, seller_id, status,
      current_qty, current_price, current_author_id
    )
    values (
      v_oferta.id, v_usuario, v_oferta.seller_id, 'pendiente',
      p_qty, p_price, v_usuario
    )
    returning * into v_solicitud;
  exception
    when unique_violation then
      perform public.rl_fallar('solicitud_abierta_existente');
  end;

  perform public.rl_registrar_evento(v_solicitud.id, 'creada', p_qty, p_price, p_note);

  return v_solicitud;
end;
$$;

create function public.iniciar_revision(p_request_id uuid, p_version integer)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());

  if auth.uid() <> v_solicitud.seller_id then
    perform public.rl_fallar('sin_permiso');
  end if;

  if v_solicitud.status <> 'pendiente' then
    perform public.rl_fallar('estado_invalido');
  end if;

  update public.requests
  set status = 'en_negociacion', version = version + 1, updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(p_request_id, 'revision_iniciada');

  return v_solicitud;
end;
$$;

create function public.contraproponer(
  p_request_id uuid,
  p_version integer,
  p_qty integer,
  p_price numeric,
  p_note text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
  v_oferta public.offers;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());
  perform public.rl_validar_terminos(p_qty, p_price, p_note);

  if v_solicitud.status <> 'en_negociacion' then
    perform public.rl_fallar('estado_invalido');
  end if;

  if auth.uid() = v_solicitud.current_author_id then
    perform public.rl_fallar('no_es_tu_turno');
  end if;

  select * into v_oferta
  from public.offers
  where id = v_solicitud.offer_id
  for share;

  if v_oferta.status <> 'activa' or v_oferta.blocked
    or not public.rl_usuario_habilitado(v_solicitud.buyer_id)
    or not public.rl_usuario_habilitado(v_solicitud.seller_id) then
    perform public.rl_fallar('oferta_no_disponible');
  end if;

  if p_qty < v_oferta.min_purchase or p_qty > v_oferta.qty_available then
    perform public.rl_fallar('cantidad_fuera_de_rango');
  end if;

  update public.requests
  set current_qty = p_qty,
      current_price = p_price,
      current_author_id = auth.uid(),
      version = version + 1,
      updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(p_request_id, 'contrapropuesta', p_qty, p_price, p_note);

  return v_solicitud;
end;
$$;

create function public.aceptar_propuesta(p_request_id uuid, p_version integer)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
  v_oferta public.offers;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());

  if v_solicitud.status <> 'en_negociacion' then
    perform public.rl_fallar('estado_invalido');
  end if;

  if auth.uid() = v_solicitud.current_author_id then
    perform public.rl_fallar('no_es_tu_turno');
  end if;

  select * into v_oferta
  from public.offers
  where id = v_solicitud.offer_id
  for update;

  if v_oferta.status not in ('activa', 'agotada') or v_oferta.blocked
    or not public.rl_usuario_habilitado(v_solicitud.buyer_id)
    or not public.rl_usuario_habilitado(v_solicitud.seller_id) then
    perform public.rl_fallar('oferta_no_disponible');
  end if;

  if v_oferta.qty_available < v_solicitud.current_qty then
    perform public.rl_fallar('disponibilidad_insuficiente');
  end if;

  update public.offers
  set qty_available = qty_available - v_solicitud.current_qty,
      qty_reserved = qty_reserved + v_solicitud.current_qty,
      status = case
        when qty_available - v_solicitud.current_qty = 0 then 'agotada'
        else status
      end
  where id = v_oferta.id;

  update public.requests
  set status = 'aceptada', version = version + 1, updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(
    p_request_id, 'aceptada', v_solicitud.current_qty, v_solicitud.current_price
  );

  return v_solicitud;
end;
$$;

create function public.rechazar_solicitud(
  p_request_id uuid,
  p_version integer,
  p_note text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());
  perform public.rl_validar_terminos(1, 1, p_note);

  if auth.uid() <> v_solicitud.seller_id then
    perform public.rl_fallar('sin_permiso');
  end if;

  if v_solicitud.status not in ('pendiente', 'en_negociacion') then
    perform public.rl_fallar('estado_invalido');
  end if;

  update public.requests
  set status = 'rechazada', version = version + 1, updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(p_request_id, 'rechazada', null, null, p_note);

  return v_solicitud;
end;
$$;

create function public.cancelar_solicitud(
  p_request_id uuid,
  p_version integer,
  p_note text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());
  perform public.rl_validar_terminos(1, 1, p_note);

  if auth.uid() <> v_solicitud.buyer_id then
    perform public.rl_fallar('sin_permiso');
  end if;

  if v_solicitud.status not in ('pendiente', 'en_negociacion') then
    perform public.rl_fallar('estado_invalido');
  end if;

  update public.requests
  set status = 'cancelada', version = version + 1, updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(p_request_id, 'cancelada', null, null, p_note);

  return v_solicitud;
end;
$$;

create function public.cancelar_acuerdo(
  p_request_id uuid,
  p_version integer,
  p_reason text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
  v_motivo text := trim(coalesce(p_reason, ''));
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());

  if char_length(v_motivo) < 5 or char_length(v_motivo) > 500 then
    perform public.rl_fallar('motivo_invalido');
  end if;

  if v_solicitud.status <> 'aceptada' then
    perform public.rl_fallar('estado_invalido');
  end if;

  perform 1 from public.offers where id = v_solicitud.offer_id for update;

  update public.offers
  set qty_available = qty_available + v_solicitud.current_qty,
      qty_reserved = qty_reserved - v_solicitud.current_qty,
      status = case when status = 'agotada' then 'activa' else status end
  where id = v_solicitud.offer_id;

  update public.requests
  set status = 'cancelada',
      cancel_reason = v_motivo,
      version = version + 1,
      updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(
    p_request_id, 'cancelada', v_solicitud.current_qty, null, v_motivo
  );

  return v_solicitud;
end;
$$;

create function public.despachar_acuerdo(
  p_request_id uuid,
  p_version integer,
  p_note text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());
  perform public.rl_validar_terminos(1, 1, p_note);

  if auth.uid() <> v_solicitud.seller_id then
    perform public.rl_fallar('sin_permiso');
  end if;

  if v_solicitud.status <> 'aceptada' then
    perform public.rl_fallar('estado_invalido');
  end if;

  update public.requests
  set status = 'despachada', version = version + 1, updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(p_request_id, 'despachada', null, null, p_note);

  return v_solicitud;
end;
$$;

create function public.confirmar_recepcion(
  p_request_id uuid,
  p_version integer,
  p_note text default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.requests;
begin
  v_solicitud := public.rl_bloquear_solicitud(p_request_id, p_version);
  perform public.rl_exigir_habilitado(auth.uid());
  perform public.rl_validar_terminos(1, 1, p_note);

  if auth.uid() <> v_solicitud.buyer_id then
    perform public.rl_fallar('sin_permiso');
  end if;

  if v_solicitud.status <> 'despachada' then
    perform public.rl_fallar('estado_invalido');
  end if;

  perform 1 from public.offers where id = v_solicitud.offer_id for update;

  update public.offers
  set qty_reserved = qty_reserved - v_solicitud.current_qty,
      qty_delivered = qty_delivered + v_solicitud.current_qty
  where id = v_solicitud.offer_id;

  update public.requests
  set status = 'recibida', version = version + 1, updated_at = now()
  where id = p_request_id
  returning * into v_solicitud;

  perform public.rl_registrar_evento(
    p_request_id, 'recibida', v_solicitud.current_qty, null, p_note
  );

  return v_solicitud;
end;
$$;

create function public.telefono_contraparte(p_request_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.phone
  from public.requests r
  join public.businesses b
    on b.owner_id = case when auth.uid() = r.buyer_id then r.seller_id else r.buyer_id end
  join public.business_contacts c on c.business_id = b.id
  where r.id = p_request_id
    and auth.uid() in (r.buyer_id, r.seller_id)
    and r.status in ('aceptada', 'despachada', 'recibida');
$$;

create function public.listar_solicitudes(p_tipo text)
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
    r.id, r.offer_id, r.buyer_id, r.seller_id, r.status,
    r.current_qty, r.current_price, r.current_author_id, r.version,
    r.cancel_reason, r.created_at, r.updated_at,
    o.title::text, o.unit_price,
    b.name::text, b.city::text,
    (select e.note from public.request_events e where e.request_id = r.id and e.seq = 1)
  from public.requests r
  join public.offers o on o.id = r.offer_id
  join public.businesses b
    on b.owner_id = case when p_tipo = 'recibidas' then r.buyer_id else r.seller_id end
  where (p_tipo = 'recibidas' and r.seller_id = auth.uid())
     or (p_tipo = 'enviadas' and r.buyer_id = auth.uid())
  order by r.created_at desc, r.id;
$$;

create function public.detalle_solicitud(p_request_id uuid)
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
    r.id, r.offer_id, r.buyer_id, r.seller_id, r.status,
    r.current_qty, r.current_price, r.current_author_id, r.version,
    r.cancel_reason, r.created_at, r.updated_at,
    o.title::text, o.description::text, o.unit_price, o.min_purchase,
    o.qty_available,
    case when auth.uid() = r.seller_id then o.qty_reserved end,
    case when auth.uid() = r.seller_id then o.qty_delivered end,
    o.status, o.blocked, o.image_path,
    bc.name::text, bc.city::text, bc.sector::text,
    bv.name::text, bv.city::text, bv.sector::text
  from public.requests r
  join public.offers o on o.id = r.offer_id
  join public.businesses bc on bc.owner_id = r.buyer_id
  join public.businesses bv on bv.owner_id = r.seller_id
  where r.id = p_request_id
    and auth.uid() in (r.buyer_id, r.seller_id);
$$;

revoke all on function public.rl_fallar(text) from public, anon, authenticated;
revoke all on function public.rl_usuario_habilitado(uuid) from public, anon, authenticated;
revoke all on function public.rl_exigir_habilitado(uuid) from public, anon, authenticated;
revoke all on function public.rl_validar_terminos(integer, numeric, text) from public, anon, authenticated;
revoke all on function public.rl_bloquear_solicitud(uuid, integer) from public, anon, authenticated;
revoke all on function public.rl_registrar_evento(uuid, text, integer, numeric, text) from public, anon, authenticated;

revoke all on function public.crear_solicitud(uuid, integer, numeric, text) from public, anon;
revoke all on function public.iniciar_revision(uuid, integer) from public, anon;
revoke all on function public.contraproponer(uuid, integer, integer, numeric, text) from public, anon;
revoke all on function public.aceptar_propuesta(uuid, integer) from public, anon;
revoke all on function public.rechazar_solicitud(uuid, integer, text) from public, anon;
revoke all on function public.cancelar_solicitud(uuid, integer, text) from public, anon;
revoke all on function public.cancelar_acuerdo(uuid, integer, text) from public, anon;
revoke all on function public.despachar_acuerdo(uuid, integer, text) from public, anon;
revoke all on function public.confirmar_recepcion(uuid, integer, text) from public, anon;
revoke all on function public.telefono_contraparte(uuid) from public, anon;
revoke all on function public.listar_solicitudes(text) from public, anon;
revoke all on function public.detalle_solicitud(uuid) from public, anon;

grant execute on function public.crear_solicitud(uuid, integer, numeric, text) to authenticated;
grant execute on function public.iniciar_revision(uuid, integer) to authenticated;
grant execute on function public.contraproponer(uuid, integer, integer, numeric, text) to authenticated;
grant execute on function public.aceptar_propuesta(uuid, integer) to authenticated;
grant execute on function public.rechazar_solicitud(uuid, integer, text) to authenticated;
grant execute on function public.cancelar_solicitud(uuid, integer, text) to authenticated;
grant execute on function public.cancelar_acuerdo(uuid, integer, text) to authenticated;
grant execute on function public.despachar_acuerdo(uuid, integer, text) to authenticated;
grant execute on function public.confirmar_recepcion(uuid, integer, text) to authenticated;
grant execute on function public.telefono_contraparte(uuid) to authenticated;
grant execute on function public.listar_solicitudes(text) to authenticated;
grant execute on function public.detalle_solicitud(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.requests, public.request_events;
  end if;
end;
$$;

commit;
