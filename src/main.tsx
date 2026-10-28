import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { FormEvent } from 'react';
import type { Campana, Usuario } from './tipos';
import {
  construirUsuarioLogin,
  ETIQUETAS_CAMPANA,
  validarCredenciales,
} from './datos';
import { iniciarSesion, cerrarSesion } from './datosBackend';
import { ProveedorEstado, useStore } from './store';
import Inicio from './vistas/Inicio';
import MiPerfil from './vistas/MiPerfil';
import PanelFormador from './vistas/PanelFormador';
import Participacion from './vistas/Participacion';
import PreturnoVista from './vistas/PreturnoVista';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from 'lucide-react';

type Vista =
  | { tipo: 'inicio' }
  | { tipo: 'formador' }
  | { tipo: 'perfil' }
  | { tipo: 'participacion' }
  | { tipo: 'preturno'; id: string };

const CLAVE_TEMA = 'formacion-indra-tema';

/** Alternancia de tema claro/oscuro persistida en localStorage. */
function useTema() {
  const [oscuro, setOscuro] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLAVE_TEMA) === 'oscuro';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
    try {
      localStorage.setItem(CLAVE_TEMA, oscuro ? 'oscuro' : 'claro');
    } catch {
      // sin almacenamiento: solo aplica en esta sesión
    }
  }, [oscuro]);
  return { oscuro, alternarTema: () => setOscuro((v) => !v) };
}

/** Avatar del usuario con iniciales. */
function Avatar({ usuario, tamano }: { usuario: Usuario; tamano: 'sm' | 'lg' }) {
  const clase =
    tamano === 'lg'
      ? 'h-20 w-20 text-xl border-2 border-indra-100'
      : 'h-9 w-9 text-sm';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-indra-600 font-bold text-white shadow-sm ${clase}`}
    >
      {usuario.nombre
        .split(' ')
        .map((parte) => parte[0])
        .slice(0, 2)
        .join('')}
    </div>
  );
}

/** Pantalla para elegir la campaña cuando el usuario pertenece a ambas. */
function SeleccionCampana({
  usuario,
  onElegir,
}: {
  usuario: Usuario;
  onElegir: (campana: Campana) => void;
}) {
  const opciones: { id: Campana; titulo: string; detalle: string }[] = [
    { id: 'criticos', titulo: 'Clientes Críticos', detalle: 'Campaña de clientes críticos' },
    { id: 'sta', titulo: 'STA', detalle: 'Campaña STA' },
  ];
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <img
              src="/indra-group.png"
              alt="INDRA GROUP"
              className="h-9 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-marina-950 dark:text-slate-100">¿Qué campaña quieres ver?</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Hola, <strong className="text-marina-950 dark:text-slate-100">{usuario.nombre}</strong>. Elige con cuál
            trabajarás hoy.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {opciones.map(({ id, titulo, detalle }) => (
            <button
              key={id}
              type="button"
              onClick={() => onElegir(id)}
              className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-indra-500 hover:shadow-xl"
            >
              <span
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white shadow-md transition-colors ${
                  id === 'sta' ? 'bg-indra-500 group-hover:bg-indra-600' : 'bg-marina-950 group-hover:bg-indra-600'
                }`}
              >
                {id === 'sta' ? 'STA' : 'CC'}
              </span>
              <span className="block text-base font-black text-marina-950 dark:text-slate-100">{titulo}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{detalle}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            // Cierra la sesión desde la selección (vuelve al login).
            cerrarSesion();
            location.reload();
          }}
          className="mx-auto mt-6 flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 transition-colors hover:text-indra-600"
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </div>
    </main>
  );
}

