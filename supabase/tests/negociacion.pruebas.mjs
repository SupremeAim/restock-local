import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const aqui = dirname(fileURLToPath(import.meta.url))
const carpetaMigraciones = join(aqui, '..', 'migrations')
const leer = (ruta) => readFileSync(ruta, 'utf8')

const V = '11111111-1111-1111-1111-111111111111'
const C1 = '22222222-2222-2222-2222-222222222222'
const C2 = '33333333-3333-3333-3333-333333333333'
const X = '44444444-4444-4444-4444-444444444444'
const S = '55555555-5555-5555-5555-555555555555'

let db
const resultados = []

async function existeTabla(nombre) {
  const r = await db.query('select to_regclass($1) is not null as existe', [`public.${nombre}`])
  return r.rows[0].existe
}

async function preparar() {
  db = new PGlite()
  await db.exec(leer(join(aqui, 'supabase_simulado.sql')))
  const migraciones = readdirSync(carpetaMigraciones).filter((f) => f.endsWith('.sql')).sort()
  for (const archivo of migraciones) {
    const sql = leer(join(carpetaMigraciones, archivo))
    if (sql.includes('create table public.requests') && !(await existeTabla('offers'))) {
      await db.exec(leer(join(aqui, 'esquema_comercio_actual.sql')))
    }
    await db.exec(sql)
  }
  const nombres = { [V]: 'Tienda Aurora', [C1]: 'Tienda Mi Barrio', [C2]: 'Moda Express', [X]: 'Tercero', [S]: 'Variedades La Esquina' }
  for (const [id, nombre] of Object.entries(nombres)) {
    await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [id, { contact_name: nombre }])
    const b = await db.query(`insert into public.businesses (owner_id, name, city, sector, status) values ($1, $2, 'Cali', 'Centro', $3) returning id`, [id, nombre, id === S ? 'suspendido' : 'habilitado'])
    await db.query(`insert into public.business_contacts (business_id, phone) values ($1, $2)`, [b.rows[0].id, `30000000${Object.keys(nombres).indexOf(id)}`])
  }
}

async function oferta(disponibles = 120, minimo = 10, vendedor = V) {
  const r = await db.query(
    `insert into public.offers (seller_id, title, description, category, unit_price, min_purchase, qty_available) values ($1, 'Cargadores USB-C', 'Cargadores nuevos en caja', 'Electrónica', 10500, $2, $3) returning *`,
    [vendedor, minimo, disponibles]
  )
  return r.rows[0]
}

async function como(usuario, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [usuario ?? ''])
    await tx.exec('set local role authenticated')
    return tx.query(sql, params)
  })
}

async function rpc(usuario, funcion, ...args) {
  const marcas = args.map((_, i) => `$${i + 1}`).join(', ')
  const r = await como(usuario, `select * from public.${funcion}(${marcas})`, args)
  return r.rows[0]
}

async function falla(promesa, codigo) {
  await assert.rejects(promesa, (e) => {
    assert.match(e.message, new RegExp(codigo))
    return true
  })
}

async function verOferta(id) {
  return (await db.query('select * from public.offers where id = $1', [id])).rows[0]
}

async function prueba(nombre, fn) {
  try {
    await fn()
    resultados.push(['OK ', nombre])
  } catch (e) {
    resultados.push(['MAL', `${nombre} -> ${e.message}`])
  }
}

await preparar()

await prueba('flujo completo: crear, revisar, contraproponer, aceptar, despachar y recibir', async () => {
  const o = await oferta(120, 10)
  let s = await rpc(C1, 'crear_solicitud', o.id, 30, 9000, 'Hola')
  assert.equal(s.status, 'pendiente')
  assert.equal(s.version, 1)
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  assert.equal(s.status, 'en_negociacion')
  s = await rpc(V, 'contraproponer', s.id, 2, 30, 10000, 'Te lo dejo en 10.000')
  s = await rpc(C1, 'contraproponer', s.id, 3, 30, 9500, null)
  s = await rpc(V, 'aceptar_propuesta', s.id, 4)
  assert.equal(s.status, 'aceptada')
  let of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved, of.qty_delivered], [90, 30, 0])
  s = await rpc(V, 'despachar_acuerdo', s.id, 5, null)
  assert.equal(s.status, 'despachada')
  of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved, of.qty_delivered], [90, 30, 0])
  s = await rpc(C1, 'confirmar_recepcion', s.id, 6, 'Todo llegó bien')
  assert.equal(s.status, 'recibida')
  of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved, of.qty_delivered], [90, 0, 30])
  const ev = await como(C1, 'select seq, type, actor_id, qty, price::float from public.request_events where request_id = $1 order by seq', [s.id])
  assert.deepEqual(ev.rows.map((e) => e.type), ['creada', 'revision_iniciada', 'contrapropuesta', 'contrapropuesta', 'aceptada', 'despachada', 'recibida'])
  assert.deepEqual(ev.rows.map((e) => e.seq), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(ev.rows[3].price, 9500)
})

