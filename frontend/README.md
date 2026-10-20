# Frontend · Formación Indra

Aplicación web (SPA) de la plataforma de capacitación de las campañas **Clientes Críticos** y
**STA**: preturnos, formaciones continuas, material multimedia, evaluaciones interactivas,
reportes en Excel y panel de participación por supervisor.

Es uno de los dos proyectos del repositorio. El otro es el backend opcional en
[`../backend/`](../backend/README.md).

## Tecnologías

| Pieza | Versión | Uso |
|---|---|---|
| React + TypeScript | 19 / 5.7 | Interfaz y tipado estricto |
| Vite | 6 | Servidor de desarrollo y build |
| Tailwind CSS | 4 | Estilos; tema corporativo (`indra-*`, `marina-*`) y modo oscuro en `src/style.css` |
| lucide-react | 1.x | Iconos |
| @supabase/supabase-js | 2.x | Motor de datos en modo Supabase |

No hay dependencias de estado global ni de enrutado: el estado vive en un contexto de React
(`src/store.tsx`) y la navegación entre vistas se resuelve en `src/main.tsx`.

## Dos motores de datos intercambiables

Todo el acceso a datos pasa por la fachada `src/datosBackend.ts`. Según la variable
`VITE_API_URL` en tiempo de compilación, la fachada exporta las funciones de un motor u otro con
la misma firma. El resto de la aplicación no sabe cuál está activo.

| Modo | Se activa con | Datos | Archivos | Sincronización | Login |
|---|---|---|---|---|---|
| **Supabase** (predeterminado) | Nada (o `VITE_SUPABASE_*`) | PostgreSQL vía `src/datosSupabase.ts` | Supabase Storage, bucket `materiales`, tokens `sbs:` | Realtime (`postgres_changes`) + sondeo cada 30 s | En el navegador, contra la lista de usuarios |
| **Backend propio** | `VITE_API_URL=https://…` | API Node vía `src/datosApi.ts` | `POST /archivos` del backend, tokens `api:` | Sondeo cada 30 s | `POST /api/auth/login`; token Bearer en `localStorage` |

Los tokens `idb:` que puedan existir en datos antiguos (IndexedDB) siguen leyéndose por compatibilidad.

## Requisitos

