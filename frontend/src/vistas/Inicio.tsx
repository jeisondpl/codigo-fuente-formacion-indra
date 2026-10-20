import { useState } from 'react';
import type { EstadoApp, Intento, Preturno, TipoPrograma } from '../tipos';
import { ETIQUETAS_CAMPANA, estaDisponible, formatearFecha } from '../datos';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Folder,
  GraduationCap,
  Route,
} from 'lucide-react';

interface Props {
  estado: EstadoApp;
  esFormador: boolean;
  usuarioId: string;
  campana: 'criticos' | 'sta';
  onAbrirPreturno: (id: string) => void;
}

/** Último intento de un usuario sobre un preturno, si existe. */
function ultimoIntento(
  intentos: Intento[],
  usuarioId: string,
  preturnoId: string,
): Intento | undefined {
  return intentos
    .filter((i) => i.usuarioId === usuarioId && i.preturnoId === preturnoId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
}

const CATEGORIAS: { tipo: TipoPrograma; titulo: string; vacio: string }[] = [
  { tipo: 'preturno', titulo: 'Preturnos', vacio: 'Todavía no hay preturnos publicados en esta campaña.' },
  {
    tipo: 'continua',
    titulo: 'Formación Continua',
    vacio: 'Todavía no hay programas de formación continua en esta campaña.',
  },
];

export default function Inicio({ estado, esFormador, usuarioId, campana, onAbrirPreturno }: Props) {
  const [tipoAbierto, setTipoAbierto] = useState<TipoPrograma | null>(null);
  const [carpetaAbierta, setCarpetaAbierta] = useState<string | null>(null);

  const usuario = estado.usuarios.find((u) => u.id === usuarioId);
  const nombreCampana = ETIQUETAS_CAMPANA[campana];

  // Formaciones de la campaña activa; los ocultos o no habilitados solo los ve el formador.
  const deCampana = estado.preturnos.filter((p) => {
    if (!p.campanas.includes(campana)) return false;
    return esFormador || (!p.oculto && estaDisponible(p));
  });

  const categoriaActual = CATEGORIAS.find((c) => c.tipo === tipoAbierto);

  // Carpetas disponibles dentro de la categoría abierta ("General" para las que no tienen carpeta).
  // Se suman las creadas desde el panel aunque estén vacías; las ocultas desaparecen para asesores.
  const delTipo = deCampana.filter((p) => p.tipo === tipoAbierto);
  const registroTipo = estado.carpetas.filter(
    (c) => c.campana === campana && c.tipo === tipoAbierto,
  );
  const ocultasTipo = new Set(registroTipo.filter((c) => c.oculta).map((c) => c.nombre));
  const nombresCarpetas = new Set<string>([
    ...delTipo.map((p) => p.carpeta || '__general__'),
    ...registroTipo.map((c) => c.nombre),
  ]);
  const carpetas = [...nombresCarpetas]
    .filter((nombre) => nombre === '__general__' || esFormador || !ocultasTipo.has(nombre))
    .map((nombre) => ({
      nombre,
      etiqueta: nombre === '__general__' ? 'General' : nombre,
      oculta: ocultasTipo.has(nombre),
    }))
    .sort((a, b) => {
      if (a.nombre === '__general__') return -1;
      if (b.nombre === '__general__') return 1;
      return a.etiqueta.localeCompare(b.etiqueta);
    });

  const listado = delTipo
    .filter((p) => {
      if (carpetaAbierta === null) return false;
      if (carpetaAbierta === '__general__') return !p.carpeta;
      return p.carpeta === carpetaAbierta;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-8">
      {/* Banner corporativo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-marina-950 via-[#0a2a52] to-indra-600 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indra-500/30" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-indra-400/20" />
        <div className="relative">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900/10 ring-1 ring-white/20">
            <GraduationCap className="h-6 w-6 text-indra-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">{nombreCampana}</h1>
          <p className="mt-1 text-sm font-semibold text-indra-500 sm:text-base">
            Formación Indra · Centro autoaprendizaje, formación y entrenamiento
          </p>
          {usuario && (
            <p className="mt-4 text-sm text-white/80">
              Bienvenido de nuevo, <strong className="font-bold text-white">{usuario.nombre}</strong>!
            </p>
          )}
        </div>
      </div>

      {tipoAbierto === null ? (
        <>
          {/* Carpetas de la campaña */}
          <section>
            <h2 className="mb-4 border-b-2 border-slate-200 dark:border-slate-700 pb-2 text-xl font-black text-marina-950 dark:text-slate-100 sm:text-2xl">
              Carpetas de la campaña
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {CATEGORIAS.map(({ tipo, titulo }) => {
                const cantidad = deCampana.filter((p) => p.tipo === tipo).length;
                const pendientes =
                  esFormador || !usuario
                    ? 0
                    : deCampana.filter(
                        (p) => p.tipo === tipo && !ultimoIntento(estado.intentos, usuarioId, p.id),
                      ).length;
                const Icono = tipo === 'continua' ? Route : BookOpen;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoAbierto(tipo)}
                    className="group flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indra-500 hover:shadow-md"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-marina-950 text-indra-500 shadow-md transition-colors group-hover:bg-indra-600 group-hover:text-white">
                      <Folder className="h-7 w-7" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-base font-black text-marina-950 dark:text-slate-100">
                        <Icono className="h-4 w-4 text-indra-600" />
                        {titulo}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        {cantidad} {cantidad === 1 ? 'curso disponible' : 'cursos disponibles'}
                      </span>
                      {pendientes > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Clock className="h-3 w-3" /> {pendientes} pendientes
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Abre una carpeta para ver los cursos de {nombreCampana}.
          </p>
        </>
      ) : carpetaAbierta === null ? (
        /* Subcarpetas de meses */
        <section>
          <button
            type="button"
            onClick={() => setTipoAbierto(null)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors hover:text-indra-600"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a las carpetas
          </button>
          <div className="mb-4 flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700 pb-2">
            <h2 className="text-xl font-black text-marina-950 dark:text-slate-100 sm:text-2xl">{categoriaActual?.titulo}</h2>
            <span className="rounded-full bg-marina-950 px-2.5 py-0.5 text-xs font-bold text-white">
              {delTipo.length}
            </span>
            <span className="hidden rounded-full bg-indra-100 px-2.5 py-0.5 text-[11px] font-bold text-indra-700 sm:inline">
              {nombreCampana}
            </span>
          </div>

          {carpetas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-12 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">{categoriaActual?.vacio}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {carpetas.map((c) => {
                const items = delTipo.filter((p) =>
                  c.nombre === '__general__' ? !p.carpeta : p.carpeta === c.nombre,
                );
                const pendientes =
                  esFormador || !usuario
                    ? 0
                    : items.filter((p) => !ultimoIntento(estado.intentos, usuarioId, p.id),
                      ).length;
                return (
                  <button
                    key={c.nombre}
                    type="button"
                    onClick={() => setCarpetaAbierta(c.nombre)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indra-500 hover:shadow-md"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indra-100 text-indra-600">
                        <CalendarDays className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-marina-950 dark:text-slate-100">{c.etiqueta}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          {items.length} {items.length === 1 ? 'curso' : 'cursos'}
                          {c.oculta && esFormador && (
                            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                              Oculta
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                    {pendientes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                        <Clock className="h-3 w-3" /> {pendientes}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* Listado de la subcarpeta */
        <section>
          <button
            type="button"
            onClick={() => setCarpetaAbierta(null)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors hover:text-indra-600"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a {categoriaActual?.titulo}
          </button>
          <div className="mb-4 flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700 pb-2">
            <h2 className="text-xl font-black text-marina-950 dark:text-slate-100 sm:text-2xl">
              {carpetaAbierta === '__general__' ? 'General' : carpetaAbierta}
            </h2>
            <span className="rounded-full bg-marina-950 px-2.5 py-0.5 text-xs font-bold text-white">
              {listado.length}
            </span>
          </div>

          {listado.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-12 text-center">
              <Folder className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">No hay cursos en esta carpeta.</p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
              {listado.map((p) => {
                const intento = esFormador
                  ? undefined
                  : ultimoIntento(estado.intentos, usuarioId, p.id);
                const Icono = p.tipo === 'continua' ? Route : BookOpen;
                return (
                  <li key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onAbrirPreturno(p.id)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 sm:px-6"
                    >
                      <span className="flex min-w-0 items-center gap-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indra-100 text-indra-600">
                          <Icono className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-indra-700 hover:underline">
                            {p.titulo}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            <span className="capitalize">{formatearFecha(p.fecha)}</span>
                            {' · '}
                            {p.preguntas.length > 0
                              ? `${p.preguntas.length} ${p.preguntas.length === 1 ? 'pregunta' : 'preguntas'}`
                              : 'Sin evaluación'}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {p.campanas.length === 2 && (
                          <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 md:inline">
                            Las 2 campañas
                          </span>
                        )}
                        {esFormador ? (
                          p.oculto ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
                              Oculto
                            </span>
                          ) : !estaDisponible(p) ? (
                            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-600">
                              Habilita{' '}
                              {new Date(p.disponibleDesde!).toLocaleString('es-CO', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : null
                        ) : intento ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {intento.aciertos}/{intento.total}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
                            <Clock className="h-3 w-3" /> Pendiente
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
