# Backend Node.js · Formación Indra

API REST + base de datos relacional para la plataforma, **sin Supabase ni servicios en la nube**.
Corre en cualquier máquina con Node.js 22 o superior (Linux, Windows o contenedor) y puede
servir también el frontend compilado, de modo que un solo proceso entrega la aplicación completa.

El frontend lo consume cuando se compila con `VITE_API_URL` (ver [../frontend/README.md](../frontend/README.md)).

## Arquitectura

```
Navegador (React)  ──HTTP(S)──►  Express (servidor.js)  ──►  SQLite WAL  (datos/formacion-indra.db)
       │                               │
       └── video / PDF / imagen ───────┘──►  disco local  (archivos/)
```

| Módulo | Responsabilidad |
|---|---|
| `servidor.js` | Arranque, CORS, límite JSON de 25 MB, protección con token de `/api`, servido de `../dist` |
| `src/bd.js` | Conexión SQLite (`node:sqlite`), creación del esquema, usuario administrador inicial |
| `src/token.js` | Tokens de sesión firmados con HMAC-SHA256, vencimiento de 12 horas |
| `src/mapeo.js` | Conversión fila (snake_case) a objeto de la aplicación (camelCase) e inserciones compuestas |
| `src/rutas/auth.js` | `POST /api/auth/login` y `GET /api/estado` |
| `src/rutas/usuarios.js` | Alta, edición y baja de usuarios |
| `src/rutas/formaciones.js` | Preturnos y formaciones continuas con materiales y preguntas |
| `src/rutas/intentos-carpetas.js` | Resultados de evaluaciones y carpetas |
| `src/rutas/archivos.js` | Subida, descarga y borrado de material multimedia |
| `prueba-api.mjs` | Prueba de extremo a extremo (20 verificaciones) |

Decisiones de diseño:

- **Sin dependencias nativas**: solo `express` y `cors`. Criptografía, SQLite y ficheros usan
  módulos estándar de Node.
- **Mismo esquema que Supabase**: tablas y columnas idénticas a las migraciones de
  `frontend/supabase/`. Las columnas `jsonb` se guardan como `TEXT` con JSON. Migrar a PostgreSQL
  o SQL Server más adelante solo implica reescribir `src/bd.js`.
- **Borrado en cascada**: `PRAGMA foreign_keys = ON`; al eliminar una formación se eliminan sus
  materiales, preguntas e intentos. Al eliminar un usuario se eliminan sus intentos.

## Requisitos

- Node.js **22 o superior** (necesario para `node:sqlite`).
- npm.

## Puesta en marcha

```bash
cd backend
npm install
npm start
```

Salida esperada:

```
Backend de Formación Indra escuchando en el puerto 3050
API:      http://localhost:3050/api/estado
Archivos: http://localhost:3050/archivos/
```

En el primer arranque se crean automáticamente:

- La carpeta `datos/` con la base `formacion-indra.db` y todas las tablas.
- El usuario administrador (rol Formador, ambas campañas): **CO1023940501** / contraseña
  **1023940501**. Solo se crea si la tabla `usuarios` está vacía.
- El secreto de firma en `datos/secreto.txt`, salvo que exista la variable `SECRETO_TOKEN`.
- La carpeta `archivos/` para el material subido.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `3050` | Puerto de escucha. Azure App Service la inyecta sola. |
| `SECRETO_TOKEN` | No | Se genera y persiste en `datos/secreto.txt` | Secreto HMAC para firmar las sesiones. Con varias instancias debe ser el mismo en todas. |

## Autenticación

1. El cliente envía `POST /api/auth/login` con `{ "usuario": "CO1023940501", "contrasena": "1023940501" }`.
   La regla de la plataforma es usuario = `CO` + documento y contraseña = documento; el prefijo
   `CO` es opcional y no distingue mayúsculas.
2. El servidor responde `{ token, usuario }`. El token es `base64url(carga).firma`, con `id`,
   `documento`, `nombre` y `exp` (12 horas). La firma se compara en tiempo constante.
3. El cliente envía `Authorization: Bearer <token>` en cada llamada a `/api/*`.

Rutas que **no** requieren token: `POST /api/auth/login`, `GET /api/estado` y todo `/archivos`.
Cualquier otra ruta bajo `/api` sin token válido responde `401`.

## Endpoints

Todas las respuestas son JSON. Las escrituras devuelven `{ "ok": true }` salvo que se indique otra cosa.