await prueba('dos sesiones con la misma versión: solo una transición se aplica', async () => {
  const o = await oferta()
  const s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  await rpc(V, 'iniciar_revision', s.id, 1)
  await falla(rpc(V, 'iniciar_revision', s.id, 1), 'version_desactualizada')
  const ev = await db.query('select count(*)::int n from public.request_events where request_id = $1', [s.id])
  assert.equal(ev.rows[0].n, 2)
})

await prueba('nadie acepta ni contrapropone sobre su propia propuesta', async () => {
  const o = await oferta()
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  await falla(rpc(C1, 'aceptar_propuesta', s.id, 2), 'no_es_tu_turno')
  await falla(rpc(C1, 'contraproponer', s.id, 2, 12, 9000, null), 'no_es_tu_turno')
  s = await rpc(V, 'contraproponer', s.id, 2, 12, 11000, null)
  await falla(rpc(V, 'aceptar_propuesta', s.id, 3), 'no_es_tu_turno')
})

await prueba('un tercero no ve la solicitud, ni su historial, ni puede actuar', async () => {
  const o = await oferta()
  const s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  assert.equal((await como(X, 'select * from public.requests where id = $1', [s.id])).rows.length, 0)
  assert.equal((await como(X, 'select * from public.request_events where request_id = $1', [s.id])).rows.length, 0)
  assert.equal((await como(V, 'select * from public.requests where id = $1', [s.id])).rows.length, 1)
  await falla(rpc(X, 'iniciar_revision', s.id, 1), 'solicitud_no_encontrada')
  await falla(rpc(X, 'cancelar_solicitud', s.id, 1, null), 'solicitud_no_encontrada')
})

await prueba('cada rol solo hace sus acciones', async () => {
  const o = await oferta()
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  await falla(rpc(C1, 'iniciar_revision', s.id, 1), 'sin_permiso')
  await falla(rpc(C1, 'rechazar_solicitud', s.id, 1, null), 'sin_permiso')
  await falla(rpc(V, 'cancelar_solicitud', s.id, 1, null), 'sin_permiso')
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  s = await rpc(V, 'aceptar_propuesta', s.id, 2)
  await falla(rpc(C1, 'despachar_acuerdo', s.id, 3, null), 'sin_permiso')
  await falla(rpc(V, 'confirmar_recepcion', s.id, 3, null), 'sin_permiso|estado_invalido')
})

await prueba('transiciones fuera de orden se rechazan', async () => {
  const o = await oferta()
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  await falla(rpc(V, 'aceptar_propuesta', s.id, 1), 'estado_invalido')
  await falla(rpc(V, 'despachar_acuerdo', s.id, 1, null), 'estado_invalido')
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  s = await rpc(V, 'aceptar_propuesta', s.id, 2)
  s = await rpc(V, 'despachar_acuerdo', s.id, 3, null)
  await falla(rpc(C1, 'cancelar_acuerdo', s.id, 4, 'Ya no lo necesito'), 'estado_invalido')
  s = await rpc(C1, 'confirmar_recepcion', s.id, 4, null)
  await falla(rpc(C1, 'confirmar_recepcion', s.id, 5, null), 'estado_invalido')
})

await prueba('10 disponibles y dos solicitudes de 7: solo una se acepta y no hay negativos', async () => {
  const o = await oferta(10, 5)
  let a = await rpc(C1, 'crear_solicitud', o.id, 7, 10000)
  let b = await rpc(C2, 'crear_solicitud', o.id, 7, 10000)
  a = await rpc(V, 'iniciar_revision', a.id, 1)
  b = await rpc(V, 'iniciar_revision', b.id, 1)
  await rpc(V, 'aceptar_propuesta', a.id, 2)
  await falla(rpc(V, 'aceptar_propuesta', b.id, 2), 'disponibilidad_insuficiente')
  const of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved], [3, 7])
  const bb = (await db.query('select status, version from public.requests where id = $1', [b.id])).rows[0]
  assert.deepEqual([bb.status, bb.version], ['en_negociacion', 2])
})

