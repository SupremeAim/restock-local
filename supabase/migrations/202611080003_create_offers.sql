
begin;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  title varchar(100) not null,
  description varchar(1000) not null,
  category text not null
    check (category in ('Electrónica', 'Accesorios', 'Hogar', 'Papelería')),
  unit_price numeric(12,2) not null check (unit_price > 0),
  min_purchase integer not null check (min_purchase > 0),
  qty_available integer not null check (qty_available >= 0),
  qty_reserved integer not null default 0 check (qty_reserved >= 0),
  qty_delivered integer not null default 0 check (qty_delivered >= 0),
  image_path text,
  status text not null default 'activa'
    check (status in ('activa', 'pausada', 'agotada', 'archivada')),
  blocked boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(title)) between 3 and 100),
  check (char_length(trim(description)) between 10 and 1000),
  check (min_purchase <= qty_available + qty_reserved + qty_delivered)
);

create index if not exists offers_seller_status_idx
on public.offers(seller_id, status, created_at desc);

create index if not exists offers_catalog_idx
on public.offers(status, blocked, qty_available);

alter table public.offers enable row level security;

revoke all on public.offers from public, anon, authenticated;
grant select on public.offers to authenticated;

drop policy if exists offers_owner_read on public.offers;
create policy offers_owner_read
on public.offers
for select
to authenticated
using (seller_id = (select auth.uid()));

drop policy if exists offers_catalog_read on public.offers;
create policy offers_catalog_read
on public.offers
for select
to authenticated
using (
  status = 'activa'
  and not blocked
  and qty_available >= min_purchase
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = offers.seller_id
      and b.status = 'habilitado'
  )
);

drop policy if exists offers_admin_read on public.offers;
create policy offers_admin_read
on public.offers
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

create or replace view public.catalog_offers
with (security_barrier = true)
as
select
  o.id,
  o.title,
  o.description,
  o.category,
  o.unit_price,
  o.min_purchase,
  o.qty_available,
  o.image_path,
  o.created_at,
  b.name as seller_name,
  b.city as seller_city,
  b.sector as seller_sector,
  b.description as seller_description
from public.offers o
join public.businesses b on b.owner_id = o.seller_id
where
  o.status = 'activa'
  and not o.blocked
  and o.qty_available >= o.min_purchase
  and b.status = 'habilitado'
  and (auth.uid() is null or o.seller_id <> auth.uid());

grant select on public.catalog_offers to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'offer-images',
  'offer-images',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists offer_images_upload_own on storage.objects;
create policy offer_images_upload_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'offer-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists offer_images_delete_own on storage.objects;
create policy offer_images_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'offer-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.create_offer(
  p_title text,
  p_description text,
  p_category text,
  p_quantity integer,
  p_min_purchase integer,
  p_unit_price numeric,
  p_image_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_offer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = v_user_id
      and email_confirmed_at is not null
  ) then
    raise exception 'Debes confirmar tu correo electrónico.'
      using errcode = '42501';
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is distinct from 'comercio' then
    raise exception 'Solo los comercios pueden publicar ofertas.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.businesses
    where owner_id = v_user_id
      and status = 'habilitado'
  ) then
    raise exception 'Debes tener un negocio habilitado.'
      using errcode = '42501';
  end if;

  if p_title is null
    or char_length(trim(p_title)) not between 3 and 100 then
    raise exception 'El título debe tener entre 3 y 100 caracteres.'
      using errcode = '22023';
  end if;

  if p_description is null
    or char_length(trim(p_description)) not between 10 and 1000 then
    raise exception 'La descripción debe tener entre 10 y 1000 caracteres.'
      using errcode = '22023';
  end if;

  if p_category is null or p_category not in (
    'Electrónica', 'Accesorios', 'Hogar', 'Papelería'
  ) then
    raise exception 'Selecciona una categoría válida.'
      using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser un entero mayor que cero.'
      using errcode = '22023';
  end if;

  if p_min_purchase is null
    or p_min_purchase < 1
    or p_min_purchase > p_quantity then
    raise exception 'La compra mínima no puede superar la cantidad disponible.'
      using errcode = '22023';
  end if;

  if p_unit_price is null
    or p_unit_price <= 0
    or p_unit_price <> round(p_unit_price, 2) then
    raise exception 'El precio debe ser positivo y tener máximo dos decimales.'
      using errcode = '22023';
  end if;

  if p_image_path is not null then
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
  end if;

  insert into public.offers (
    seller_id,
    title,
    description,
    category,
    unit_price,
    min_purchase,
    qty_available,
    qty_reserved,
    qty_delivered,
    image_path,
    status,
    blocked
  )
  values (
    v_user_id,
    trim(p_title),
    trim(p_description),
    p_category,
    p_unit_price,
    p_min_purchase,
    p_quantity,
    0,
    0,
    p_image_path,
    'activa',
    false
  )
  returning id into v_offer_id;

  return v_offer_id;
end;
$$;

revoke all on function public.create_offer(
  text, text, text, integer, integer, numeric, text
) from public, anon, authenticated;

grant execute on function public.create_offer(
  text, text, text, integer, integer, numeric, text
) to authenticated;

commit;
