import type { EstadoApp, Preturno } from './tipos';
import {
  esRespuestaCorrecta,
  etiquetasDeCampanas,
  etiquetaPrograma,
  fechaHoyISO,
  textoCorrecta,
  textoRespuesta,
} from './datos';

/** Genera y descarga un archivo Excel (.xls) con las filas indicadas. */
export function descargarExcel(
  filas: (string | number)[][],
  nombreArchivo: string,
): void {
  const escapar = (valor: string | number) =>
    String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const tabla = filas
    .map((fila) => `<tr>${fila.map((c) => `<td>${escapar(c)}</td>`).join('')}</tr>`)
    .join('');

  const html =
    '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head>' +
    '<meta charset="UTF-8" /></head><body>' +
    `<table border="1">${tabla}</table></body></html>`;

  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo.endsWith('.xls') ? nombreArchivo : `${nombreArchivo}.xls`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Extrae la parte de fecha (YYYY-MM-DD) de una marca ISO. */
export function fechaDeMarca(iso: string): string {
  return iso.slice(0, 10);
}

/** Genera filas de Excel con los intentos de un preturno específico. */
export function descargarResultadosPreturno(
  estado: EstadoApp,
  preturno: Preturno,
): void {
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
      'Nº falladas',
      ...preturno.preguntas.map(
        (q, idx) => `P${idx + 1}: ${q.pregunta.replace(/\s+/g, ' ').trim().slice(0, 40)}`,
      ),
    ],
  ];
  const intentos = estado.intentos
    .filter((i) => i.preturnoId === preturno.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const i of intentos) {
    const usuario = estado.usuarios.find((u) => u.id === i.usuarioId);
    const nota = i.total > 0 ? Math.round((i.aciertos / i.total) * 100) : 0;
    // Una columna por pregunta: indica si acertó, falló (con lo que eligió y la correcta) o no respondió
    const porPregunta = preturno.preguntas.map((pregunta, idx) => {
      const elegida = i.respuestas?.[idx];
      if (elegida === undefined || elegida === null) return 'Sin responder';
      return esRespuestaCorrecta(pregunta, elegida)
        ? 'Correcta'
        : `Falló (eligió "${textoRespuesta(pregunta, elegida)}" · correcta "${textoCorrecta(pregunta)}")`;
    });
    const falladas = preturno.preguntas.reduce((n, pregunta, idx) => {
      const elegida = i.respuestas?.[idx];
      return elegida !== undefined && elegida !== null && !esRespuestaCorrecta(pregunta, elegida)
        ? n + 1
        : n;
    }, 0);
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
      falladas,
      ...porPregunta,
    ]);
  }
  if (intentos.length === 0) {
    filas.push([
      etiquetasDeCampanas(preturno.campanas),
      etiquetaPrograma(preturno.tipo),
      preturno.titulo,
      '—',
      '—',
      '—',
      0,
      preturno.preguntas.length,
      0,
      0,
      ...preturno.preguntas.map(() => '—'),
    ]);
  }
  descargarExcel(
    filas,
    `Resultados_${preturno.titulo.replace(/[^\w]+/g, '-').slice(0, 40)}_${fechaHoyISO()}`,
  );
}
