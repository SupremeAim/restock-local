
begin;

create or replace function public.notify_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'resource', TG_TABLE_NAME,
      'operation', TG_OP
    ),
    'catalog_changed',
    'catalog:offers',
    false
  );

  return null;
end;
$$;

drop trigger if exists offers_catalog_changed
on public.offers;

create trigger offers_catalog_changed
after insert or update or delete
on public.offers
for each row
execute function public.notify_catalog_change();

drop trigger if exists businesses_catalog_changed
on public.businesses;

create trigger businesses_catalog_changed
after insert or update or delete
on public.businesses
for each row
execute function public.notify_catalog_change();

commit;
