# Formación Indra · Plataforma de capacitación (LMS)

Plataforma web interna para la capacitación de las campañas **Clientes Críticos** y **STA**:
preturnos, formaciones continuas, material multimedia (video, PDF, imagen), evaluaciones
interactivas con ocho tipos de pregunta, reportes en Excel y panel de participación por supervisor.

El repositorio contiene dos proyectos independientes, cada uno con su propio `package.json`:

| Carpeta | Proyecto | Guía |
|---|---|---|
| [`frontend/`](frontend/) | Aplicación web (React 19 + TypeScript + Vite + Tailwind CSS 4) | [frontend/README.md](frontend/README.md) |
| [`backend/`](backend/) | API REST opcional (Node.js 22 + Express + SQLite integrado) | [backend/README.md](backend/README.md) |

## Dos modos de funcionamiento

El frontend trabaja con dos motores de datos intercambiables. El motor se elige al compilar,
sin cambiar código:

| Modo | Cuándo usarlo | Qué se despliega |
|---|---|---|
| **Supabase** (predeterminado) | Sin servidor propio; datos y archivos en la nube | Solo `frontend/dist/` en cualquier hosting estático |
| **Backend propio** (`VITE_API_URL`) | Servidor propio, red interna o Azure App Service, sin servicios externos | `backend/` con Node 22; el mismo proceso sirve el frontend compilado |

```
Modo Supabase:        Navegador (React) ──► Supabase (PostgreSQL + Storage + Realtime)

Modo backend propio:  Navegador (React) ──► Node / Express ──► SQLite   (backend/datos/)
                                                   └──► archivos  (backend/archivos/)
```

## Inicio rápido

### Requisitos

- Node.js **20 o superior** para el frontend y **22 o superior** para el backend (usa `node:sqlite`).
- npm. Ambos proyectos incluyen también `pnpm-lock.yaml` si prefieres pnpm.

### Opción A · Solo frontend contra Supabase

```bash
cd frontend
npm ci
npm run dev          # http://localhost:5173
```

### Opción B · Frontend + backend propio en local

Terminal 1 (API):

```bash
cd backend
npm install
npm start            # http://localhost:3050
```

Terminal 2 (interfaz). Crea `frontend/.env.local` con la URL de la API y arranca Vite:

```bash
cd frontend
echo VITE_API_URL=http://localhost:3050 > .env.local
npm ci
npm run dev          # http://localhost:5173, consumiendo la API local
```

### Acceso inicial

El usuario es `CO` + número de documento y la contraseña es el documento.
En el backend propio el primer arranque crea al Formador **CO1023940501** / **1023940501**.
Los demás usuarios se crean desde el Panel del Formador.

## Despliegue en un solo servidor (backend propio)

El backend entrega la carpeta `dist/` que esté en la **raíz del repositorio** (al lado de
`backend/`). Por eso el build del frontend debe generarse ahí:

```bash
cd frontend
npm ci
VITE_API_URL=https://formacion.empresa.com npm run build -- --outDir ../dist --emptyOutDir

cd ../backend
npm install --omit=dev
SECRETO_TOKEN=<cadena-larga-aleatoria> PORT=3050 npm start
```

Un único proceso Node sirve frontend, API y archivos. Variables, seguridad, respaldos y
escalabilidad están descritos en [backend/README.md](backend/README.md).

## Estructura del repositorio

```
.
├── frontend/              Aplicación React (SPA)
│   ├── src/               Vistas, componentes, fachada de datos, tipos
│   ├── supabase/          Migraciones SQL del modo Supabase (4 archivos)
│   └── public/            Logos de Indra
├── backend/               API Node + SQLite
│   ├── servidor.js        Punto de entrada (Express)
│   ├── src/               bd.js, token.js, mapeo.js, rutas/
│   └── prueba-api.mjs     Prueba de extremo a extremo de la API
└── .gitignore             Excluye node_modules, dist, .env*, backend/datos y backend/archivos
```

## Dominio funcional (común a ambos modos)

- **Roles**: Formador (administra usuarios y formaciones), Supervisor (consulta la cobertura de
  sus asesores) y Asesor (consume formaciones y responde evaluaciones).
- **Campañas**: `criticos` (Clientes Críticos) y `sta`. Un usuario puede pertenecer a una o ambas;
  si pertenece a ambas elige campaña al entrar.
- **Programas**: preturnos (sesiones cortas) y formación continua. Se agrupan en carpetas por
  campaña y tipo (por ejemplo "Octubre"); una carpeta puede ocultarse a los asesores.
- **Formaciones**: fecha, portada, ventana de disponibilidad, límite de intentos, materiales y
  preguntas. Pueden ocultarse sin borrarlas.
- **Tipos de pregunta**: opción múltiple, verdadero/falso, completar, caso práctico, secuencia,
  emparejamiento, respuesta abierta y sopa de letras.
- **Archivos**: máximo 20 MB por archivo. Formatos: mp4, webm, mov, pdf, png, jpg, webp, gif, svg.
- **Reportes**: exportación de resultados a Excel desde el Panel del Formador.
