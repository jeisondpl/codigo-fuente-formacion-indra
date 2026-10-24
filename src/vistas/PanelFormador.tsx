import { useState } from 'react';
import type { Campana, Material, Pregunta, Preturno, Rol, TipoPrograma, Usuario } from '../tipos';
import {
  construirUsuarioLogin,
  ETIQUETAS_CAMPANA,
  esRespuestaCorrecta,
  estaDisponible,
  etiquetasDeCampanas,
  etiquetaPrograma,
  fechaHoyISO,
  formatearFecha,
  limpiarDocumento,
  preguntaCompleta,
  textoCorrecta,
  textoRespuesta,
} from '../datos';
import { descargarExcel, descargarResultadosPreturno } from '../exportar';
import { borrarArchivo } from '../almacenArchivos';
import { useStore } from '../store';
import SubidorArchivos from '../componentes/SubidorArchivos';
import SubidorPortada from '../componentes/SubidorPortada';
import ConstructorQuiz from '../componentes/ConstructorQuiz';
import { Check, ClipboardList, Download, Eye, EyeOff, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';

type Pestaña = 'usuarios' | 'crear' | 'listado';

const inputClase =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indra-500 focus:ring-2 focus:ring-indra-500/30 focus:outline-none';

interface Props {
  campana: Campana;
}

export default function PanelFormador({ campana }: Props) {
  const {
    estado,
    agregarUsuario,
    actualizarUsuario,
    eliminarUsuario,
    crearPreturno,
    actualizarPreturno,
    eliminarPreturno,
    alternarOculto,
    crearCarpeta,
    alternarOcultoCarpeta,
    eliminarCarpeta,
  } = useStore();
  const [pestaña, setPestaña] = useState<Pestaña>('crear');
  const [nuevaCarpetaGestion, setNuevaCarpetaGestion] = useState<Record<TipoPrograma, string>>({
    preturno: '',
    continua: '',
  });

  // Formulario de usuario
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [rol, setRol] = useState<Rol>('Asesor');
  const [campanasUsuario, setCampanasUsuario] = useState<Campana[]>([campana]);
  const [supervisorId, setSupervisorId] = useState('');
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null);
  const [usuarioCreado, setUsuarioCreado] = useState<string | null>(null);
  /** Id del usuario en edición; null = modo creación */
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<string | null>(null);

  // Formulario de preturno
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [descripcion, setDescripcion] = useState('');
  const [tipoPrograma, setTipoPrograma] = useState<TipoPrograma>('preturno');
  const [campanasElegidas, setCampanasElegidas] = useState<Campana[]>([campana]);
  const [disponibleDesde, setDisponibleDesde] = useState('');
  const [disponibleHasta, setDisponibleHasta] = useState('');
  const [limiteIntentos, setLimiteIntentos] = useState<number | ''>('');
  const [carpeta, setCarpeta] = useState('');
  const [nombreCarpetaNueva, setNombreCarpetaNueva] = useState('');
  const [portada, setPortada] = useState<string | null>(null);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [errorPreturno, setErrorPreturno] = useState<string | null>(null);
  const [creado, setCreado] = useState<string | null>(null);
  /** Id de la formación en edición; null = modo creación */
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const formacionEditando = editandoId
    ? estado.preturnos.find((p) => p.id === editandoId)
    : undefined;

  const supervisores = estado.usuarios.filter((u) => u.rol === 'Supervisor');
  const carpetasExistentes = [
    ...new Set(
      estado.preturnos
        .filter((p) => p.tipo === tipoPrograma && p.campanas.includes(campana) && p.carpeta)
        .map((p) => p.carpeta!),
    ),
  ];

  const alternarCampana = (c: Campana) =>
    setCampanasElegidas((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].sort(),
    );

  /** Carga una formación existente en el formulario para editarla. */
  const comenzarEdicion = (p: Preturno) => {
    setEditandoId(p.id);
    setTitulo(p.titulo);
    setFecha(p.fecha);
    setDescripcion(p.descripcion);
    setTipoPrograma(p.tipo);
    setCampanasElegidas([...p.campanas]);
    setDisponibleDesde(p.disponibleDesde ?? '');
    setDisponibleHasta(p.disponibleHasta ?? '');
    setLimiteIntentos(p.limiteIntentos == null ? '' : p.limiteIntentos);
    setCarpeta(p.carpeta ?? '');
    setNombreCarpetaNueva('');
    setPortada(p.portada ?? null);
    setMateriales(p.materiales);
    setPreguntas(p.preguntas);
    setErrorPreturno(null);
    setCreado(null);
    setPestaña('crear');
    window.scrollTo({ top: 0 });
  };

  /** Cancela la edición y deja el formulario limpio para crear. */
  const cancelarEdicion = () => {
    setEditandoId(null);
    setTitulo('');
    setFecha(fechaHoyISO());
    setDescripcion('');
    setTipoPrograma('preturno');
    setCampanasElegidas([campana]);
    setDisponibleDesde('');
    setDisponibleHasta('');
    setLimiteIntentos('');
    setCarpeta('');
    setNombreCarpetaNueva('');
    setPortada(null);
    setMateriales([]);
    setPreguntas([]);
    setErrorPreturno(null);
  };

  const alternarCampanaUsuario = (c: Campana) =>
    setCampanasUsuario((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].sort(),
    );

  /** Carga un usuario existente en el formulario para editarlo. */
  const comenzarEdicionUsuario = (u: Usuario) => {
    setEditandoUsuarioId(u.id);
    setNombre(u.nombre);
    setDocumento(u.documento);
    setRol(u.rol);
    setCampanasUsuario([...u.campanas]);
    setSupervisorId(u.supervisorId ?? '');
    setErrorUsuario(null);
    setUsuarioCreado(null);
    window.scrollTo({ top: 0 });
  };

  /** Cancela la edición y deja el formulario limpio para crear. */
  const cancelarEdicionUsuario = () => {
    setEditandoUsuarioId(null);
    setNombre('');
    setDocumento('');
    setRol('Asesor');
    setCampanasUsuario([campana]);
    setSupervisorId('');
    setErrorUsuario(null);
  };

  const registrarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    setUsuarioCreado(null);
    const doc = limpiarDocumento(documento);
    if (!nombre.trim() || !doc) {
      setErrorUsuario('El nombre y el documento (solo números) son obligatorios.');
      return;
    }
    if (estado.usuarios.some((u) => u.documento === doc && u.id !== editandoUsuarioId)) {
      setErrorUsuario('Ya existe un usuario con ese documento.');
      return;
    }
    const campanas: Campana[] = rol === 'Formador' ? ['criticos', 'sta'] : campanasUsuario;
    if (rol !== 'Formador' && campanas.length === 0) {
      setErrorUsuario('Selecciona al menos una campaña.');
      return;
    }

    // Modo edición: actualiza el usuario existente
    if (editandoUsuarioId) {
      const previo = estado.usuarios.find((u) => u.id === editandoUsuarioId);
      actualizarUsuario(editandoUsuarioId, {
        nombre: nombre.trim(),
        documento: doc,
        rol,
        campanas,
        supervisorId: rol === 'Asesor' && supervisorId ? supervisorId : undefined,
      });
      const docCambio = previo && previo.documento !== doc;
      setUsuarioCreado(
        `"${nombre.trim()}" quedó actualizado${docCambio ? `. Su nuevo acceso es ${construirUsuarioLogin(doc)} (contraseña ${doc})` : ''}.`,
      );
      cancelarEdicionUsuario();
      return;
    }

    const etiquetaRol = rol === 'Supervisor' ? 'Supervisor' : rol === 'Formador' ? 'Formador' : 'Asesor';
    agregarUsuario({
      nombre: nombre.trim(),
      documento: doc,
      rol,
      campanas,
      supervisorId: rol === 'Asesor' && supervisorId ? supervisorId : undefined,
    });
    const nombreSupervisor = supervisores.find((s) => s.id === supervisorId)?.nombre;
    setUsuarioCreado(
      rol === 'Formador'
        ? `Formador "${nombre.trim()}" creado. Accede con ${construirUsuarioLogin(doc)}, contraseña ${doc}. Tiene acceso a ambas campañas (Clientes Críticos y STA).`
        : `${etiquetaRol} "${nombre.trim()}" creado en ${etiquetasDeCampanas(campanas)}${rol === 'Asesor' && nombreSupervisor ? `, bajo el supervisor ${nombreSupervisor}` : ''}. Accede con ${construirUsuarioLogin(doc)}, contraseña ${doc}.`,
    );
    setNombre('');
    setDocumento('');
    setRol('Asesor');
    setCampanasUsuario([campana]);
    setSupervisorId('');
    setErrorUsuario(null);
  };

  const publicarPreturno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorPreturno('El título es obligatorio.');
      return;
    }
    if (campanasElegidas.length === 0) {
      setErrorPreturno('Selecciona al menos una campaña (Clientes Críticos, STA o las 2).');
      return;
    }
    const preguntasIncompletas = preguntas.some((p) => !preguntaCompleta(p));
    if (preguntasIncompletas) {
      setErrorPreturno('Hay preguntas del quiz incompletas.');
      return;
    }
    const carpetaFinal = carpeta === '__nueva__' ? nombreCarpetaNueva.trim() : carpeta.trim();
    const datos = {
      titulo: titulo.trim(),
      fecha,
      descripcion: descripcion.trim(),
      campanas: campanasElegidas,
      tipo: tipoPrograma,
      portada: portada ?? undefined,
      disponibleDesde: disponibleDesde || undefined,
      disponibleHasta: disponibleHasta || undefined,
      limiteIntentos: limiteIntentos === '' ? null : Number(limiteIntentos),
      carpeta: carpetaFinal || undefined,
      materiales,
      preguntas,
    };
    if (editandoId) {
      actualizarPreturno(editandoId, datos);
      setCreado(
        `"${titulo.trim()}" quedó actualizado${carpetaFinal ? ` · carpeta "${carpetaFinal}"` : ''}.`,
      );
      cancelarEdicion();
      return;
    }
    crearPreturno({ ...datos, oculto: false });
    setTitulo('');
    setDescripcion('');
    setTipoPrograma('preturno');
    setDisponibleDesde('');
    setDisponibleHasta('');
    setLimiteIntentos('');
    setCarpeta('');
    setNombreCarpetaNueva('');
    setPortada(null);
    setMateriales([]);
    setPreguntas([]);
    setErrorPreturno(null);
    setCreado(
      `"${titulo.trim()}" quedó publicado en ${etiquetasDeCampanas(campanasElegidas)} · ${etiquetaPrograma(tipoPrograma)}${carpetaFinal ? ` · carpeta "${carpetaFinal}"` : ''}${disponibleDesde ? ` (visible desde ${new Date(disponibleDesde).toLocaleString('es-CO')})` : ''}${disponibleHasta ? ` (cierra ${new Date(disponibleHasta).toLocaleString('es-CO')})` : ''}${limiteIntentos !== '' ? ` · máx. ${limiteIntentos} intento${Number(limiteIntentos) !== 1 ? 's' : ''}` : ' · intentos ilimitados'}.`,
    );
  };

  /** Exporta todos los intentos de la campaña activa a Excel. */
  const exportarResultadosCampana = () => {
    const delTipo = estado.preturnos.filter((p) => p.campanas.includes(campana));
    // Una columna por pregunta (hasta la formación con más preguntas de la campaña)
    const maxPreguntas = delTipo.reduce((max, p) => Math.max(max, p.preguntas.length), 0);
    const columnasPreguntas = Array.from({ length: maxPreguntas }, (_, i) => `P${i + 1}`);
    const filas: (string | number)[][] = [
      [
        'Campaña',
        'Programa',
        'Formación',
        'Fecha formación',
        'Asesor',
        'Documento',
        'Fecha intento',
        'Aciertos',
        'Total',
        'Nota %',
        'Nº falladas',
        ...columnasPreguntas,
      ],
    ];
    for (const i of [...estado.intentos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const p = delTipo.find((x) => x.id === i.preturnoId);
      if (!p) continue;
      const usuario = estado.usuarios.find((u) => u.id === i.usuarioId);
      const nota = i.total > 0 ? Math.round((i.aciertos / i.total) * 100) : 0;
      let falladas = 0;
      const porPregunta = Array.from({ length: maxPreguntas }, (_, idx) => {
        const pregunta = p.preguntas[idx];
        if (!pregunta) return '—';
        const elegida = i.respuestas?.[idx];
        if (elegida === undefined || elegida === null) return 'Sin responder';
        if (esRespuestaCorrecta(pregunta, elegida)) return 'Correcta';
        falladas++;
        return `Falló (eligió "${textoRespuesta(pregunta, elegida)}" · correcta "${textoCorrecta(pregunta)}")`;
      });
      filas.push([
        etiquetasDeCampanas(p.campanas),
        etiquetaPrograma(p.tipo),
        p.titulo,
        p.fecha,
        i.usuarioNombre,
        usuario?.documento ?? '—',
        new Date(i.fecha).toLocaleString('es-CO'),
        i.aciertos,
        i.total,
        nota,
        falladas,
        ...porPregunta,
      ]);
    }
    descargarExcel(
      filas,
      `Resultados_${ETIQUETAS_CAMPANA[campana].replace(/\s+/g, '-')}_${fechaHoyISO()}`,
    );
  };

  const pestanas: { id: Pestaña; etiqueta: string; icono: typeof UserPlus }[] = [
    { id: 'crear', etiqueta: 'Subir nuevo aprendizaje', icono: ClipboardList },
    { id: 'usuarios', etiqueta: 'Creación de Usuarios', icono: UserPlus },
    { id: 'listado', etiqueta: 'Formaciones publicadas', icono: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {pestanas.map(({ id, etiqueta, icono: Icono }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setPestaña(id);
              setCreado(null);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              pestaña === id
                ? 'bg-marina-950 text-white'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-indra-500 hover:text-indra-700'
            }`}
          >
            <Icono className="h-4 w-4" /> {etiqueta}
          </button>
        ))}
      </div>

      {creado && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {creado}
        </div>
      )}

      {pestaña === 'crear' && (
        <form onSubmit={publicarPreturno} className="space-y-6">
          {formacionEditando && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indra-300 bg-indra-50 px-4 py-3 text-sm font-semibold text-indra-700">
              <span>
                Estás editando «{formacionEditando.titulo}». Corrige lo que necesites y guarda los
                cambios.
              </span>
              <button
                type="button"
                onClick={cancelarEdicion}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indra-600 px-3 py-1.5 text-xs font-bold text-indra-700 transition-colors hover:bg-indra-100"
              >
                Cancelar edición
              </button>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-marina-950 dark:text-slate-100">1. Información de la sesión</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="titulo" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Título *
                </label>
                <input
                  id="titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Protocolo de atención a clientes críticos"
                  className={inputClase}
                />
              </div>
              <div>
                <label htmlFor="tipoPrograma" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Tipo de formación *
                </label>
                <select
                  id="tipoPrograma"
                  value={tipoPrograma}
                  onChange={(e) => setTipoPrograma(e.target.value as TipoPrograma)}
                  className={inputClase}
                >
                  <option value="preturno">Preturno</option>
                  <option value="continua">Continua</option>
                </select>
              </div>
              <div>
                <label htmlFor="fecha" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Fecha de asignación *
                </label>
                <input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={inputClase}
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Tiempo del curso
                </span>
                <div className="flex h-[38px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {tipoPrograma === 'preturno' ? '15 minutos' : '1 hora'}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  El quiz se envía automáticamente al agotarse este tiempo.
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Campaña(s) *
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {(['criticos', 'sta'] as Campana[]).map((c) => {
                    const activa = campanasElegidas.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => alternarCampana(c)}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                          activa
                            ? c === 'sta'
                              ? 'bg-indra-500 text-white shadow-sm'
                              : 'bg-marina-950 text-white shadow-sm'
                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:border-indra-500 hover:text-indra-700'
                        }`}
                      >
                        {ETIQUETAS_CAMPANA[c]}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCampanasElegidas(['criticos', 'sta'])}
                    className="rounded-lg border border-dashed border-indra-500 px-4 py-2 text-sm font-bold text-indra-700 transition-colors hover:bg-indra-100"
                  >
                    Las 2 campañas
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {campanasElegidas.length === 2
                    ? 'La formación aparecerá en Clientes Críticos y en STA.'
                    : campanasElegidas.length === 1
                      ? `La formación aparecerá solo en ${ETIQUETAS_CAMPANA[campanasElegidas[0]]}.`
                      : 'Ninguna campaña seleccionada.'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Programación de visibilidad
                </span>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="disponibleDesde" className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Visible desde (fecha y hora)
                    </label>
                    <input
                      id="disponibleDesde"
                      type="datetime-local"
                      value={disponibleDesde}
                      onChange={(e) => setDisponibleDesde(e.target.value)}
                      className={inputClase}
                    />
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      Vacío = disponible de inmediato.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="disponibleHasta" className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Cerrar / ocultar automáticamente (fecha y hora)
                    </label>
                    <input
                      id="disponibleHasta"
                      type="datetime-local"
                      value={disponibleHasta}
                      onChange={(e) => setDisponibleHasta(e.target.value)}
                      className={inputClase}
                    />
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      Al llegar esta fecha el curso se oculta solo para los asesores.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="carpeta" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Carpeta (mes, tema o categoría)
                </label>
                {carpeta === '__nueva__' ? (
                  <input
                    id="carpetaNueva"
                    type="text"
                    value={nombreCarpetaNueva}
                    onChange={(e) => setNombreCarpetaNueva(e.target.value)}
                    placeholder="Ej.: Noviembre, PDA, Certificaciones"
                    className={inputClase}
                  />
                ) : (
                  <select
                    id="carpeta"
                    value={carpeta}
                    onChange={(e) => setCarpeta(e.target.value)}
                    className={inputClase}
                  >
                    <option value="">General (sin carpeta)</option>
                    {carpetasExistentes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__nueva__">+ Crear nueva carpeta</option>
                  </select>
                )}
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Organiza por mes (Octubre) o por tema (PDA, Certificaciones). También puedes
                  gestionar las carpetas abajo, en "Formaciones publicadas".
                </p>
              </div>
              <div>
                <label htmlFor="limiteIntentos" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Límite de intentos
                </label>
                <select
                  id="limiteIntentos"
                  value={limiteIntentos}
                  onChange={(e) => setLimiteIntentos(e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputClase}
                >
                  <option value="">Sin límite</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'intento' : 'intentos'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Cantidad máxima de veces que un asesor puede responder el quiz.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="descripcion" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Objetivos y temas de la sesión…"
                  className={inputClase}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="mb-1 text-base font-bold text-marina-950 dark:text-slate-100">2. Portada</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Imagen de banner para {etiquetaPrograma(tipoPrograma).toLowerCase()}. Se muestra en el
              dashboard y en la vista del asesor.
            </p>
            <SubidorPortada portada={portada} onCambiar={setPortada} diferido={Boolean(editandoId)} />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="mb-1 text-base font-bold text-marina-950 dark:text-slate-100">3. Materiales multimedia</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Adjunta videos, PDF o imágenes de apoyo. Los asesores los verán dentro de la sesión.
            </p>
            <SubidorArchivos
              materiales={materiales}
              onAgregar={(m) => setMateriales((prev) => [...prev, m])}
              onQuitar={(id) => {
                // En edición no se borra aquí: si se cancela, la formación sigue usando el archivo.
                // actualizarPreturno limpia los archivos quitados al guardar.
                if (!editandoId) {
                  const material = materiales.find((m) => m.id === id);
                  if (material) void borrarArchivo(material.url);
                }
                setMateriales((prev) => prev.filter((m) => m.id !== id));
              }}
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="mb-1 text-base font-bold text-marina-950 dark:text-slate-100">4. Evaluación (Quiz)</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Construye las preguntas de selección múltiple y marca la respuesta correcta de cada una.
            </p>
            <ConstructorQuiz preguntas={preguntas} onChange={setPreguntas} />
          </div>

          {errorPreturno && (
            <p className="text-sm font-semibold text-red-600">{errorPreturno}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indra-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indra-700"
            >
              {editandoId ? (
                <>
                  <Check className="h-4 w-4" /> Guardar cambios
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Publicar {etiquetaPrograma(tipoPrograma).toLowerCase()}
                </>
              )}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {pestaña === 'usuarios' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <form
              onSubmit={registrarUsuario}
              className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <h3 className="flex items-center gap-2 text-base font-bold text-marina-950 dark:text-slate-100">
                <UserPlus className="h-5 w-5 text-indra-600" />{' '}
                {editandoUsuarioId ? 'Editar usuario' : 'Creación de Usuarios'}
              </h3>
              {editandoUsuarioId && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indra-300 bg-indra-50 px-3 py-2 text-xs font-semibold text-indra-700">
                  <span>Estás editando un usuario existente. Ajusta lo que necesites y guarda.</span>
                  <button
                    type="button"
                    onClick={cancelarEdicionUsuario}
                    className="rounded-lg border border-indra-600 px-3 py-1.5 font-bold text-indra-700 transition-colors hover:bg-indra-100"
                  >
                    Cancelar edición
                  </button>
                </div>
              )}
              <div>
                <label htmlFor="nombre" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Nombre completo *
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Andrés Gómez"
                  className={inputClase}
                />
              </div>
              <div>
                <label htmlFor="documento" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Documento (solo números) *
                </label>
                <input
                  id="documento"
                  type="text"
                  inputMode="numeric"
                  value={documento}
                  onChange={(e) => setDocumento(limpiarDocumento(e.target.value))}
                  placeholder="Ej. 1023940501"
                  className={inputClase}
                />
                {documento && (
                  <p className="mt-1 text-[11px] font-semibold text-indra-600">
                    Usuario de acceso asignado: {construirUsuarioLogin(documento)}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="rol" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Rol
                </label>
                <select
                  id="rol"
                  value={rol}
                  onChange={(e) => setRol(e.target.value as Rol)}
                  className={inputClase}
                >
                  <option value="Asesor">Asesor</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Formador">Formador</option>
                </select>
              </div>
              {rol !== 'Formador' ? (
                <div>
                  <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Campaña(s) *
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['criticos', 'sta'] as Campana[]).map((c) => {
                      const activa = campanasUsuario.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => alternarCampanaUsuario(c)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                            activa
                              ? c === 'sta'
                                ? 'bg-indra-500 text-white shadow-sm'
                                : 'bg-marina-950 text-white shadow-sm'
                              : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-indra-500 hover:text-indra-700'
                          }`}
                        >
                          {ETIQUETAS_CAMPANA[c]}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCampanasUsuario(['criticos', 'sta'])}
                      className="rounded-lg border border-dashed border-indra-500 px-4 py-2 text-sm font-bold text-indra-700 transition-colors hover:bg-indra-100"
                    >
                      Las 2 campañas
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {rol === 'Asesor'
                      ? 'Solo verá las formaciones de su campaña.'
                      : 'Verá las formaciones y participación de las campañas seleccionadas.'}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-indra-50 px-3 py-2 text-xs font-semibold text-indra-700">
                  Los formadores tienen acceso a las dos campañas (Clientes Críticos y STA).
                </p>
              )}
              {rol === 'Asesor' && (
                <div>
                  <label htmlFor="supervisor" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Supervisor del asesor
                  </label>
                  <select
                    id="supervisor"
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className={inputClase}
                  >
                    <option value="">Sin supervisor</option>
                    {supervisores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Agrupa al asesor en las gráficas de participación de su supervisor.
                  </p>
                </div>
              )}
              {errorUsuario && <p className="text-sm font-semibold text-red-600">{errorUsuario}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-indra-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indra-700"
              >
                {editandoUsuarioId ? 'Guardar cambios' : 'Guardar usuario'}
              </button>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                El usuario de acceso es CO + documento y la contraseña es el propio documento.
              </p>
            </form>

            {usuarioCreado && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {usuarioCreado}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm lg:col-span-3">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Nombre</th>
                  <th className="px-4 py-3 font-bold">Usuario</th>
                  <th className="px-4 py-3 font-bold">Documento</th>
                  <th className="px-4 py-3 font-bold">Rol</th>
                  <th className="px-4 py-3 font-bold">Campaña(s)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {estado.usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 font-semibold text-marina-950 dark:text-slate-100">{u.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indra-700">
                      {construirUsuarioLogin(u.documento)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.documento}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          u.rol === 'Formador'
                            ? 'bg-indra-100 text-indra-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        {u.campanas.map((c) => (
                          <span
                            key={c}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                              c === 'sta' ? 'bg-indra-500' : 'bg-marina-950'
                            }`}
                          >
                            {c === 'sta' ? 'STA' : 'CC'}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => comenzarEdicionUsuario(u)}
                          className="rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:bg-indra-50 hover:text-indra-600"
                          aria-label={`Editar a ${u.nombre}`}
                          title="Editar usuario (nombre, rol, campaña, supervisor)"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarUsuario(u.id)}
                          className="rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Eliminar a ${u.nombre}`}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {estado.usuarios.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Aún no hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pestaña === 'listado' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Campaña activa: <span className="text-marina-950 dark:text-slate-100">{ETIQUETAS_CAMPANA[campana]}</span>
            </p>
            <button
              type="button"
              onClick={exportarResultadosCampana}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> Descargar resultados (Excel)
            </button>
          </div>
          {([
            { tipo: 'preturno' as TipoPrograma, titulo: 'Preturnos', vacio: 'Todavía no has publicado preturnos.' },
            { tipo: 'continua' as TipoPrograma, titulo: 'Formación Continua', vacio: 'Todavía no has publicado programas de formación continua.' },
          ]).map(({ tipo, titulo, vacio }) => {
            const lista = estado.preturnos
              .filter((p) => p.tipo === tipo && p.campanas.includes(campana))
              .sort((a, b) => b.fecha.localeCompare(a.fecha));
            return (
              <section key={tipo}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">{titulo}</h2>
                  <span className="rounded-full bg-marina-950 px-2 py-0.5 text-[11px] font-bold text-white">
                    {lista.length}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-bold">Título</th>
                        <th className="px-4 py-3 font-bold">Carpeta</th>
                        <th className="px-4 py-3 font-bold">Fecha</th>
                        <th className="px-4 py-3 font-bold">Materiales</th>
                        <th className="px-4 py-3 font-bold">Preguntas</th>
                        <th className="px-4 py-3 font-bold">Intentos</th>
                        <th className="px-4 py-3 font-bold">Estado</th>
                        <th className="sticky right-0 bg-slate-50 px-4 py-3 font-bold text-right shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.08)] dark:bg-slate-800">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lista.map((p) => (
                        <tr key={p.id} className={`hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 ${p.oculto ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-marina-950 dark:text-slate-100">{p.titulo}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {p.carpeta || <span className="italic text-slate-400 dark:text-slate-500">General</span>}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                            {formatearFecha(p.fecha)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.materiales.length}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.preguntas.length}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {estado.intentos.filter((i) => i.preturnoId === p.id).length}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                  p.oculto
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                {p.oculto ? 'Oculto' : 'Visible'}
                              </span>
                              {!estaDisponible(p) && p.disponibleDesde && new Date(p.disponibleDesde).getTime() > new Date().getTime() && (
                                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-600">
                                  Habilita{' '}
                                  {new Date(p.disponibleDesde!).toLocaleString('es-CO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                              {p.disponibleHasta && new Date(p.disponibleHasta).getTime() > new Date().getTime() && (
                                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-600">
                                  Cierra{' '}
                                  {new Date(p.disponibleHasta).toLocaleString('es-CO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                              {p.limiteIntentos != null && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                  Máx. {p.limiteIntentos} intento{p.limiteIntentos !== 1 ? 's' : ''}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="sticky right-0 bg-white px-4 py-3 text-right shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.08)] dark:bg-slate-900">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => descargarResultadosPreturno(estado, p)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                                title="Descargar resultados de esta formación"
                              >
                                <Download className="h-3.5 w-3.5" /> Excel
                              </button>
                              <button
                                type="button"
                                onClick={() => comenzarEdicion(p)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indra-600 px-2.5 py-1.5 text-xs font-bold text-indra-700 transition-colors hover:bg-indra-50"
                                title="Editar esta formación"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => alternarOculto(p.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                                  p.oculto
                                    ? 'border border-indra-600 text-indra-700 hover:bg-indra-50'
                                    : 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                                }`}
                                title={p.oculto ? 'Hacer visible a los asesores' : 'Ocultar a los asesores'}
                              >
                                {p.oculto ? (
                                  <>
                                    <Eye className="h-3.5 w-3.5" /> Mostrar
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" /> Ocultar
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿Eliminar "${p.titulo}"?\n\nTambién se borrarán sus materiales, preguntas y los resultados registrados. Esta acción no se puede deshacer.`,
                                    )
                                  ) {
                                    eliminarPreturno(p.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                                title="Eliminar esta formación y sus resultados"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {lista.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            {vacio}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                  Las formaciones ocultas desaparecen del dashboard del asesor pero siguen aquí para ti.
                </p>
              </section>
            );
          })}

          {/* Gestión de carpetas */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="text-base font-black text-marina-950 dark:text-slate-100">
              Carpetas de {ETIQUETAS_CAMPANA[campana]}
            </h3>
            <p className="mb-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
              Crea carpetas para organizar (Octubre, PDA, Certificaciones, Formación inicial…),
              ocúltalas para los asesores o elimínalas. Al eliminar una carpeta, sus formaciones
              pasan a "General" sin borrarse.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {(['preturno', 'continua'] as TipoPrograma[]).map((tipo) => {
                const nombreSeccion = tipo === 'preturno' ? 'Preturnos' : 'Formación Continua';
                // Carpetas: las del registro + las que usan las formaciones de este tipo
                const registro = estado.carpetas.filter(
                  (c) => c.campana === campana && c.tipo === tipo,
                );
                const enUso = estado.preturnos
                  .filter((p) => p.campanas.includes(campana) && p.tipo === tipo && p.carpeta)
                  .map((p) => p.carpeta as string);
                const nombres = [...new Set([...registro.map((c) => c.nombre), ...enUso])].sort(
                  (a, b) => a.localeCompare(b, 'es'),
                );
                return (
                  <div key={tipo} className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-indra-600">
                      Carpetas de {nombreSeccion}
                    </h4>
                    {nombres.length === 0 && (
                      <p className="mb-3 text-xs text-slate-400">
                        No hay carpetas todavía. Crea la primera abajo.
                      </p>
                    )}
                    <ul className="space-y-2">
                      {nombres.map((nombre) => {
                        const info = registro.find((c) => c.nombre === nombre);
                        const cantidad = estado.preturnos.filter(
                          (p) =>
                            p.campanas.includes(campana) &&
                            p.tipo === tipo &&
                            p.carpeta === nombre,
                        ).length;
                        const oculta = info?.oculta ?? false;
                        return (
                          <li
                            key={nombre}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-bold text-marina-950 dark:text-slate-100">
                                {nombre}
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">
                                {cantidad} {cantidad === 1 ? 'curso' : 'cursos'}
                              </span>
                              {oculta && (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                                  Oculta
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => alternarOcultoCarpeta(campana, tipo, nombre)}
                                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                  oculta
                                    ? 'border-indra-600 text-indra-600 hover:bg-indra-100'
                                    : 'border-amber-300 text-amber-600 hover:bg-amber-50'
                                }`}
                              >
                                {oculta ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                {oculta ? 'Mostrar' : 'Ocultar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿Eliminar la carpeta "${nombre}" de ${nombreSeccion}?\n\nSus ${cantidad} formación(es) pasarán a "General" (no se borran).`,
                                    )
                                  ) {
                                    eliminarCarpeta(campana, tipo, nombre);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" /> Eliminar
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={nuevaCarpetaGestion[tipo]}
                        onChange={(e) =>
                          setNuevaCarpetaGestion((prev) => ({ ...prev, [tipo]: e.target.value }))
                        }
                        placeholder={`Nueva carpeta de ${nombreSeccion}…`}
                        className={inputClase}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            crearCarpeta(campana, tipo, nuevaCarpetaGestion[tipo]);
                            setNuevaCarpetaGestion((prev) => ({ ...prev, [tipo]: '' }));
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          crearCarpeta(campana, tipo, nuevaCarpetaGestion[tipo]);
                          setNuevaCarpetaGestion((prev) => ({ ...prev, [tipo]: '' }));
                        }}
                        disabled={!nuevaCarpetaGestion[tipo].trim()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indra-600 px-3 py-2 text-xs font-bold text-white transition-colors enabled:hover:bg-indra-700 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" /> Crear
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