function PantallaLogin({ onIngresar }: { onIngresar: (usuario: Usuario) => void }) {
  const { estado } = useStore();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    // Modo backend Node: las credenciales se validan en el servidor.
    if (iniciarSesion) {
      setEnviando(true);
      try {
        const usuario = await iniciarSesion(nombreUsuario, contrasena);
        if (!usuario) {
          setError('Usuario o contraseña incorrectos.');
          return;
        }
        setError(null);
        setContrasena('');
        onIngresar(usuario);
      } catch {
        setError('No fue posible conectar con el servidor. Intenta de nuevo.');
      } finally {
        setEnviando(false);
      }
      return;
    }
    const usuario = validarCredenciales(nombreUsuario, contrasena, estado.usuarios);
    if (!usuario) {
      setError('Usuario o contraseña incorrectos.');
      return;
    }
    setError(null);
    setContrasena('');
    onIngresar(usuario);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white dark:bg-slate-900 px-8 py-10 shadow-xl ring-1 ring-slate-900/5 sm:px-14">
          {/* Logotipo INDRA GROUP */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <img
                src="/indra-group.png"
                alt="INDRA GROUP"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-marina-950 dark:text-slate-100">
              Formación <span className="text-indra-600">Indra</span>
            </h1>
            <p className="text-sm font-bold uppercase tracking-widest text-indra-500">
              Clientes Críticos
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Centro autoaprendizaje, formación y entrenamiento
            </p>
          </div>

          <form onSubmit={enviar}>
            <input
              id="usuario"
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              placeholder="CO + número de documento. Ej.: CO1023940501"
              autoComplete="username"
              className="mb-3 w-full rounded-md border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:text-slate-500 focus:border-indra-500 focus:outline-none"
            />
            <input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="mb-4 w-full rounded-md border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:text-slate-500 focus:border-indra-500 focus:outline-none"
            />

            {error && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="rounded-md bg-indra-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indra-700"
            >
              Acceder
            </button>

            <button
              type="button"
              onClick={() => setAyudaAbierta((v) => !v)}
              className="mt-4 block text-sm font-semibold text-indra-600 transition-colors hover:text-indra-700"
            >
              ¿Olvidó su contraseña?
            </button>
            {ayudaAbierta && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Su usuario es el prefijo <strong>CO</strong> seguido de su documento (ej.:
                CO1023940501) y su contraseña es su número de documento. Si aún no tiene acceso,
                solicítelo al formador.
              </p>
            )}
          </form>

          <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Español - Internacional (es) · Plataforma interna de capacitación Indra
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Pantalla mostrada mientras se sincroniza la información con la base de datos. */
function PantallaCarga() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="mb-6 inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <img
          src="/indra-group.png"
          alt="INDRA GROUP"
          className="h-10 w-auto object-contain"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indra-600 border-t-transparent" />
        <p className="text-sm font-semibold text-marina-950 dark:text-slate-100">
          Sincronizando la información de formación…
        </p>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Esto solo toma unos segundos
      </p>
    </main>
  );
}

