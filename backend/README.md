# Backend Node.js · Formación Indra

Backend propio de la plataforma: **API REST + base de datos relacional**, sin
dependencia de Supabase ni de ningún servicio en la nube. Corre en cualquier
servidor con Node.js 22 o superior (Linux, Windows o contenedor Docker).

## Arquitectura

```
Navegador (React)  ──HTTPS──►  Backend Node (Express)  ──►  SQLite (relacional)
      │                              │
      └── archivos (video/PDF)  ─────┘  disco local backend/archivos/
```

- **Capas desacopladas**: rutas (`src/rutas/`), mapeo de datos (`src/mapeo.js`),
  base de datos (`src/bd.js`) y autenticación (`src/token.js`) son módulos
  independientes.
- **Base de datos relacional**: SQLite integrado en Node (`node:sqlite`), sin
  instalaciones ni compilaciones. El esquema usa los mismos nombres de tablas y
  columnas que la versión Supabase/PostgreSQL, así que migrar a PostgreSQL o
  SQL Server más adelante solo implica reescribir `src/bd.js`.
- **Sin dependencias nativas**: solo `express` y `cors`. Todo lo demás usa
  módulos estándar de Node (crypto, sqlite, fs).

## Requisitos

- Node.js **22 o superior** (necesario para `node:sqlite`)
- npm

## Puesta en marcha

```bash
cd backend
npm install
npm start
```

En el primer arranque se crean automáticamente:

- La base de datos `datos/formacion-indra.db` con todas las tablas.
- El usuario administrador: **CO1023940501** / contraseña **1023940501**
  (crea los demás usuarios desde el panel del Formador).
- El secreto de firma de sesiones en `datos/secreto.txt` (si no se define la
  variable de entorno `SECRETO_TOKEN`).

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (por defecto `3001`) | Puerto de escucha. En Azure App Service la plataforma la inyecta sola. |
| `SECRETO_TOKEN` | No | Secreto para firmar los tokens de sesión. Si no se define, se genera uno y se guarda en `datos/secreto.txt`. En producción con varias instancias, defínela para que todas firmen con el mismo secreto. |

## Publicar el frontend contra este backend

Desde la raíz del proyecto:

```bash
# Windows (cmd)
set VITE_API_URL=https://formacion.indra.com.co&& npm run build

# Linux / macOS
VITE_API_URL=https://formacion.indra.com.co npm run build
```

Esto compila la aplicación en modo "backend propio": consumirá esta API en vez
de Supabase. Sin la variable, la app sigue funcionando con Supabase (los dos
modos conviven en el mismo código).

**Despliegue en un solo servidor**: si existe la carpeta `dist/` junto a
`backend/`, el propio servidor la entrega (`http://<servidor>:<puerto>/`).
Es decir, un único proceso Node sirve la aplicación completa: frontend + API +
archivos.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión, devuelve token (usuario `CO`+documento, contraseña = documento) |
| GET | `/api/estado` | Estado completo (usuarios, formaciones, intentos, carpetas) |
| POST/PUT/DELETE | `/api/usuarios` | Gestión de usuarios (requiere token) |
| POST/PUT/PATCH/DELETE | `/api/formaciones` | Preturnos y continuas con materiales, preguntas e intentos (requiere token) |
| POST | `/api/intentos` · `/api/intentos/borrar` | Registrar / eliminar intentos (requiere token) |
| PUT/DELETE | `/api/carpetas` | Carpetas por campaña y tipo (requiere token) |
| POST/GET/DELETE | `/archivos` | Subir, descargar y borrar material multimedia |

Autenticación: token tipo Bearer firmado con HMAC-SHA256, vence a las 12 horas.
Las escrituras sin token se rechazan con `401`.

## Copias de seguridad y persistencia

Todo el estado vive en dos carpetas (incluirlas en los respaldos):

- `datos/` — base de datos SQLite y secreto de sesiones.
- `archivos/` — material multimedia subido.

## Escalabilidad

- **Más usuarios**: SQLite en modo WAL soporta sin problema cientos de usuarios
  concurrentes de lectura con escrituras ocasionales (el patrón de esta app).
- **Crecimiento futuro**: sustituir `src/bd.js` por un cliente PostgreSQL; el
  esquema es idéntico al de Supabase (ver carpeta `supabase/` de la raíz).
- **Varias instancias**: definir `SECRETO_TOKEN` compartido y montar `datos/`
  y `archivos/` en un disco de red o migrar a PostgreSQL.

## Notas de seguridad para producción

1. Servir siempre detrás de HTTPS (terminación TLS en el balanceador, nginx o
   el propio Azure).
2. Definir `SECRETO_TOKEN` y tratarlo como credencial de servidor.
3. Ajustar `cors()` en `servidor.js` al dominio real del frontend si se sirven
   por separado.
4. Restringir el acceso a `datos/` y `archivos/` a la cuenta del servicio.

## Pruebas

Con el servidor corriendo (`npm start` en otra terminal):

```bash
node prueba-api.mjs
```

Ejecuta 20 verificaciones de principio a fin: login, permisos, usuarios,
formaciones (incluida la edición y la sopa de letras), intentos, carpetas,
archivos y borrados en cascada.
