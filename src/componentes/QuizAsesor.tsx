import { useEffect, useMemo, useRef, useState } from 'react';
import type { Intento, Pregunta, TipoPrograma } from '../tipos';
import { esRespuestaCorrecta, generarId, palabrasSopa } from '../datos';
import { Award, ChevronLeft, ChevronRight, ClipboardCheck, PlayCircle, RotateCcw, Timer, X } from 'lucide-react';

interface Props {
  preguntas: Pregunta[];
  usuarioId: string;
  usuarioNombre: string;
  intentosPrevios: number;
  limiteIntentos?: number | null;
  /** Tipo de formación: define la duración del quiz (preturno 15 min, continua 1 h) */
  tipoPrograma?: TipoPrograma;
  /** Id de la formación: permite mantener el tiempo aunque se recargue la página */
  preturnoId?: string;
  onGuardarIntento: (intento: Intento) => void;
}

type Respuesta = number | string | null;

/** Duración del quiz según el tipo de formación, en segundos. */
const DURACION_QUIZ: Record<TipoPrograma, number> = {
  preturno: 15 * 60,
  continua: 60 * 60,
};

/** Formatea segundos como m:ss (o mm:ss). */
const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------------------
// Utilidades de mezcla determinista (para que el orden sea estable por sesión)
// ---------------------------------------------------------------------------