await prueba('la oferta se agota y vuelve a activa al cancelar el acuerdo, liberando la reserva', async () => {
  const o = await oferta(10, 5)
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  s = await rpc(V, 'aceptar_propuesta', s.id, 2)
  let of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved, of.status], [0, 10, 'agotada'])
  await falla(rpc(C1, 'cancelar_acuerdo', s.id, 3, 'no'), 'motivo_invalido')
  s = await rpc(C1, 'cancelar_acuerdo', s.id, 3, 'Ya no necesito el producto')
  assert.equal(s.status, 'cancelada')
  assert.equal(s.cancel_reason, 'Ya no necesito el producto')
  of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved, of.status], [10, 0, 'activa'])
})

await prueba('solo una negociación abierta por comprador y oferta', async () => {
  const o = await oferta()
  const s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  await falla(rpc(C1, 'crear_solicitud', o.id, 12, 10000), 'solicitud_abierta_existente')
  await rpc(C1, 'cancelar_solicitud', s.id, 1, null)
  const nueva = await rpc(C1, 'crear_solicitud', o.id, 12, 10000)
  assert.equal(nueva.status, 'pendiente')
})

await prueba('validaciones al crear', async () => {
  const o = await oferta(60, 10)
  await falla(rpc(V, 'crear_solicitud', o.id, 10, 10000), 'oferta_propia')
  await falla(rpc(C1, 'crear_solicitud', o.id, 5, 10000), 'cantidad_fuera_de_rango')
  await falla(rpc(C1, 'crear_solicitud', o.id, 61, 10000), 'cantidad_fuera_de_rango')
  await falla(rpc(C1, 'crear_solicitud', o.id, 10, 0), 'precio_invalido')
  await falla(rpc(C1, 'crear_solicitud', o.id, 10, 10.555), 'precio_invalido')
  await falla(rpc(C1, 'crear_solicitud', o.id, 10, 100, 'a'.repeat(501)), 'nota_muy_larga')
  await falla(rpc(null, 'crear_solicitud', o.id, 10, 100), 'sin_sesion')
  await db.query(`update public.offers set blocked = true where id = $1`, [o.id])
  await falla(rpc(C1, 'crear_solicitud', o.id, 10, 10000), 'oferta_no_disponible')
  await db.query(`update public.offers set blocked = false, status = 'pausada' where id = $1`, [o.id])
  await falla(rpc(C1, 'crear_solicitud', o.id, 10, 10000), 'oferta_no_disponible')
})

await prueba('una cuenta suspendida no opera, pero la contraparte puede cancelar el acuerdo', async () => {
  const o = await oferta()
  await falla(rpc(S, 'crear_solicitud', o.id, 10, 10000), 'cuenta_suspendida')
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  s = await rpc(V, 'aceptar_propuesta', s.id, 2)
  await db.query(`update public.businesses set status = 'suspendido' where owner_id = $1`, [V])
  await falla(rpc(V, 'despachar_acuerdo', s.id, 3, null), 'cuenta_suspendida')
  s = await rpc(C1, 'cancelar_acuerdo', s.id, 3, 'El vendedor fue suspendido')
  assert.equal(s.status, 'cancelada')
  await db.query(`update public.businesses set status = 'habilitado' where owner_id = $1`, [V])
})

await prueba('el vendedor suspendido no impide confirmar la recepción de un despacho', async () => {
  const o = await oferta()
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  s = await rpc(V, 'aceptar_propuesta', s.id, 2)
  s = await rpc(V, 'despachar_acuerdo', s.id, 3, null)
  await db.query(`update public.businesses set status = 'suspendido' where owner_id = $1`, [V])
  s = await rpc(C1, 'confirmar_recepcion', s.id, 4, null)
  assert.equal(s.status, 'recibida')
  await db.query(`update public.businesses set status = 'habilitado' where owner_id = $1`, [V])
})

