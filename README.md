# ReStock Local

**Plataforma web para la comercialización de excedentes de inventario entre pequeños comercios.**

ReStock Local conecta pequeños comercios que tienen productos excedentes con otros negocios que pueden aprovecharlos. La plataforma permite publicar inventario disponible, consultar ofertas, enviar solicitudes de compra y negociar condiciones directamente entre los establecimientos.

## Enlaces del proyecto

- **Aplicación web:** https://restock-local.netlify.app
- **Repositorio GitHub:** https://github.com/SupremeAim/restock-local
- **Diseño en Figma:** https://www.figma.com/design/ov8B6mLSsbtwIzqxZDKWm3/ReStock?node-id=0-1&t=uhdpBZMIThYnAKPz-1

## Objetivo del proyecto

Desarrollar una plataforma web que facilite el intercambio comercial de excedentes de inventario entre pequeños establecimientos, permitiendo aprovechar productos que no han logrado venderse y ofreciendo alternativas de abastecimiento a otros comercios.

## Funcionalidades principales

### Gestión de comercios
- Registro e inicio de sesión de usuarios.
- Confirmación de correo electrónico.
- Configuración y administración de la información del negocio.
- Gestión de datos de contacto y ubicación.
- Suspensión y reactivación de cuentas por parte del administrador.

### Publicación de excedentes
- Creación de publicaciones con fotografías y descripciones.
- Definición de precio unitario, cantidad disponible y compra mínima.
- Edición y administración de publicaciones.
- Pausar, reactivar y archivar ofertas.
- Control de unidades disponibles, reservadas y entregadas.

### Catálogo comercial
- Consulta pública de ofertas disponibles.
- Visualización de fotografías, precios y cantidades.
- Búsqueda de productos.
- Filtros por categoría, ciudad y precio.
- Visualización del detalle de cada publicación.

El catálogo es público para facilitar que los comercios conozcan los productos disponibles. Las solicitudes de compra y las operaciones comerciales requieren iniciar sesión.

### Solicitudes y negociación
- Envío de solicitudes de compra.
- Propuesta de cantidades y precios.
- Aceptación o rechazo de solicitudes.
- Intercambio de contrapropuestas.
- Reserva de unidades al aceptar un acuerdo.
- Registro del despacho y confirmación de recepción.

### Red comercial
- Visualización de relaciones entre comercios.
- Representación de conexiones mediante estructuras de grafos.
- Consulta de la red comercial.

### Administración
- Consulta y gestión de comercios registrados.
- Administración de publicaciones.
- Bloqueo y desbloqueo administrativo de ofertas.
- Suspensión y reactivación de comercios.
- Registro de acciones administrativas y motivos de moderación.

## Tecnologías utilizadas

| Tecnología | Aplicación |
|---|---|
| React 19 | Desarrollo de interfaces |
| Vite 8 | Entorno de desarrollo y compilación |
| JavaScript | Lógica de la aplicación |
| React Router 8 | Navegación y rutas |
| Supabase | Base de datos, autenticación y almacenamiento |
| Sass | Estilos y diseño de interfaces |
| Oxlint | Análisis estático del código |
| Vitest | Pruebas automatizadas |
| Netlify | Despliegue de producción |
| Git y GitHub | Control de versiones |

## Estructuras de datos

El proyecto incorpora cinco estructuras de datos implementadas en JavaScript y acompañadas de pruebas unitarias.

| Estructura | Descripción |
|---|---|
| Trie | Árbol de prefijos utilizado para facilitar búsquedas por coincidencia inicial. |
| MaxHeap | Montículo máximo para organizar elementos según su prioridad. |
| Queue | Cola que permite procesar elementos siguiendo el principio FIFO. |
| DoublyLinkedList | Lista doblemente enlazada que permite recorrer elementos en ambos sentidos. |
| Graph | Grafo para representar relaciones entre comercios y realizar recorridos mediante BFS. |

Las implementaciones y sus respectivas pruebas se encuentran en `src/structures/`.

## Arquitectura del proyecto

