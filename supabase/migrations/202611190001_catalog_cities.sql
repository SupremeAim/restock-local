
begin;

create or replace function public.catalog_cities()
returns table(city text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct trim(b.city)::text as city
  from public.businesses b
  where b.status = 'habilitado'
    and nullif(trim(b.city), '') is not null
  order by city;
$$;

revoke all on function public.catalog_cities()
from public, anon, authenticated;

grant execute on function public.catalog_cities()
to anon, authenticated;

commit;
