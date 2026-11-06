begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'comercio'
    check (role in ('comercio', 'admin')),
  contact_name text not null
    check (char_length(trim(contact_name)) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, contact_name)
  values (
    new.id,
    'comercio',
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'contact_name'), ''),
      'Sin nombre'
    )
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user()
from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

commit;