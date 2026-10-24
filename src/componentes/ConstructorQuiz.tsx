import type { Pregunta, TipoPregunta } from '../tipos';
import { generarId, preguntaCompleta } from '../datos';
import {
  BookOpen,
  Check,
  Grid3x3,
  Link2,
  ListChecks,
  ListOrdered,
  MessageSquare,
  PenLine,
  Plus,
  PlusCircle,
  ToggleLeft,
  Trash2,
} from 'lucide-react';

interface Props {
  preguntas: Pregunta[];
  onChange: (preguntas: Pregunta[]) => void;
}

const TIPOS: { id: TipoPregunta; etiqueta: string; icono: typeof ListChecks }[] = [
  { id: 'opcion', etiqueta: 'Opción múltiple', icono: ListChecks },
  { id: 'verdaderofalso', etiqueta: 'Verdadero / Falso', icono: ToggleLeft },
  { id: 'completar', etiqueta: 'Rellenar espacios', icono: PenLine },
  { id: 'caso', etiqueta: 'Caso práctico', icono: BookOpen },
  { id: 'secuencia', etiqueta: 'Ordenamiento', icono: ListOrdered },
  { id: 'emparejamiento', etiqueta: 'Emparejamiento', icono: Link2 },
  { id: 'abierta', etiqueta: 'Respuesta abierta', icono: MessageSquare },
  { id: 'sopa', etiqueta: 'Sopa de letras', icono: Grid3x3 },
];

const inputClase =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indra-500 focus:ring-2 focus:ring-indra-500/30 focus:outline-none';
const inputVerde =
  'w-full rounded-lg border border-emerald-300 bg-emerald-50/50 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none';

function nuevaPregunta(tipo: TipoPregunta): Pregunta {
  const base: Pregunta = {
    id: generarId(),
    tipo,
    pregunta: '',
    opciones: [],
    respuestaCorrecta: 0,
  };
  switch (tipo) {
    case 'verdaderofalso':
      return { ...base, opciones: ['Verdadero', 'Falso'] };
    case 'completar':
      return { ...base, respuestaTexto: '' };
    case 'caso':
      return { ...base, escenario: '', opciones: ['', '', '', ''] };
    case 'secuencia':
      return { ...base, opciones: ['', '', ''] };
    case 'emparejamiento':
      return {
        ...base,
        pares: [
          { izquierda: '', derecha: '' },
          { izquierda: '', derecha: '' },
          { izquierda: '', derecha: '' },
        ],
      };
    case 'abierta':
      return { ...base, respuestasAceptadas: [] };
    case 'sopa':
      return { ...base, palabras: ['', '', ''] };
    default:
      return { ...base, tipo: 'opcion', opciones: ['', '', '', ''] };
  }
}

