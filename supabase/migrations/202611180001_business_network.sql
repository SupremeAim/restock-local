
begin;

create or replace function public.get_business_network()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_result jsonb;
begin
  -- Verificar sesión
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para consultar la red comercial.'
      using errcode = '28000';
  end if;

  -- Verificar que el usuario sea un comercio habilitado
  perform public.rl_exigir_habilitado(v_user_id);

  -- Identificar el negocio del usuario y comprobar su perfil
  select b.id
  into v_business_id
  from public.businesses b
  join public.profiles p
    on p.id = b.owner_id
  join public.business_contacts bc
    on bc.business_id = b.id
  where b.owner_id = v_user_id
    and b.status = 'habilitado'
    and p.role = 'comercio';

  if v_business_id is null then
    raise exception 'Completa el perfil de tu negocio para consultar la red comercial.'
      using errcode = '42501';
  end if;

  -- Construir la respuesta de la red
  select jsonb_build_object(

    'current_business_id', v_business_id,

    -- Todos los negocios habilitados con perfil completo
    'businesses',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'name', b.name
          )
          order by b.name, b.id
        )
        from public.businesses b
        join public.profiles p
          on p.id = b.owner_id
        join public.business_contacts bc
          on bc.business_id = b.id
        where b.status = 'habilitado'
          and p.role = 'comercio'
      ),
      '[]'::jsonb
    ),

    -- Conexiones creadas por operaciones completadas
    'connections',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'source', conexiones.business_a_id,
            'target', conexiones.business_b_id,
            'weight', conexiones.operations
          )
          order by conexiones.business_a_id, conexiones.business_b_id
        )
        from (
          select
            least(comprador.id, vendedor.id) as business_a_id,
            greatest(comprador.id, vendedor.id) as business_b_id,
            count(*)::integer as operations

          from public.requests r

          join public.businesses comprador
            on comprador.owner_id = r.buyer_id
            and comprador.status = 'habilitado'

          join public.businesses vendedor
            on vendedor.owner_id = r.seller_id
            and vendedor.status = 'habilitado'

          join public.profiles perfil_comprador
            on perfil_comprador.id = comprador.owner_id
            and perfil_comprador.role = 'comercio'

          join public.profiles perfil_vendedor
            on perfil_vendedor.id = vendedor.owner_id
            and perfil_vendedor.role = 'comercio'

          join public.business_contacts contacto_comprador
            on contacto_comprador.business_id = comprador.id

          join public.business_contacts contacto_vendedor
            on contacto_vendedor.business_id = vendedor.id

          where r.status = 'recibida'
            and comprador.id <> vendedor.id

          group by
            least(comprador.id, vendedor.id),
            greatest(comprador.id, vendedor.id)

        ) conexiones
      ),
      '[]'::jsonb
    )

  )
  into v_result;

  return v_result;
end;
$$;

-- Proteger el acceso a la función
revoke all on function public.get_business_network()
from public, anon, authenticated;

grant execute on function public.get_business_network()
to authenticated;

commit;