### Autenticación y estado

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/auth/login` | `{ usuario, contrasena }` | `200 { token, usuario }` · `401` credenciales inválidas |
| GET | `/api/estado` | — | `{ usuarios, preturnos, intentos, carpetas }` (estado completo en una llamada) |

### Usuarios (requieren token)

| Método | Ruta | Cuerpo | Notas |
|---|---|---|---|
| POST | `/api/usuarios` | `Usuario` completo con `id` | `201`; `409` si el documento ya existe |
| PUT | `/api/usuarios/:id` | Campos a cambiar (`nombre`, `documento`, `rol`, `campanas`, `supervisorId`) | `404` si no existe |
| DELETE | `/api/usuarios/:id` | — | Borra también sus intentos |

### Formaciones (requieren token)

| Método | Ruta | Cuerpo | Notas |
|---|---|---|---|
| POST | `/api/formaciones` | `Preturno` completo con `materiales` y `preguntas` | `201` |
| PUT | `/api/formaciones/:id` | `{ preturno, cambios }` | Si `cambios` trae `materiales` o `preguntas`, esa colección se reemplaza completa |
| PATCH | `/api/formaciones/:id/oculto` | `{ oculto: boolean }` | Oculta o muestra a los asesores |
| POST | `/api/formaciones/quitar-carpeta` | `{ ids: string[] }` | Las formaciones vuelven a la carpeta General |
| DELETE | `/api/formaciones/:id` | — | Cascada sobre materiales, preguntas e intentos |

### Intentos y carpetas (requieren token)

| Método | Ruta | Cuerpo | Notas |
|---|---|---|---|
| POST | `/api/intentos` | `Intento` (`id`, `preturnoId`, `usuarioId`, `usuarioNombre`, `aciertos`, `total`, `respuestas`, `fecha`) | `201` |
| POST | `/api/intentos/borrar` | `{ ids: string[] }` | Borrado múltiple |
| PUT | `/api/carpetas` | `Carpeta` (`id`, `campana`, `tipo`, `nombre`, `oculta`, `creadoEn`) | Upsert por `(campana, tipo, nombre)`; en conflicto solo actualiza `oculta` |
| DELETE | `/api/carpetas/:id` | — | No borra las formaciones de la carpeta |

### Archivos (sin token)

| Método | Ruta | Detalle |
|---|---|---|
| POST | `/archivos` | Cuerpo binario. Cabecera `x-nombre-archivo` con la extensión original. Responde `201 { nombre }`; el frontend lo guarda como token `api:<nombre>`. `400` extensión no permitida, `413` supera 20 MB |
| GET | `/archivos/:nombre` | Sirve el archivo (público) |
| DELETE | `/archivos/:nombre` | Borra el archivo; responde `{ ok: true }` aunque ya no exista |

Extensiones permitidas: `.mp4 .webm .mov .pdf .png .jpg .jpeg .webp .gif .svg`. Límite: 20 MB.

## Servir el frontend desde este backend

Si existe la carpeta `dist/` en la **raíz del repositorio** (hermana de `backend/`), el servidor la
entrega como estático y responde `index.html` a cualquier ruta que no empiece por `/api` ni
`/archivos`. Así un único proceso Node sirve frontend + API + archivos.

Compila el frontend apuntando a esa ruta y con la URL pública del backend:

```bash
cd ../frontend
VITE_API_URL=https://formacion.empresa.com npm run build -- --outDir ../dist --emptyOutDir
```

En PowerShell:

```powershell
cd ..\frontend
$env:VITE_API_URL = "https://formacion.empresa.com"; npm run build -- --outDir ../dist --emptyOutDir
```

Sin `VITE_API_URL` el frontend se compila en modo Supabase e ignora este backend.

## Pruebas

`prueba-api.mjs` recorre la API de principio a fin: login correcto e incorrecto, rechazo sin
token, usuarios, formaciones (incluida la edición de una sopa de letras), intentos, carpetas,
ocultar, archivos y borrados en cascada. Deja la base como estaba.

El script apunta a `http://localhost:3001`, así que arranca el servidor en ese puerto:

```bash
# Terminal 1
PORT=3001 npm start

# Terminal 2
node prueba-api.mjs
```

En PowerShell: `$env:PORT = "3001"; npm start`. Al final imprime `TODAS LAS PRUEBAS PASARON`
o el número de fallos, y sale con código distinto de cero si alguna falla.

## Persistencia y copias de seguridad

Todo el estado vive en dos carpetas dentro de `backend/`, ambas excluidas de Git:

| Carpeta | Contenido | Respaldo |
|---|---|---|
| `datos/` | `formacion-indra.db` (más `-wal` y `-shm` en caliente) y `secreto.txt` | Copiar con el servicio detenido o usar `sqlite3 .backup` |
| `archivos/` | Material multimedia subido | Copia de ficheros normal |

Si se pierde `secreto.txt` (y no hay `SECRETO_TOKEN`), todas las sesiones activas quedan inválidas
y los usuarios deben volver a iniciar sesión. No se pierde ningún dato.

## Escalabilidad

- **Más usuarios**: SQLite en modo WAL atiende sin problema cientos de lectores concurrentes con
  escrituras ocasionales, que es el patrón de esta aplicación.
- **Varias instancias**: definir el mismo `SECRETO_TOKEN` en todas y compartir `datos/` y
  `archivos/` en un disco de red, o migrar a PostgreSQL.
- **Cambio de motor**: reescribir `src/bd.js` con un cliente PostgreSQL. El esquema es el mismo de
  `frontend/supabase/migracion_inicial.sql`, `crear_carpetas.sql` y `nuevos_tipos_pregunta.sql`.

## Seguridad en producción

1. Servir siempre detrás de HTTPS (balanceador, nginx, IIS o el propio Azure).
2. Definir `SECRETO_TOKEN` y tratarlo como credencial de servidor.
3. `cors()` permite cualquier origen por defecto. Si el frontend se sirve desde otro dominio,
   restringirlo en `servidor.js`: `cors({ origin: 'https://formacion.empresa.com' })`.
4. `POST` y `DELETE /archivos` no exigen token. Si el servidor está expuesto a Internet, limita
   esas rutas con el mismo middleware de `/api` o con reglas en el proxy inverso.
5. La contraseña es el documento del usuario por regla de la plataforma. Restringe el acceso a la
   red corporativa o añade autenticación en el proxy si el servidor es público.
6. Restringir el acceso a `datos/` y `archivos/` a la cuenta del servicio.
