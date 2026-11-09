create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name varchar not null check (char_length(trim(name)) between 2 and 80),
  city varchar not null check (char_length(trim(city)) between 1 and 80),
  sector varchar not null check (char_length(trim(sector)) between 1 and 80),
  description varchar not null default '' check (char_length(description) <= 500),
  status text not null default 'habilitado' check (status in ('habilitado', 'suspendido')),
  suspend_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_contacts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  phone varchar not null check (phone ~ '^[0-9]{7,15}$'),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  title varchar not null check (char_length(trim(title)) between 3 and 100),
  description varchar not null check (char_length(trim(description)) between 10 and 1000),
  category text not null check (category in ('Electrónica', 'Accesorios', 'Hogar', 'Papelería')),
  unit_price numeric not null check (unit_price > 0),
  min_purchase integer not null check (min_purchase > 0),
  qty_available integer not null check (qty_available >= 0),
  qty_reserved integer not null default 0 check (qty_reserved >= 0),
  qty_delivered integer not null default 0 check (qty_delivered >= 0),
  image_path text,
  status text not null default 'activa' check (status in ('activa', 'pausada', 'agotada', 'archivada')),
  blocked boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_purchase <= qty_available + qty_reserved + qty_delivered)
);

alter table public.businesses enable row level security;
alter table public.business_contacts enable row level security;
alter table public.offers enable row level security;

revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.business_contacts from public, anon, authenticated;
revoke all on table public.offers from public, anon, authenticated;
grant select on table public.offers to authenticated;

create policy businesses_admin_read on public.businesses for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy businesses_owner_read on public.businesses for select to authenticated
using (owner_id = (select auth.uid()));
create policy businesses_read_enabled on public.businesses for select to authenticated
using (status = 'habilitado');

create policy business_contacts_owner_read on public.business_contacts for select to authenticated
using (exists (select 1 from public.businesses b where b.id = business_contacts.business_id and b.owner_id = (select auth.uid())));

create policy offers_admin_read on public.offers for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy offers_catalog_read on public.offers for select to authenticated
using (
  status = 'activa' and not blocked and qty_available >= min_purchase
  and exists (select 1 from public.businesses b where b.owner_id = offers.seller_id and b.status = 'habilitado')
);
create policy offers_owner_read on public.offers for select to authenticated
using (seller_id = (select auth.uid()));
