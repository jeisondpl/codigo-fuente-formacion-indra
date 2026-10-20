import { useState } from 'react';
import type { EstadoApp, Intento } from '../tipos';
import { etiquetasDeCampanas, etiquetaPrograma, esRespuestaCorrecta, fechaHoyISO, formatearFecha, textoCorrecta, textoRespuesta } from '../datos';
import { descargarExcel, fechaDeMarca } from '../exportar';
import { usarArchivoUrl } from '../usarArchivo';
import { useStore } from '../store';
import VisorMaterial from '../componentes/VisorMaterial';
import QuizAsesor from '../componentes/QuizAsesor';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileStack,
  XCircle,
} from 'lucide-react';

interface Props {
  preturnoId: string;
  estado: EstadoApp;
  usuarioId: string;
  usuarioNombre: string;
  esFormador: boolean;
  onVolver: () => void;
}

const inputClase =
  'rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs focus:border-indra-500 focus:outline-none';

export default function PreturnoVista({
  preturnoId,
  estado,
  usuarioId,
  usuarioNombre,
  esFormador,
  onVolver,
}: Props) {
  const { guardarIntento, eliminarIntentos } = useStore();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const preturno = estado.preturnos.find((p) => p.id === preturnoId);
  const urlPortada = usarArchivoUrl(preturno?.portada);

  if (!preturno) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
        <p className="font-semibold text-slate-600 dark:text-slate-300">No se encontró este preturno.</p>
        <button
          type="button"
          onClick={onVolver}
          className="mt-4 rounded-lg bg-indra-600 px-4 py-2 text-sm font-bold text-white hover:bg-indra-700"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // Aislamiento de progreso: el asesor solo ve sus propios registros; el formador ve todos.
  const intentos = estado.intentos.filter(
    (i) => i.preturnoId === preturno.id && (esFormador || i.usuarioId === usuarioId),
  );

  const intentosOrdenados = [...intentos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const filtrarPorFechas = (lista: Intento[]) =>
    lista.filter((i) => {
      const f = fechaDeMarca(i.fecha);
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    });

  const alternarSeleccion = (id: string) => {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const eliminarSeleccionados = () => {
    eliminarIntentos([...seleccion]);
    setSeleccion(new Set());
  };

  const descargar = (soloFiltrados: boolean) => {
    const base = soloFiltrados ? filtrarPorFechas(intentosOrdenados) : intentosOrdenados;
    const filas: (string | number)[][] = [
      [
        'Campaña',
        'Programa',
        'Formación',
        'Asesor',
        'Documento',
        'Fecha intento',
        'Aciertos',
        'Total',
        'Nota %',
        ...preturno.preguntas.map((_, idx) => `P${idx + 1}`),
        'Preguntas falladas',
      ],
    ];
    for (const i of base) {
      const usuario = estado.usuarios.find((u) => u.id === i.usuarioId);
      const nota = i.total > 0 ? Math.round((i.aciertos / i.total) * 100) : 0;
      const porPregunta = preturno.preguntas.map((pregunta, idx) => {
        const elegida = i.respuestas?.[idx];
        if (elegida === undefined || elegida === null) return 'Sin responder';
        return esRespuestaCorrecta(pregunta, elegida)
          ? 'Correcta'
          : `Falló (eligió: ${textoRespuesta(pregunta, elegida)})`;
      });
      const falladas = preturno.preguntas
        .map((pregunta, idx) => ({ pregunta, idx, elegida: i.respuestas?.[idx] }))
        .filter(
          ({ pregunta, elegida }) =>
            elegida !== undefined && elegida !== null && !esRespuestaCorrecta(pregunta, elegida),
        )
        .map(
          ({ pregunta, idx, elegida }) =>
            `P${idx + 1}: eligió "${textoRespuesta(pregunta, elegida)}" (correcta: "${textoCorrecta(pregunta)}")`,
        )
        .join(' | ');
      filas.push([
        etiquetasDeCampanas(preturno.campanas),
        etiquetaPrograma(preturno.tipo),
        preturno.titulo,
        i.usuarioNombre,
        usuario?.documento ?? '—',
        new Date(i.fecha).toLocaleString('es-CO'),
        i.aciertos,
        i.total,
        nota,
        ...porPregunta,
        falladas || 'Ninguna',
      ]);
    }
    const sufijo = soloFiltrados && (desde || hasta) ? '_filtrado' : '_todo';
    descargarExcel(
      filas,
      `Resultados_${preturno.titulo.replace(/[^\w]+/g, '-').slice(0, 40)}${sufijo}_${fechaHoyISO()}`,
    );
  };

  const intentosMostrados = esFormador ? filtrarPorFechas(intentosOrdenados) : intentosOrdenados;

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onVolver}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors hover:text-indra-600"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al dashboard
        </button>
        {urlPortada && (
          <img
            src={urlPortada}
            alt={`Portada de ${preturno.titulo}`}
            className="mb-4 h-40 w-full rounded-xl object-cover shadow-sm"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-marina-950 px-2.5 py-0.5 text-[11px] font-bold text-white">
            {etiquetasDeCampanas(preturno.campanas)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              preturno.tipo === 'continua'
                ? 'bg-indra-100 text-indra-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {etiquetaPrograma(preturno.tipo)}
          </span>
          {preturno.oculto && esFormador && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
              Oculto para asesores
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-black text-marina-950 dark:text-slate-100">{preturno.titulo}</h1>
        <p className="mt-0.5 text-sm font-semibold capitalize text-indra-600">
          {formatearFecha(preturno.fecha)}
        </p>
        {preturno.disponibleHasta && (
          <p className="mt-1 text-xs font-semibold text-violet-600">
            Cierra el{' '}
            {new Date(preturno.disponibleHasta).toLocaleString('es-CO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
        {preturno.limiteIntentos != null && (
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Límite de intentos: {preturno.limiteIntentos}{' '}
            {preturno.limiteIntentos === 1 ? 'intento' : 'intentos'}
          </p>
        )}
        {preturno.preguntas.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tiempo del quiz: {preturno.tipo === 'preturno' ? '15 minutos' : '1 hora'} · al
            agotarse se envía automáticamente.
          </p>
        )}
        {preturno.descripcion && (
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{preturno.descripcion}</p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <FileStack className="h-4 w-4 text-indra-600" /> Material de la sesión
          </h2>
          <VisorMaterial materiales={preturno.materiales} />
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <ClipboardCheck className="h-4 w-4 text-indra-600" /> Evaluación
          </h2>
          {preturno.preguntas.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
              <ClipboardCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Esta sesión aún no tiene evaluación
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">El formador puede agregar el quiz.</p>
            </div>
          ) : (
            <QuizAsesor
              key={preturno.id}
              preguntas={preturno.preguntas}
              usuarioId={usuarioId}
              usuarioNombre={usuarioNombre}
              intentosPrevios={intentos.filter((i) => i.usuarioId === usuarioId).length}
              limiteIntentos={preturno.limiteIntentos}
              tipoPrograma={preturno.tipo}
              preturnoId={preturno.id}
              onGuardarIntento={(intento) =>
                guardarIntento({ ...intento, preturnoId: preturno.id })
              }
            />
          )}
        </section>
      </div>

      {intentos.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <h2 className="text-sm font-bold text-marina-950 dark:text-slate-100">
              {esFormador ? 'Resultados del quiz' : 'Mi historial de evaluación'} (
              {intentosMostrados.length})
            </h2>

            {esFormador && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">Filtrar por fecha:</span>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className={inputClase}
                  aria-label="Desde"
                />
                <span className="text-xs text-slate-400 dark:text-slate-500">a</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className={inputClase}
                  aria-label="Hasta"
                />
                <button
                  type="button"
                  onClick={() => descargar(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  <Download className="h-3.5 w-3.5" /> Excel (filtrado)
                </button>
                <button
                  type="button"
                  onClick={() => descargar(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  <Download className="h-3.5 w-3.5" /> Excel (todo)
                </button>
              </div>
            )}
          </div>

          {esFormador && seleccion.size > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2.5">
              <span className="text-xs font-bold text-red-700">
                {seleccion.size} intento{seleccion.size > 1 ? 's' : ''} seleccionado
                {seleccion.size > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={eliminarSeleccionados}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
              >
                Eliminar intento{seleccion.size > 1 ? 's' : ''}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <tr>
                  {esFormador && <th className="w-10 px-3 py-2.5" />}
                  <th className="px-4 py-2.5 font-bold">Asesor</th>
                  <th className="px-4 py-2.5 font-bold">Puntaje</th>
                  {esFormador &&
                    preturno.preguntas.map((_, idx) => (
                      <th key={idx} className="px-2 py-2.5 text-center font-bold">
                        P{idx + 1}
                      </th>
                    ))}
                  <th className="px-4 py-2.5 font-bold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {intentosMostrados.map((i) => {
                  const pct = i.total > 0 ? Math.round((i.aciertos / i.total) * 100) : 0;
                  return (
                    <tr key={i.id} className={seleccion.has(i.id) ? 'bg-red-50/60' : 'hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800'}>
                      {esFormador && (
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={seleccion.has(i.id)}
                            onChange={() => alternarSeleccion(i.id)}
                            className="h-4 w-4 cursor-pointer accent-indra-600"
                            aria-label={`Seleccionar intento de ${i.usuarioNombre}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5 font-semibold text-marina-950 dark:text-slate-100">
                        {i.usuarioNombre}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            pct >= 70
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {i.aciertos}/{i.total} · {pct}%
                        </span>
                      </td>
                      {esFormador &&
                        preturno.preguntas.map((pregunta, idx) => {
                          const elegida = i.respuestas?.[idx];
                          const correcta = esRespuestaCorrecta(pregunta, elegida);
                          return (
                            <td key={idx} className="px-2 py-2.5 text-center">
                              {elegida === undefined || elegida === null ? (
                                <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                              ) : correcta ? (
                                <CheckCircle2
                                  className="mx-auto h-4 w-4 text-emerald-500"
                                  aria-label="Correcta"
                                />
                              ) : (
                                <XCircle
                                  className="mx-auto h-4 w-4 text-red-500"
                                  aria-label="Fallada"
                                />
                              )}
                            </td>
                          );
                        })}
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        {new Date(i.fecha).toLocaleString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {esFormador && (
            <p className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-[11px] text-slate-400 dark:text-slate-500">
              P: pregunta del quiz. Marca las casillas y usa «Eliminar intento(s)» para borrar
              registros seleccionados. El Excel incluye la nota y lo que falló cada asesor.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