await prueba('nadie puede cambiar solicitudes ni eventos directamente', async () => {
  const o = await oferta()
  const s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  await falla(como(C1, `update public.requests set status = 'recibida' where id = $1`, [s.id]), 'permission denied')
  await falla(como(V, `insert into public.requests (offer_id, buyer_id, seller_id, current_qty, current_price, current_author_id) values ($1, $2, $3, 1, 1, $2)`, [o.id, C2, V]), 'permission denied')
  await falla(como(C1, `delete from public.request_events where request_id = $1`, [s.id]), 'permission denied')
  await falla(como(C1, `update public.request_events set note = 'x' where request_id = $1`, [s.id]), 'permission denied')
  await falla(como(C1, `select public.rl_registrar_evento($1, 'recibida')`, [s.id]), 'permission denied')
})

await prueba('el teléfono solo se revela a las partes después de aceptar', async () => {
  const o = await oferta()
  let s = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  const tel = async (u) => (await como(u, 'select public.telefono_contraparte($1) t', [s.id])).rows[0].t
  assert.equal(await tel(C1), null)
  s = await rpc(V, 'iniciar_revision', s.id, 1)
  s = await rpc(V, 'aceptar_propuesta', s.id, 2)
  assert.equal(await tel(C1), '300000000')
  assert.equal(await tel(V), '300000001')
  assert.equal(await tel(X), null)
})

await prueba('rechazar y cancelar antes de aceptar no tocan las cantidades', async () => {
  const o = await oferta(50, 10)
  let a = await rpc(C1, 'crear_solicitud', o.id, 10, 10000)
  let b = await rpc(C2, 'crear_solicitud', o.id, 10, 10000)
  await rpc(V, 'rechazar_solicitud', a.id, 1, 'No por ahora')
  b = await rpc(V, 'iniciar_revision', b.id, 1)
  await rpc(C2, 'cancelar_solicitud', b.id, 2, null)
  const of = await verOferta(o.id)
  assert.deepEqual([of.qty_available, of.qty_reserved], [50, 0])
})

await prueba('las tablas quedan publicadas para el tiempo real', async () => {
  const r = await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)
  assert.deepEqual(r.rows.map((x) => x.tablename), ['request_events', 'requests'])
})

await prueba('cada parte lista sus solicitudes con el nombre de la otra parte y el título de la oferta', async () => {
  const o = await oferta(60, 5)
  const s = await rpc(C2, 'crear_solicitud', o.id, 6, 9800, 'Puedo recoger en Cali')
  const recibidas = (await como(V, `select * from public.listar_solicitudes('recibidas') where id = $1`, [s.id])).rows
  assert.equal(recibidas.length, 1)
  assert.equal(recibidas[0].counterpart_name, 'Moda Express')
  assert.equal(recibidas[0].offer_title, 'Cargadores USB-C')
  assert.equal(recibidas[0].comentario, 'Puedo recoger en Cali')
  const enviadas = (await como(C2, `select * from public.listar_solicitudes('enviadas') where id = $1`, [s.id])).rows
  assert.equal(enviadas[0].counterpart_name, 'Tienda Aurora')
  assert.equal((await como(C2, `select * from public.listar_solicitudes('recibidas') where id = $1`, [s.id])).rows.length, 0)
  assert.equal((await como(X, `select * from public.listar_solicitudes('enviadas') where id = $1`, [s.id])).rows.length, 0)
})

await prueba('el detalle solo lo ven las partes, y el comprador no ve reservas ni entregas', async () => {
  const o = await oferta(60, 5)
  const s = await rpc(C1, 'crear_solicitud', o.id, 6, 9800)
  const d = (r) => r.rows[0]
  const vendedor = d(await como(V, 'select * from public.detalle_solicitud($1)', [s.id]))
  assert.equal(vendedor.buyer_name, 'Tienda Mi Barrio')
  assert.equal(vendedor.seller_name, 'Tienda Aurora')
  assert.equal(vendedor.offer_qty_reserved, 0)
  const comprador = d(await como(C1, 'select * from public.detalle_solicitud($1)', [s.id]))
  assert.equal(comprador.offer_qty_available, 60)
  assert.equal(comprador.offer_qty_reserved, null)
  assert.equal((await como(X, 'select * from public.detalle_solicitud($1)', [s.id])).rows.length, 0)
})

for (const [estado, texto] of resultados) console.log(estado, texto)
const malas = resultados.filter(([e]) => e === 'MAL').length
console.log(`\n${resultados.length - malas} de ${resultados.length} pruebas pasaron`)
process.exit(malas ? 1 : 0)