function hashSemilla(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(semilla: number): () => number {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Devuelve una copia mezclada del arreglo, determinista según la semilla. */
function mezclar<T>(arreglo: T[], semilla: string): T[] {
  const copia = [...arreglo];
  const rand = prng(hashSemilla(semilla));
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ---------------------------------------------------------------------------
// Sopa de letras: generación del tablero
// ---------------------------------------------------------------------------

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Tamaño máximo del tablero (columnas = filas). */
const SOPA_TAM_MAXIMO = 14;
const DIRECCIONES: [number, number][] = [
  [0, 1], // horizontal →
  [1, 0], // vertical ↓
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↙
];

interface SopaGenerada {
  tam: number;
  celdas: string[][];
  /** Palabra preparada → celdas [fila, col] que ocupa */
  ubicaciones: Record<string, [number, number][]>;
  /** Palabras preparadas que se lograron ubicar */
  incluidas: string[];
}

function generarSopa(palabras: string[], semilla: string): SopaGenerada {
  // Frases divididas en palabras cortas: mantiene el tablero manejable
  const preparadas = palabrasSopa(palabras);
  const masLarga = preparadas.reduce((m, w) => Math.max(m, w.length), 0);
  const tam = Math.min(SOPA_TAM_MAXIMO, Math.max(10, masLarga + 2));
  const rand = prng(hashSemilla(semilla));

  const celdas: string[][] = Array.from({ length: tam }, () => Array(tam).fill(''));
  const ubicaciones: Record<string, [number, number][]> = {};

  const intentarColocar = (palabra: string): boolean => {
    for (let intento = 0; intento < 300; intento++) {
      const [df, dc] = DIRECCIONES[Math.floor(rand() * DIRECCIONES.length)];
      const f0 = Math.floor(rand() * tam);
      const c0 = Math.floor(rand() * tam);
      const fFin = f0 + df * (palabra.length - 1);
      const cFin = c0 + dc * (palabra.length - 1);
      if (fFin < 0 || fFin >= tam || cFin < 0 || cFin >= tam) continue;
      let cabe = true;
      for (let k = 0; k < palabra.length; k++) {
        const actual = celdas[f0 + df * k][c0 + dc * k];
        if (actual && actual !== palabra[k]) {
          cabe = false;
          break;
        }
      }
      if (!cabe) continue;
      const celdasPalabra: [number, number][] = [];
      for (let k = 0; k < palabra.length; k++) {
        const f = f0 + df * k;
        const c = c0 + dc * k;
        celdas[f][c] = palabra[k];
        celdasPalabra.push([f, c]);
      }
      ubicaciones[palabra] = celdasPalabra;
      return true;
    }
    return false;
  };

  for (const palabra of preparadas) intentarColocar(palabra);

  // Colocación de reserva (horizontal, celda por celda) para garantizar que
  // todas las palabras queden en el tablero.
  for (const palabra of preparadas) {
    if (ubicaciones[palabra]) continue;
    exterior: for (let f = 0; f < tam; f++) {
      for (let c0 = 0; c0 <= tam - palabra.length; c0++) {
        let cabe = true;
        for (let k = 0; k < palabra.length; k++) {
          const actual = celdas[f][c0 + k];
          if (actual && actual !== palabra[k]) {
            cabe = false;
            break;
          }
        }
        if (!cabe) continue;
        const celdasPalabra: [number, number][] = [];
        for (let k = 0; k < palabra.length; k++) {
          celdas[f][c0 + k] = palabra[k];
          celdasPalabra.push([f, c0 + k]);
        }
        ubicaciones[palabra] = celdasPalabra;
        break exterior;
      }
    }
  }

  // Rellena los espacios vacíos con letras aleatorias
  for (let f = 0; f < tam; f++) {
    for (let c = 0; c < tam; c++) {
      if (!celdas[f][c]) celdas[f][c] = LETRAS[Math.floor(rand() * LETRAS.length)];
    }
  }

  return { tam, celdas, ubicaciones, incluidas: preparadas };
}

// ---------------------------------------------------------------------------
// Componente interactivo de la sopa de letras
// ---------------------------------------------------------------------------

const COLORES_PALABRA = [
  'bg-emerald-200 text-emerald-900',
  'bg-sky-200 text-sky-900',
  'bg-amber-200 text-amber-900',
  'bg-rose-200 text-rose-900',
  'bg-violet-200 text-violet-900',
  'bg-lime-200 text-lime-900',
  'bg-cyan-200 text-cyan-900',
  'bg-orange-200 text-orange-900',
];

function SopaDeLetras({
  pregunta,
  valor,
  onResponder,
}: {
  pregunta: Pregunta;
  valor: string | null;
  onResponder: (texto: string | null) => void;
}) {
  const palabrasOriginales = pregunta.palabras ?? [];
  const sopa = useMemo(
    () => generarSopa(palabrasOriginales, pregunta.id),
    [palabrasOriginales, pregunta.id],
  );
  const [seleccion, setSeleccion] = useState<[number, number] | null>(null);

  const encontradas = useMemo(
    () => (valor ? valor.split('|').filter(Boolean) : []),
    [valor],
  );

  // Mapa celda → índice de palabra encontrada (para colorear)
  const celdasMarcadas = useMemo(() => {
    const mapa = new Map<string, number>();
    encontradas.forEach((palabra) => {
      const idx = sopa.incluidas.indexOf(palabra);
      for (const [f, c] of sopa.ubicaciones[palabra] ?? []) {
        mapa.set(`${f}-${c}`, idx >= 0 ? idx : 0);
      }
    });
    return mapa;
  }, [encontradas, sopa]);

  const alTocar = (f: number, c: number) => {
    if (!seleccion) {
      setSeleccion([f, c]);
      return;
    }
    const [f0, c0] = seleccion;
    const df = f - f0;
    const dc = c - c0;
    // Solo líneas rectas: horizontal, vertical o diagonal
    const enLinea = df === 0 || dc === 0 || Math.abs(df) === Math.abs(dc);
    if (enLinea && (df !== 0 || dc !== 0)) {
      const pasos = Math.max(Math.abs(df), Math.abs(dc));
      const sf = Math.sign(df);
      const sc = Math.sign(dc);
      let texto = '';
      for (let k = 0; k <= pasos; k++) texto += sopa.celdas[f0 + sf * k][c0 + sc * k];
      const invertido = texto.split('').reverse().join('');
      const pendientes = sopa.incluidas.filter((w) => !encontradas.includes(w));
      const hallada = pendientes.find((w) => w === texto || w === invertido);
      if (hallada) {
        onResponder([...encontradas, hallada].join('|'));
        setSeleccion(null);
        return;
      }
    }
    // No coincidió: la celda tocada pasa a ser el nuevo inicio
    setSeleccion(f === f0 && c === c0 ? null : [f, c]);
  };

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        Toca la primera letra de una palabra y luego la última para marcarla (horizontal, vertical o diagonal).
      </p>
      <div
        className="inline-grid gap-0.5 rounded-lg bg-slate-100 p-2 select-none"
        style={{ gridTemplateColumns: `repeat(${sopa.tam}, minmax(0, 1fr))` }}
      >
        {sopa.celdas.map((fila, f) =>
          fila.map((letra, c) => {
            const marcada = celdasMarcadas.get(`${f}-${c}`);
            const esSeleccion = seleccion?.[0] === f && seleccion?.[1] === c;
            return (
              <button
                key={`${f}-${c}`}
                type="button"
                onClick={() => alTocar(f, c)}
                className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold transition-colors sm:h-7 sm:w-7 sm:text-xs ${
                  esSeleccion
                    ? 'bg-indra-600 text-white'
                    : marcada !== undefined
                      ? COLORES_PALABRA[marcada % COLORES_PALABRA.length]
                      : 'bg-white text-slate-700 hover:bg-indra-100'
                }`}
              >
                {letra}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sopa.incluidas.map((palabra, i) => {
          const hallada = encontradas.includes(palabra);
          return (
            <span
              key={i}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                hallada
                  ? 'bg-emerald-100 text-emerald-700 line-through'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {palabra}
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">
        {encontradas.length} de {sopa.incluidas.length} palabras encontradas
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export default function QuizAsesor({
  preguntas,
  usuarioId,
  usuarioNombre,
  intentosPrevios,
  limiteIntentos,
  tipoPrograma = 'preturno',
  preturnoId = '',
  onGuardarIntento,
}: Props) {
  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuesta[]>(() => preguntas.map(() => null));
  const [terminado, setTerminado] = useState(false);
  const [expirado, setExpirado] = useState(false);

  const duracion = DURACION_QUIZ[tipoPrograma];
  const claveTiempo = `quiz-inicio-${preturnoId}-${usuarioId}`;
  // El quiz solo arranca cuando el asesor presiona «Empezar quiz».
  // Si ya había un intento en curso (p. ej. recarga de página), se retoma directamente.
  const [iniciado, setIniciado] = useState(() => {
    try {
      return Number(sessionStorage.getItem(claveTiempo)) > 0;
    } catch {
      return false;
    }
  });
  const [restante, setRestante] = useState(duracion);
  const enviadoRef = useRef(false);

  const total = preguntas.length;
  const pregunta = preguntas[actual];
  const tipo = pregunta.tipo ?? 'opcion';
  const respuestaActual = respuestas[actual] ?? null;

  /** ¿La pregunta actual ya cuenta como respondida según su tipo? */
  const respondida = (p: Pregunta, r: Respuesta): boolean => {
    if (r === null || r === undefined) return false;
    const t = p.tipo ?? 'opcion';
    if (typeof r === 'number') return true;
    switch (t) {
      case 'completar':
      case 'abierta':
        return r.trim().length > 0;
      case 'secuencia':
        return r.split(',').filter(Boolean).length === p.opciones.length;
      case 'emparejamiento':
        return r.split(',').filter(Boolean).length === (p.pares?.length ?? 0);
      case 'sopa':
        // La respuesta acumula las palabras de la lista preparada (palabrasSopa),
        // que puede diferir de la lista original (frases divididas, palabras largas descartadas).
        return r.split('|').filter(Boolean).length === palabrasSopa(p.palabras ?? []).length;
      default:
        return false;
    }
  };

  const contestadas = respuestas.filter((r, i) => respondida(preguntas[i], r)).length;
  const bloqueado = limiteIntentos != null && intentosPrevios >= limiteIntentos;

  const responder = (valor: Respuesta) => {
    setRespuestas((prev) => prev.map((r, i) => (i === actual ? valor : r)));
  };

  const contarAciertos = () =>
    preguntas.reduce((suma, p, i) => suma + (esRespuestaCorrecta(p, respuestas[i]) ? 1 : 0), 0);

  /** Envía el intento. `porTiempo` = envío automático al agotarse el cronómetro. */
  const finalizar = (porTiempo = false) => {
    if (enviadoRef.current) return;
    enviadoRef.current = true;
    try {
      sessionStorage.removeItem(claveTiempo);
    } catch {
      // sin almacenamiento de sesión: el timer simplemente reinicia
    }
    setExpirado(porTiempo);
    setTerminado(true);
    onGuardarIntento({
      id: generarId(),
      preturnoId: '',
      usuarioId,
      usuarioNombre,
      aciertos: contarAciertos(),
      total,
      respuestas: [...respuestas],
      fecha: new Date().toISOString(),
    });
  };

  // Cronómetro: arranca al presionar «Empezar quiz» y sobrevive recargas de página.
  useEffect(() => {
    if (!iniciado || terminado || bloqueado) return;
    let inicio = Date.now();
    try {
      const guardado = Number(sessionStorage.getItem(claveTiempo));
      if (Number.isFinite(guardado) && guardado > 0) {
        inicio = guardado; // ya estaba en curso: continúa donde iba
      } else {
        sessionStorage.setItem(claveTiempo, String(inicio));
      }
    } catch {
      // sin sessionStorage: cronómetro de sesión simple
    }
    const actualizar = () =>
      setRestante(Math.max(0, duracion - Math.floor((Date.now() - inicio) / 1000)));
    actualizar();
    const tictac = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(tictac);
  }, [iniciado, terminado, bloqueado, claveTiempo, duracion]);

  // Al llegar a cero se envía automáticamente lo respondido (lo no respondido queda sin respuesta).
  useEffect(() => {
    if (restante > 0 || terminado || bloqueado || enviadoRef.current) return;
    finalizar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante, terminado, bloqueado]);

  const reiniciar = () => {
    if (bloqueado) return;
    enviadoRef.current = false;
    try {
      sessionStorage.removeItem(claveTiempo);
    } catch {
      // ignorar
    }
    setRespuestas(preguntas.map(() => null));
    setActual(0);
    setTerminado(false);
    setExpirado(false);
    setRestante(duracion);
  };

  // Los hooks deben ejecutarse SIEMPRE antes de cualquier return condicional
  // (si no, React crashea al cambiar el número de hooks entre renders).

  // --- Secuencia: ítems mezclados de forma estable ---
  const itemsSecuencia = useMemo(
    () =>
      tipo === 'secuencia'
        ? mezclar(
            pregunta.opciones.map((texto, idx) => ({ texto, idx })),
            pregunta.id,
          )
        : [],
    [tipo, pregunta.id, pregunta.opciones],
  );

  // --- Emparejamiento: derechas mezcladas de forma estable ---
  const derechasMezcladas = useMemo(
    () =>
      tipo === 'emparejamiento'
        ? mezclar(
            (pregunta.pares ?? []).map((par, idx) => ({ texto: par.derecha, idx })),
            pregunta.id,
          )
        : [],
    [tipo, pregunta.id, pregunta.pares],
  );

  const mapaEmparejamiento: Record<number, number> = useMemo(() => {
    const mapa: Record<number, number> = {};
    if (tipo === 'emparejamiento' && typeof respuestaActual === 'string') {
      for (const trozo of respuestaActual.split(',').filter(Boolean)) {
        const [i, d] = trozo.split(':').map(Number);
        if (Number.isInteger(i) && Number.isInteger(d)) mapa[i] = d;
      }
    }
    return mapa;
  }, [tipo, respuestaActual]);

  if (bloqueado) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Award className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-marina-950 dark:text-slate-100">Límite de intentos alcanzado</h3>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Ya usaste {intentosPrevios} de {limiteIntentos} intento{limiteIntentos !== 1 ? 's' : ''} permitido
          {limiteIntentos !== 1 ? 's' : ''}.
        </p>
        <p className="max-w-72 text-xs text-slate-500 dark:text-slate-400">
          Si necesitas otro intento, solicítalo al formador o supervisor.
        </p>
      </div>
    );
  }

  if (terminado) {
    const aciertos = contarAciertos();
    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;
    const aprobado = porcentaje >= 70;

    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            aprobado ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <Award className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-marina-950 dark:text-slate-100">
          {expirado ? 'Tiempo agotado' : aprobado ? '¡Buen trabajo!' : 'Evaluación terminada'}
        </h3>
        <p className="text-4xl font-black text-indra-600">
          {aciertos} <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">/ {total}</span>
        </p>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Puntaje obtenido: {porcentaje}%</p>
        {expirado && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Se agotó el tiempo y la evaluación se envió automáticamente con las preguntas que llevabas.
          </p>
        )}
        <p className="max-w-72 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Tu resultado quedó registrado en el sistema{aprobado ? ' y supera el 70% requerido.' : '.'}
        </p>
        <button
          type="button"
          onClick={reiniciar}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-indra-600 px-4 py-2 text-sm font-semibold text-indra-600 transition-colors hover:bg-indra-100"
        >
          <RotateCcw className="h-4 w-4" /> Intentar de nuevo
        </button>
      </div>
    );
  }

  // Pantalla previa: el asesor decide cuándo comenzar (el tiempo empieza al pulsar el botón).
  if (!iniciado) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indra-100 text-indra-600">
          <ClipboardCheck className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-marina-950 dark:text-slate-100">
          Evaluación de {total} pregunta{total !== 1 ? 's' : ''}
        </h3>
        <p className="max-w-72 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Antes de comenzar, revisa el material de la sesión con calma.
        </p>
        <p className="max-w-72 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Duración: {duracion / 60} minutos. Al pulsar el botón el cronómetro comienza y no se
          puede pausar; al agotarse, la evaluación se envía automáticamente.
        </p>
        <button
          type="button"
          onClick={() => setIniciado(true)}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-indra-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indra-700"
        >
          <PlayCircle className="h-5 w-5" /> Empezar quiz
        </button>
      </div>
    );
  }

  const esUltima = actual === total - 1;
  const puedeAvanzar = respondida(pregunta, respuestaActual);
  const urgente = restante <= 60;
  const pronto = restante <= duracion * 0.25;
  const ordenElegido: number[] =
    tipo === 'secuencia' && typeof respuestaActual === 'string'
      ? respuestaActual.split(',').filter(Boolean).map(Number)
      : [];

  const ETIQUETA_TIPO: Record<string, string> = {
    verdaderofalso: 'Verdadero / Falso',
    completar: 'Rellenar espacios',
    caso: 'Caso práctico',
    secuencia: 'Ordenamiento',
    emparejamiento: 'Emparejamiento',
    abierta: 'Respuesta abierta',
    sopa: 'Sopa de letras',
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-indra-600">
          Pregunta {actual + 1} de {total}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {contestadas} de {total} respondidas
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
              urgente
                ? 'animate-pulse bg-red-100 text-red-700'
                : pronto
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-indra-100 text-indra-700'
            }`}
            title={`Tiempo límite: ${duracion / 60} minutos`}
          >
            <Timer className="h-3.5 w-3.5" />
            {mmss(restante)}
          </span>
        </div>
      </div>
      <p className="mb-4 text-[11px] text-slate-400 dark:text-slate-500">
        Tiempo límite: {duracion / 60} minutos · al agotarse, la evaluación se envía automáticamente.
      </p>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-indra-500 transition-all duration-300"
          style={{ width: `${(contestadas / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      {ETIQUETA_TIPO[tipo] && (
        <span className="mb-2 inline-flex w-fit rounded-full bg-indra-100 px-2.5 py-0.5 text-[11px] font-bold text-indra-700">
          {ETIQUETA_TIPO[tipo]}
        </span>
      )}

      {/* Escenario del caso práctico */}
      {tipo === 'caso' && pregunta.escenario && (
        <div className="mb-3 rounded-lg border-l-4 border-indra-500 bg-indra-50 px-4 py-3 text-sm italic text-slate-700 dark:text-slate-300">
          {pregunta.escenario}
        </div>
      )}

      <p className="mb-4 text-base font-semibold text-marina-950 dark:text-slate-100">{pregunta.pregunta}</p>

      {/* Opción múltiple / Verdadero-Falso / Caso práctico */}
      {(tipo === 'opcion' || tipo === 'verdaderofalso' || tipo === 'caso') && (
        <div className="space-y-2">
          {pregunta.opciones.map((opcion, i) => {
            const marcada = respuestaActual === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => responder(i)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  marcada
                    ? 'border-indra-600 bg-indra-100 font-semibold text-marina-950 dark:text-slate-100'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-indra-500 hover:bg-indra-100/40'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    marcada ? 'border-indra-600 bg-indra-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {opcion}
              </button>
            );
          })}
        </div>
      )}

      {/* Rellenar espacios */}
      {tipo === 'completar' && (
        <div>
          <label htmlFor={`completar-${pregunta.id}`} className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
            Escribe tu respuesta
          </label>
          <input
            id={`completar-${pregunta.id}`}
            type="text"
            value={typeof respuestaActual === 'string' ? respuestaActual : ''}
            onChange={(e) => responder(e.target.value)}
            placeholder="Escribe aquí la palabra o frase que completa el espacio…"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-marina-950 dark:text-slate-100 focus:border-indra-500 focus:ring-2 focus:ring-indra-500/30 focus:outline-none"
          />
        </div>
      )}

      {/* Respuesta corta abierta */}
      {tipo === 'abierta' && (
        <div>
          <label htmlFor={`abierta-${pregunta.id}`} className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
            Escribe tu respuesta con tus propias palabras
          </label>
          <textarea
            id={`abierta-${pregunta.id}`}
            value={typeof respuestaActual === 'string' ? respuestaActual : ''}
            onChange={(e) => responder(e.target.value)}
            placeholder="Desarrolla tu respuesta aquí…"
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-marina-950 dark:text-slate-100 focus:border-indra-500 focus:ring-2 focus:ring-indra-500/30 focus:outline-none"
          />
        </div>
      )}

      {/* Ordenamiento o secuencia */}
      {tipo === 'secuencia' && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              Toca los pasos en el orden correcto:
            </p>
            <div className="flex flex-wrap gap-2">
              {itemsSecuencia
                .filter((item) => !ordenElegido.includes(item.idx))
                .map((item) => (
                  <button
                    key={item.idx}
                    type="button"
                    onClick={() => responder([...ordenElegido, item.idx].join(','))}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:border-indra-500 hover:bg-indra-50"
                  >
                    {item.texto}
                  </button>
                ))}
              {itemsSecuencia.every((item) => ordenElegido.includes(item.idx)) && (
                <span className="text-xs text-slate-400">Todos los pasos están ordenados abajo.</span>
              )}
            </div>
          </div>
          {ordenElegido.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">Tu orden:</p>
              <ol className="space-y-1.5">
                {ordenElegido.map((idx, pos) => (
                  <li
                    key={`${idx}-${pos}`}
                    className="flex items-center gap-2 rounded-lg border border-indra-200 bg-indra-50 px-3 py-2 text-sm font-semibold text-marina-950 dark:text-slate-100"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indra-600 text-[11px] font-bold text-white">
                      {pos + 1}
                    </span>
                    <span className="flex-1">{pregunta.opciones[idx]}</span>
                    <button
                      type="button"
                      onClick={() =>
                        responder(
                          ordenElegido.filter((x) => x !== idx).join(',') || null,
                        )
                      }
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Quitar paso ${pos + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Emparejamiento */}
      {tipo === 'emparejamiento' && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Elige la definición que corresponde a cada concepto:
          </p>
          {(pregunta.pares ?? []).map((par, i) => {
            const usadasPorOtros = new Set(
              Object.entries(mapaEmparejamiento)
                .filter(([k]) => Number(k) !== i)
                .map(([, v]) => v),
            );
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="min-w-32 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-marina-950 dark:text-slate-100">
                  {par.izquierda}
                </span>
                <select
                  value={mapaEmparejamiento[i] !== undefined ? String(mapaEmparejamiento[i]) : ''}
                  onChange={(e) => {
                    const nuevo = { ...mapaEmparejamiento };
                    if (e.target.value === '') delete nuevo[i];
                    else nuevo[i] = Number(e.target.value);
                    const texto = Object.entries(nuevo)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([k, v]) => `${k}:${v}`)
                      .join(',');
                    responder(texto || null);
                  }}
                  className="min-w-44 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-marina-950 dark:text-slate-100 focus:border-indra-500 focus:ring-2 focus:ring-indra-500/30 focus:outline-none"
                >
                  <option value="">Selecciona…</option>
                  {derechasMezcladas.map((d) => (
                    <option key={d.idx} value={d.idx} disabled={usadasPorOtros.has(d.idx)}>
                      {d.texto}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Sopa de letras */}
      {tipo === 'sopa' && (
        <SopaDeLetras
          pregunta={pregunta}
          valor={typeof respuestaActual === 'string' ? respuestaActual : null}
          onResponder={(texto) => responder(texto)}
        />
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActual(Math.max(0, actual - 1))}
          disabled={actual === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors enabled:hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>

        {esUltima ? (
          <button
            type="button"
            onClick={() => finalizar(false)}
            disabled={!puedeAvanzar || contestadas < total}
            title={contestadas < total ? 'Responde todas las preguntas para finalizar' : undefined}
            className="rounded-lg bg-indra-600 px-5 py-2 text-sm font-bold text-white transition-colors enabled:hover:bg-indra-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Finalizar evaluación
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActual(actual + 1)}
            disabled={!puedeAvanzar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indra-600 px-5 py-2 text-sm font-bold text-white transition-colors enabled:hover:bg-indra-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