La aplicación está organizada por responsabilidades para facilitar el mantenimiento y la reutilización del código.

```text
restock-local/
│
├── public/
│   └── _redirects
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── helpers/
│   ├── hooks/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   └── structures/
│       ├── DoublyLinkedList.js
│       ├── Graph.js
│       ├── MaxHeap.js
│       ├── Queue.js
│       ├── Trie.js
│       └── archivos de pruebas
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

### Organización de carpetas

- `assets`: recursos gráficos y archivos estáticos.
- `components`: componentes reutilizables de la interfaz.
- `context`: contextos globales de la aplicación.
- `helpers`: funciones auxiliares y lógica de apoyo.
- `hooks`: hooks personalizados de React.
- `pages`: páginas y vistas principales.
- `routes`: configuración de navegación y protección de rutas.
- `services`: comunicación con Supabase y servicios de datos.
- `structures`: implementaciones de estructuras de datos y pruebas.

## Requisitos previos

Para ejecutar el proyecto localmente se necesita:

- Node.js.
- npm.
- Acceso a un proyecto de Supabase.
- Git.

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/SupremeAim/restock-local.git
```

### 2. Ingresar al directorio

```bash
cd restock-local
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar las variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto, tomando como referencia `.env.example`.

El archivo debe contener:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

Los valores deben obtenerse desde la configuración del proyecto en Supabase.

No se deben publicar credenciales privadas ni claves administrativas en el repositorio.

### 5. Iniciar el entorno de desarrollo

```bash
npm run dev
```

Vite mostrará la dirección local para abrir la aplicación en el navegador.

## Comandos disponibles

| Comando | Función |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Genera la compilación de producción. |
| `npm run preview` | Permite previsualizar la compilación. |
| `npm run lint` | Ejecuta Oxlint para revisar el código. |
| `npm test` | Ejecuta las pruebas automatizadas con Vitest. |

## Pruebas y calidad del código

El proyecto utiliza Vitest para comprobar el comportamiento de las estructuras de datos y las funciones auxiliares.

Los archivos de prueba se encuentran junto a sus respectivas implementaciones.

Para ejecutar todas las verificaciones:

```bash
npm run build
npm run lint
npm test
```

Estas verificaciones permiten revisar la compilación, detectar problemas de código y comprobar el funcionamiento de las pruebas automatizadas.

## Base de datos y autenticación

ReStock Local utiliza Supabase como servicio de backend.

Sus principales responsabilidades son:

- Almacenamiento de información de usuarios y comercios.
- Administración de publicaciones y solicitudes.
- Autenticación de usuarios.
- Confirmación de direcciones de correo electrónico.
- Almacenamiento de imágenes.
- Actualización de información del catálogo.

La aplicación utiliza las políticas de acceso configuradas en Supabase para proteger la información y controlar las operaciones según los permisos correspondientes.

## Despliegue

La aplicación se encuentra desplegada en Netlify y utiliza GitHub como repositorio de código fuente.

**Dirección de producción:**

https://restock-local.netlify.app

El proceso de compilación utiliza:

```bash
npm run build
```

Directorio de publicación:

```text
dist/
```

La aplicación utiliza configuración de redirecciones para permitir la navegación entre rutas desde el despliegue de una aplicación de página única (SPA).

## Consideraciones

- El catálogo permite consultar ofertas sin iniciar sesión.
- Para enviar solicitudes de compra es necesario contar con una cuenta de comercio.
- Las cantidades se actualizan según las operaciones comerciales aceptadas y completadas.
- El pago y la entrega se coordinan directamente entre los comercios, por fuera de la plataforma.
- La información privada de los establecimientos tiene acceso restringido.

## Equipo de desarrollo

Proyecto académico desarrollado por Juan Cristobal Zuñiga y Esteban Saavedra

**Repositorio:** SupremeAim/restock-local

**Institución:** Universidad Autónoma de Occidente.

---

**ReStock Local**  
Conectando pequeños comercios para aprovechar mejor sus excedentes de inventario.
