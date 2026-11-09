
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
  b.description as seller_description,
  o.seller_id
from public.offers o
join public.businesses b
  on b.owner_id = o.seller_id
where
  o.status = 'activa'
  and not o.blocked
  and o.qty_available >= o.min_purchase
  and b.status = 'habilitado'
  and (
    auth.uid() is null
    or o.seller_id <> auth.uid()
  );

grant select on public.catalog_offers to anon, authenticated;
