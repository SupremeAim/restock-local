create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id),
  name text not null,
  city text not null,
  sector text,
  description text,
  status text not null default 'habilitado' check (status in ('habilitado', 'suspendido')),
  suspend_reason text,
  show_in_network boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.business_contacts (
  business_id uuid primary key references public.businesses(id),
  phone text not null
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  category text,
  unit_price numeric(12, 2) not null,
  min_purchase integer not null,
  qty_available integer not null check (qty_available >= 0),
  qty_reserved integer not null default 0 check (qty_reserved >= 0),
  qty_delivered integer not null default 0 check (qty_delivered >= 0),
  image_path text,
  status text not null default 'activa' check (status in ('activa', 'pausada', 'agotada', 'archivada')),
  blocked boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.business_contacts enable row level security;
alter table public.offers enable row level security;
grant select on public.offers to authenticated;
create policy offers_select on public.offers for select to authenticated using (true);