export default function ConstructorQuiz({ preguntas, onChange }: Props) {
  const agregar = (tipo: TipoPregunta) => {
    onChange([...preguntas, nuevaPregunta(tipo)]);
  };

  const actualizar = (id: string, cambios: Partial<Pregunta>) => {
    onChange(preguntas.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  };

  const cambiarTipo = (id: string, tipo: TipoPregunta) => {
    onChange(
      preguntas.map((p) => {
        if (p.id !== id) return p;
        const base = nuevaPregunta(tipo);
        return { ...base, id: p.id, pregunta: p.pregunta };
      }),
    );
  };

  const actualizarOpcion = (id: string, indice: number, texto: string) => {
    onChange(
      preguntas.map((p) =>
        p.id === id
          ? { ...p, opciones: p.opciones.map((o, i) => (i === indice ? texto : o)) }
          : p,
      ),
    );
  };

  const actualizarPar = (id: string, indice: number, campo: 'izquierda' | 'derecha', texto: string) => {
    onChange(
      preguntas.map((p) =>
        p.id === id
          ? {
              ...p,
              pares: (p.pares ?? []).map((par, i) =>
                i === indice ? { ...par, [campo]: texto } : par,
              ),
            }
          : p,
      ),
    );
  };

  const actualizarPalabra = (id: string, indice: number, texto: string) => {
    onChange(
      preguntas.map((p) =>
        p.id === id
          ? { ...p, palabras: (p.palabras ?? []).map((w, i) => (i === indice ? texto : w)) }
          : p,
      ),
    );
  };

  const quitar = (id: string) => onChange(preguntas.filter((p) => p.id !== id));

  const hayInvalidas = preguntas.some((p) => !preguntaCompleta(p));

  const tipoDe = (p: Pregunta): TipoPregunta => p.tipo ?? 'opcion';

  return (
    <div className="space-y-4">
      {preguntas.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Aún no hay preguntas. Agrega al menos una para activar la evaluación de esta sesión.
        </p>
      )}

      {preguntas.map((p, indice) => {
        const invalida = !preguntaCompleta(p);
        const tipo = tipoDe(p);
        return (
          <div
            key={p.id}
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              invalida ? 'border-amber-300' : 'border-slate-200'
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold text-marina-950">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indra-100 text-xs text-indra-700">
                  {indice + 1}
                </span>
                Pregunta {indice + 1}
                {invalida && (
                  <span className="text-xs font-medium text-amber-600">· completa todos los campos</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => quitar(p.id)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Eliminar pregunta ${indice + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Selector de tipo de pregunta */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TIPOS.map(({ id, etiqueta, icono: Icono }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => cambiarTipo(p.id, id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    tipo === id
                      ? 'border-indra-600 bg-indra-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-indra-500 hover:text-indra-600'
                  }`}
                >
                  <Icono className="h-3.5 w-3.5" /> {etiqueta}
                </button>
              ))}
            </div>

            {/* Escenario (solo casos prácticos) */}
            {tipo === 'caso' && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  Escenario o caso práctico *
                </label>
                <textarea
                  value={p.escenario ?? ''}
                  onChange={(e) => actualizar(p.id, { escenario: e.target.value })}
                  placeholder="Describe la situación: 'Un cliente crítico llama molesto porque su servicio falló dos veces esta semana…'"
                  rows={3}
                  className={`${inputClase} resize-y`}
                />
              </div>
            )}

            <input
              type="text"
              value={p.pregunta}
              onChange={(e) => actualizar(p.id, { pregunta: e.target.value })}
              placeholder={
                tipo === 'completar'
                  ? 'Escribe el enunciado. Usa ___ para marcar el espacio a completar…'
                  : tipo === 'caso'
                    ? '¿Qué debería hacer el asesor en esta situación?…'
                    : tipo === 'secuencia'
                      ? '¿Cuál es el orden correcto de estos pasos?…'
                      : tipo === 'emparejamiento'
                        ? 'Relaciona cada concepto con su definición…'
                        : tipo === 'abierta'
                          ? 'Escribe la pregunta abierta…'
                          : tipo === 'sopa'
                            ? 'Encuentra las palabras clave del tema…'
                            : 'Escribe la pregunta…'
              }
              className={inputClase}
            />

            {/* Selección múltiple y caso práctico comparten el editor de opciones */}
            {(tipo === 'opcion' || tipo === 'caso') && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {p.opciones.map((opcion, i) => {
                    const esCorrecta = p.respuestaCorrecta === i;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => actualizar(p.id, { respuestaCorrecta: i })}
                          title={esCorrecta ? 'Respuesta correcta' : 'Marcar como respuesta correcta'}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            esCorrecta
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white text-slate-400 hover:border-emerald-400 hover:text-emerald-500'
                          }`}
                        >
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </button>
                        <input
                          type="text"
                          value={opcion}
                          onChange={(e) => actualizarOpcion(p.id, i, e.target.value)}
                          placeholder={`Opción ${i + 1}`}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indra-500 focus:ring-2 focus:ring-indra-500/30 focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Toca el círculo verde para marcar la respuesta correcta.
                </p>
              </>
            )}

            {/* Verdadero / Falso */}
            {tipo === 'verdaderofalso' && (
              <>
                <div className="mt-3 flex gap-2">
                  {['Verdadero', 'Falso'].map((etiqueta, i) => {
                    const esCorrecta = p.respuestaCorrecta === i;
                    return (
                      <button
                        key={etiqueta}
                        type="button"
                        onClick={() => actualizar(p.id, { respuestaCorrecta: i })}
                        className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors ${
                          esCorrecta
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        {etiqueta}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  El botón verde es la respuesta correcta de la afirmación.
                </p>
              </>
            )}

            {/* Rellenar espacios */}
            {tipo === 'completar' && (
              <>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    Respuesta correcta (lo que el asesor debe escribir) *
                  </label>
                  <input
                    type="text"
                    value={p.respuestaTexto ?? ''}
                    onChange={(e) => actualizar(p.id, { respuestaTexto: e.target.value })}
                    placeholder="Ej.: gestión de riesgos"
                    className={inputVerde}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Se califica correcta aunque el asesor la escriba con mayúsculas o sin tildes.
                </p>
              </>
            )}

            {/* Ordenamiento o secuencia */}
            {tipo === 'secuencia' && (
              <>
                <div className="mt-3 space-y-2">
                  {p.opciones.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indra-100 text-xs font-bold text-indra-700">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => actualizarOpcion(p.id, i, e.target.value)}
                        placeholder={`Paso ${i + 1} (en el orden correcto)`}
                        className={inputClase}
                      />
                      {p.opciones.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            actualizar(p.id, { opciones: p.opciones.filter((_, x) => x !== i) })
                          }
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Quitar paso ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {p.opciones.length < 8 && (
                  <button
                    type="button"
                    onClick={() => actualizar(p.id, { opciones: [...p.opciones, ''] })}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indra-500 px-3 py-1.5 text-xs font-bold text-indra-700 hover:bg-indra-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar paso
                  </button>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  Escríbelos en el orden correcto; al asesor se le mostrarán mezclados para ordenarlos.
                </p>
              </>
            )}

            {/* Emparejamiento */}
            {tipo === 'emparejamiento' && (
              <>
                <div className="mt-3 space-y-2">
                  {(p.pares ?? []).map((par, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={par.izquierda}
                        onChange={(e) => actualizarPar(p.id, i, 'izquierda', e.target.value)}
                        placeholder={`Concepto ${i + 1}`}
                        className={inputClase}
                      />
                      <span className="shrink-0 text-slate-400">=</span>
                      <input
                        type="text"
                        value={par.derecha}
                        onChange={(e) => actualizarPar(p.id, i, 'derecha', e.target.value)}
                        placeholder="Su definición correcta"
                        className={inputVerde}
                      />
                      {(p.pares?.length ?? 0) > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            actualizar(p.id, {
                              pares: (p.pares ?? []).filter((_, x) => x !== i),
                            })
                          }
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Quitar par ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {(p.pares?.length ?? 0) < 8 && (
                  <button
                    type="button"
                    onClick={() =>
                      actualizar(p.id, {
                        pares: [...(p.pares ?? []), { izquierda: '', derecha: '' }],
                      })
                    }
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indra-500 px-3 py-1.5 text-xs font-bold text-indra-700 hover:bg-indra-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar par
                  </button>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  El asesor verá los conceptos a la izquierda y las definiciones mezcladas a la derecha.
                </p>
              </>
            )}

            {/* Respuesta corta abierta */}
            {tipo === 'abierta' && (
              <>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    Respuestas aceptadas (opcional, separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={(p.respuestasAceptadas ?? []).join(', ')}
                    onChange={(e) =>
                      actualizar(p.id, {
                        respuestasAceptadas: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Ej.: empatía, escuchar al cliente, escucha activa"
                    className={inputVerde}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Si defines respuestas, la pregunta se califica sola comparando con ellas (sin
                  tildes ni mayúsculas). Si la dejas vacía, cuenta como correcta con solo responder
                  (pregunta de reflexión).
                </p>
              </>
            )}

            {/* Sopa de letras */}
            {tipo === 'sopa' && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(p.palabras ?? []).map((palabra, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indra-100 text-xs font-bold text-indra-700">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={palabra}
                        onChange={(e) => actualizarPalabra(p.id, i, e.target.value)}
                        placeholder={`Palabra ${i + 1}`}
                        className={inputClase}
                      />
                      {(p.palabras?.length ?? 0) > 3 && (
                        <button
                          type="button"
                          onClick={() =>
                            actualizar(p.id, {
                              palabras: (p.palabras ?? []).filter((_, x) => x !== i),
                            })
                          }
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Quitar palabra ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {(p.palabras?.length ?? 0) < 10 && (
                  <button
                    type="button"
                    onClick={() =>
                      actualizar(p.id, { palabras: [...(p.palabras ?? []), ''] })
                    }
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indra-500 px-3 py-1.5 text-xs font-bold text-indra-700 hover:bg-indra-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar palabra
                  </button>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  La sopa de letras se genera automáticamente (mínimo 3, máximo 10 palabras).
                  Usa palabras cortas de hasta 12 letras; si escribes una frase se usan sus
                  palabras sueltas. El asesor la resuelve tocando la primera y la última letra
                  de cada palabra.
                </p>
              </>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Agregar pregunta
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {TIPOS.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => agregar(id)}
              className="inline-flex items-center gap-2 rounded-lg border border-indra-600 px-4 py-2 text-sm font-semibold text-indra-600 transition-colors hover:bg-indra-100"
            >
              <PlusCircle className="h-4 w-4" /> {etiqueta}
            </button>
          ))}
          {hayInvalidas && (
            <span className="text-xs font-medium text-amber-600">
              Hay preguntas incompletas: no se podrá guardar hasta completarlas.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
