# Formación Indra — Plataforma de Capacitación Corporativa (LMS)

Aplicación web para la gestión de capacitación de las campañas **Clientes Críticos** y **STA**:
preturnos, formaciones continuas, material multimedia, evaluaciones interactivas,
reportes en Excel y panel de participación por supervisor.

## Tecnologías

- **React 19 + TypeScript**: interfaz de usuario (SPA)
- **Vite**: herramienta de construcción
- **Tailwind CSS 4**: estilos con tema corporativo Indra
- **Dos motores de datos intercambiables** (ver siguiente sección):
  - **Modo nube**: Supabase (PostgreSQL + Storage + Realtime)
  - **Modo servidor propio**: backend Node.js + SQLite relacional (carpeta `backend/`)

## Dos modos de funcionamiento (capas desacopladas)

El acceso a datos está aislado en `src/datosBackend.ts` (fachada). El resto de
la aplicación nunca habla con un motor directo, así que cambiar de motor es
solo configuración al compilar:

| Modo | Cómo se activa | Arquitectura |
|---|---|---|
| Supabase (predeterminado) | Sin variables extra | React ──► Supabase (PostgreSQL) |
| Backend Node propio | `VITE_API_URL=https://…` al compilar | React ──► API Node (Express) ──► SQLite relacional |

La guía completa del backend propio (instalación, variables, seguridad,
escalabilidad y despliegue en servidores propios o Azure) está en
[`backend/README.md`](backend/README.md).

## Requisitos

- Node.js 20 o superior (22+ si se usa el backend propio, por `node:sqlite`)
- npm

## Ejecución en local

```bash
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Compilación para producción

```bash
npm run build
```

El resultado se genera en `dist/` y puede servirse desde cualquier servidor web
estático (nginx, Apache, IIS, Azure Static Apps, etc.).

## Variables de entorno

Opcionalmente, define en un archivo `.env`:

```
VITE_SUPABASE_URL=<URL del backend>
VITE_SUPABASE_PUBLISHABLE_KEY=<clave publicable>
```

Si no se definen, la aplicación usa el backend configurado por defecto.
La clave *publishable* es pública por diseño; nunca incluyas claves de servidor en el código.

## Base de datos

Las migraciones SQL completas están en la carpeta `supabase/`:

1. `migracion_inicial.sql` — tablas (usuarios, preturnos, materiales, preguntas, intentos), políticas RLS, realtime y bucket de archivos.
2. `permisos_anon.sql` — permisos de acceso para el cliente público.

Para desplegar en un backend propio: crea un proyecto Supabase (o PostgreSQL con API
compatible), ejecuta las migraciones en orden y compila la aplicación con las variables
de entorno anteriores.

## Estructura principal

| Carpeta | Contenido |
|---|---|
| `src/vistas/` | Pantallas: Inicio, Panel del Formador, Formación, Participación, Mi Perfil |
| `src/componentes/` | Constructor de quiz, quiz del asesor, subida de archivos, visor de material |
| `src/` | Estado global, fachada de datos (`datosBackend.ts`), almacenamiento de archivos, exportación Excel |
| `backend/` | Backend Node propio: API REST, SQLite relacional, autenticación con tokens |
| `supabase/` | Migraciones SQL del modo nube |

## Acceso

El inicio de sesión usa el formato `CO` + número de documento como usuario
(p. ej. `CO1023940501`). La creación de usuarios es exclusiva del rol Formador.