- Node.js **20 o superior**.
- npm (también hay `pnpm-lock.yaml`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173`, expuesto en la red local (`--host 0.0.0.0`) |
| `npm run build` | `tsc -b` (comprobación de tipos) y `vite build`; salida en `dist/` |
| `npm run preview` | Sirve `dist/` en local para probar el build |

## Ejecución en local

### Modo Supabase

```bash
npm ci
npm run dev
```

Sin variables de entorno usa el proyecto Supabase configurado por defecto en `src/supabase.ts`.

### Modo backend propio

Arranca primero la API (`cd ../backend && npm start`, puerto 3050) y crea `.env.local`:

```
VITE_API_URL=http://localhost:3050
```

Luego `npm run dev`. Vite lee `.env` y `.env.local` automáticamente; ambos están en `.gitignore`.

## Variables de entorno

Se leen en tiempo de compilación (prefijo `VITE_`). Definirlas en `.env.local` o en el entorno
del proceso que ejecuta `npm run build`.

| Variable | Modo | Descripción |
|---|---|---|
| `VITE_API_URL` | Backend propio | URL base del backend Node, sin barra final. Si está definida, Supabase se ignora por completo. |
| `VITE_SUPABASE_URL` | Supabase | URL del proyecto. Opcional: hay un valor por defecto en `src/supabase.ts`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase | Clave publicable (`anon`). Es pública por diseño; nunca pongas claves de servicio aquí. |

## Compilación y despliegue

```bash
npm run build
```

- **Modo Supabase**: sube el contenido de `dist/` a cualquier hosting estático (nginx, Apache,
  IIS, Azure Static Web Apps). Configura el servidor para devolver `index.html` en rutas
  desconocidas (SPA).
- **Modo backend propio en un solo servidor**: el backend sirve la carpeta `dist/` de la raíz
  del repositorio, por lo que el build debe salir ahí:

  ```bash
  VITE_API_URL=https://formacion.empresa.com npm run build -- --outDir ../dist --emptyOutDir
  ```

  En PowerShell: `$env:VITE_API_URL = "https://formacion.empresa.com"; npm run build -- --outDir ../dist --emptyOutDir`.

## Base de datos (modo Supabase)

Las migraciones están en `supabase/`. Ejecutarlas en este orden en el editor SQL del proyecto:

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `migracion_inicial.sql` | Tablas `usuarios`, `preturnos`, `materiales`, `preguntas`, `intentos`; políticas RLS; realtime; bucket `materiales` |
| 2 | `permisos_anon.sql` | Permisos del rol `anon` sobre `public` (incluye tablas futuras) |
| 3 | `crear_carpetas.sql` | Tabla `carpetas` con sus políticas |
| 4 | `nuevos_tipos_pregunta.sql` | Amplía los tipos de pregunta y añade la columna `datos` (jsonb) |

El backend propio usa exactamente el mismo esquema en SQLite, así que los datos pueden copiarse
tabla a tabla entre ambos motores.

## Estructura de `src/`

| Ruta | Contenido |
|---|---|
| `main.tsx` | Arranque, login, selección de campaña, barra de navegación, tema claro/oscuro, cambio de vista |
| `store.tsx` | Estado global (`usuarios`, `preturnos`, `intentos`, `carpetas`), acciones y recarga por realtime/sondeo |
| `tipos.ts` | Modelo de dominio: `Usuario`, `Preturno`, `Pregunta`, `Intento`, `Carpeta`, campañas y roles |
| `datos.ts` | Reglas de negocio puras: credenciales, corrección de respuestas, etiquetas, fechas |
| `datosBackend.ts` | Fachada que elige motor |
| `datosSupabase.ts` / `datosApi.ts` | Implementaciones de cada motor con la misma interfaz |
| `configBackend.ts` / `supabase.ts` | Lectura de `VITE_API_URL` y cliente Supabase |
| `almacenArchivos.ts` / `usarArchivo.ts` | Subida, lectura y borrado de archivos; hook para resolver tokens a URL |
| `exportar.ts` | Exportación de resultados a Excel (tabla HTML con extensión `.xls`) |
| `vistas/Inicio.tsx` | Listado de formaciones por programa y carpeta |
| `vistas/PreturnoVista.tsx` | Detalle de una formación: materiales y evaluación |
| `vistas/PanelFormador.tsx` | Administración: usuarios, formaciones, carpetas, resultados y exportación |
| `vistas/Participacion.tsx` | Cobertura por supervisor y asesor dentro de la campaña |
| `vistas/MiPerfil.tsx` | Datos del usuario conectado |
| `componentes/ConstructorQuiz.tsx` | Editor de preguntas (ocho tipos) |
| `componentes/QuizAsesor.tsx` | Evaluación interactiva que responde el asesor |
| `componentes/SubidorArchivos.tsx` / `SubidorPortada.tsx` | Carga de materiales y de la imagen de portada |
| `componentes/VisorMaterial.tsx` | Reproductor de video, visor de PDF e imágenes |
| `style.css` | Tailwind 4, variante `dark` y tokens de color corporativos |

## Dominio funcional

- **Roles**: `Formador` (administra todo y ve el Panel del Formador), `Supervisor` (ve la
  participación de sus asesores) y `Asesor` (consume formaciones y responde evaluaciones).
- **Campañas**: `criticos` y `sta`. Quien pertenece a ambas elige una al iniciar sesión.
- **Programas**: `preturno` y `continua`, organizados en carpetas por campaña y tipo. Una
  carpeta puede ocultarse; al borrarla, sus formaciones pasan a General.
- **Formación**: título, fecha, descripción, portada, `disponibleDesde` / `disponibleHasta`,
  `limiteIntentos`, `oculto`, materiales y preguntas.
- **Tipos de pregunta**: `opcion`, `verdaderofalso`, `completar`, `caso`, `secuencia`,
  `emparejamiento`, `abierta` y `sopa` (sopa de letras generada a partir de palabras).
- **Archivos**: límite de 20 MB por archivo. Formatos: mp4, webm, mov, pdf, png, jpg, webp, gif, svg.
- **Acceso**: usuario `CO` + documento (por ejemplo `CO1023940501`), contraseña = documento.
  Solo el Formador crea usuarios. El tema claro/oscuro se guarda en `localStorage`.