/** Pantalla de error de conexión con reintento. */
function PantallaError({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 px-8 py-10 text-center shadow-xl ring-1 ring-slate-900/5">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">
          ⚠️
        </div>
        <h1 className="text-lg font-black text-marina-950 dark:text-slate-100">
          Problema de conexión
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{mensaje}</p>
        <button
          type="button"
          onClick={onReintentar}
          className="mt-6 rounded-md bg-indra-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indra-700"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}

function Aplicacion() {
  const { estado, cargando, errorCarga, reintentarCarga } = useStore();
  const { oscuro, alternarTema } = useTema();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [elegirCampana, setElegirCampana] = useState(false);
  const [vista, setVista] = useState<Vista>({ tipo: 'inicio' });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [campana, setCampana] = useState<Campana>('criticos');

  // --- Botón «atrás» del navegador ---
  // La app no usa URLs, así que el botón atrás del navegador sacaba al usuario
  // de la aplicación. Se sincroniza la vista con el historial: cada navegación
  // interna crea una entrada y una entrada «guardia» absorbe los atrás extra,
  // de modo que el navegador nunca salga de la app.
  const CLAVE_APP = 'formacion-indra';

  /** Navega a una vista y registra la entrada en el historial del navegador. */
  const navegar = (nueva: Vista) => {
    setVista(nueva);
    try {
      history.pushState({ app: CLAVE_APP, vista: nueva }, '');
    } catch {
      // historial no disponible: la navegación interna sigue funcionando
    }
  };

  useEffect(() => {
    try {
      // La entrada actual se convierte en la base y se añade una guardia extra.
      history.replaceState({ app: CLAVE_APP, vista: { tipo: 'inicio' }, base: true }, '');
      history.pushState({ app: CLAVE_APP, vista: { tipo: 'inicio' }, guardia: true }, '');
    } catch {
      return; // sin historial no hay nada que manejar
    }
    const alPop = (e: PopStateEvent) => {
      const s = e.state as { app?: string; vista?: Vista; base?: boolean } | null;
      const destino: Vista = s?.app === CLAVE_APP && s.vista ? s.vista : { tipo: 'inicio' };
      setVista(destino);
      // Si se llegó a la entrada base, se repone la guardia para no salir de la app.
      if (s?.base) {
        try {
          history.pushState({ app: CLAVE_APP, vista: destino, guardia: true }, '');
        } catch {
          // ignorar
        }
      }
    };
    window.addEventListener('popstate', alPop);
    return () => window.removeEventListener('popstate', alPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alIngresar = (u: Usuario) => {
    setUsuario(u);
    setVista({ tipo: 'inicio' });
    if (u.campanas.length > 1) {
      setElegirCampana(true);
    } else {
      setCampana(u.campanas[0] ?? 'criticos');
      setElegirCampana(false);
    }
  };

  if (cargando) {
    return <PantallaCarga />;
  }

  if (errorCarga) {
    return <PantallaError mensaje={errorCarga} onReintentar={reintentarCarga} />;
  }

  if (!usuario) {
    return <PantallaLogin onIngresar={alIngresar} />;
  }

  if (elegirCampana) {
    return (
      <SeleccionCampana
        usuario={usuario}
        onElegir={(c) => {
          setCampana(c);
          setElegirCampana(false);
        }}
      />
    );
  }

  const esFormador = usuario.rol === 'Formador';
  const campanasUsuario = usuario.campanas.length > 0 ? usuario.campanas : [campana];

  const enlaces = [
    { id: 'inicio' as const, etiqueta: 'Inicio', icono: BookOpen },
    { id: 'participacion' as const, etiqueta: 'Participación', icono: BarChart3 },
    { id: 'perfil' as const, etiqueta: 'Mi Perfil', icono: UserRound },
    ...(esFormador
      ? [{ id: 'formador' as const, etiqueta: 'Panel del Formador', icono: ClipboardList }]
      : []),
  ];

  const tituloVista =
    vista.tipo === 'preturno'
      ? 'Sesión de capacitación'
      : vista.tipo === 'formador'
        ? 'Panel del Formador'
        : vista.tipo === 'perfil'
          ? 'Mi Perfil'
          : vista.tipo === 'participacion'
            ? 'Participación en formaciones'
            : 'Dashboard';

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Barra lateral (escritorio) / superior (móvil) */}
      <aside className="flex flex-col bg-marina-950 text-white md:w-64 md:shrink-0 md:min-h-screen">
        <div className="flex items-center justify-between px-5 py-4 md:py-6">
          <div className="flex items-center gap-3">
            <img
              src="/indra-group-blanco.png"
              alt="INDRA GROUP"
              className="h-7 object-contain"
            />
            <div>
              <p className="text-sm font-black leading-tight">Formación Indra</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indra-500">
                Clientes Críticos
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 md:hidden"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Alternar menú"
          >
            {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav
          className={`${menuAbierto ? 'flex' : 'hidden'} flex-col gap-1 border-t border-white/10 px-3 py-3 md:flex md:border-t-0 md:flex-1`}
        >
          <div className="mb-2">
            <label
              htmlFor="selectorCampana"
              className="mb-1 block px-3 text-[10px] font-bold uppercase tracking-widest text-white/50"
            >
              Campaña
            </label>
            {campanasUsuario.length > 1 ? (
              <select
                id="selectorCampana"
                value={campana}
                onChange={(e) => {
                  setCampana(e.target.value as Campana);
                  navegar({ tipo: 'inicio' });
                }}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white focus:border-indra-500 focus:outline-none [&>option]:text-slate-900"
              >
                {campanasUsuario.map((c) => (
                  <option key={c} value={c}>
                    {ETIQUETAS_CAMPANA[c]}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white">
                {ETIQUETAS_CAMPANA[campanasUsuario[0]]}
              </p>
            )}
          </div>
          {enlaces.map(({ id, etiqueta, icono: Icono }) => {
            const activo =
              (id === 'inicio' && (vista.tipo === 'inicio' || vista.tipo === 'preturno')) ||
              (id === 'formador' && vista.tipo === 'formador') ||
              (id === 'participacion' && vista.tipo === 'participacion') ||
              (id === 'perfil' && vista.tipo === 'perfil');
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  navegar({ tipo: id });
                  setMenuAbierto(false);
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  activo
                    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#00a3e0]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icono className="h-4 w-4" /> {etiqueta}
              </button>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 px-4 py-4 md:block">
          <p className="text-sm font-bold">{usuario.nombre}</p>
          <p className="text-xs text-white/60">
            {construirUsuarioLogin(usuario.documento)} · {usuario.rol}
          </p>
          <button
            type="button"
            onClick={() => {
              cerrarSesion();
              setUsuario(null);
              setMenuAbierto(false);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-800/50">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 md:px-8">
          <h1 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {tituloVista}
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-marina-950 dark:text-slate-100">{usuario.nombre}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {construirUsuarioLogin(usuario.documento)} · {usuario.rol}
              </p>
            </div>
            <button
              type="button"
              onClick={alternarTema}
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-marina-950 dark:hover:text-slate-100"
              title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar modo oscuro"
            >
              {oscuro ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <button
              type="button"
              onClick={() => navegar({ tipo: 'perfil' })}
              className="transition-opacity hover:opacity-85"
              title="Ver mi perfil"
            >
              <Avatar usuario={usuario} tamano="sm" />
            </button>
            <button
              type="button"
              onClick={() => {
                cerrarSesion();
                setUsuario(null);
              }}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-marina-950 dark:hover:text-slate-100 md:hidden"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          {vista.tipo === 'inicio' && (
            <Inicio
              estado={estado}
              esFormador={esFormador}
              usuarioId={usuario.id}
              campana={campana}
              onAbrirPreturno={(id) => navegar({ tipo: 'preturno', id })}
            />
          )}
          {vista.tipo === 'perfil' && <MiPerfil usuario={usuario} />}
          {vista.tipo === 'participacion' && (
            <Participacion usuario={usuario} campana={campana} />
          )}
          {vista.tipo === 'formador' && esFormador && (
            <PanelFormador campana={campana} />
          )}
          {vista.tipo === 'preturno' && (
            <PreturnoVista
              preturnoId={vista.id}
              estado={estado}
              usuarioId={usuario.id}
              usuarioNombre={usuario.nombre}
              esFormador={esFormador}
              onVolver={() => navegar({ tipo: 'inicio' })}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-700 px-5 py-3 text-center text-[11px] text-slate-400 dark:text-slate-500 md:px-8">
          Formación Indra · Plataforma interna de capacitación para clientes críticos
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ProveedorEstado>
      <Aplicacion />
    </ProveedorEstado>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
