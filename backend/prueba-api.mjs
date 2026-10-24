// Prueba E2E de la API del backend Node
const BASE = 'http://localhost:3001';
let token = '';
let fallos = 0;

async function req(metodo, ruta, cuerpo, binario = null) {
  const encabezados = binario
    ? { 'x-nombre-archivo': 'prueba.png', 'content-type': 'image/png' }
    : { 'Content-Type': 'application/json' };
  if (token) encabezados.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: encabezados,
    body: binario ?? (cuerpo ? JSON.stringify(cuerpo) : undefined),
  });
  const texto = await res.text();
  let datos;
  try { datos = JSON.parse(texto); } catch { datos = texto; }
  return { estado: res.status, datos };
}

function verificar(nombre, cond, extra = '') {
  if (cond) console.log(`  OK  ${nombre}`);
  else { console.log(`FALLA ${nombre} ${extra}`); fallos++; }
}

// 1. Login correcto e incorrecto
let r = await req('POST', '/api/auth/login', { usuario: 'CO1023940501', contrasena: '1023940501' });
verificar('login correcto', r.estado === 200 && r.datos.token, JSON.stringify(r.datos).slice(0, 80));
token = r.datos.token;

r = await req('POST', '/api/auth/login', { usuario: 'CO1023940501', contrasena: 'mala' });
verificar('login con contraseña errónea rechazado', r.estado === 401);

// 2. Escritura sin token → 401
const tokenCopia = token; token = '';
r = await req('POST', '/api/usuarios', { id: 'x', nombre: 'x', documento: 'x', rol: 'Asesor' });
verificar('escritura sin token rechazada', r.estado === 401);
token = tokenCopia;

// 3. Crear usuario
r = await req('POST', '/api/usuarios', {
  id: 'u-prueba-1', nombre: 'Asesor Prueba', documento: '123456',
  rol: 'Asesor', campanas: ['criticos'], supervisorId: 'u-admin-principal',
});
verificar('crear usuario', r.estado === 201, JSON.stringify(r.datos));

// 4. Editar usuario
r = await req('PUT', '/api/usuarios/u-prueba-1', { nombre: 'Asesor Editado', campanas: ['criticos', 'sta'] });
verificar('editar usuario', r.estado === 200);

// 5. Crear formación con pregunta sopa + opción
r = await req('POST', '/api/formaciones', {
  id: 'p-prueba-1', titulo: 'Formación de prueba', descripcion: 'desc',
  fecha: '2026-10-19', tipo: 'preturno', campanas: ['criticos'], oculto: false,
  limiteIntentos: 2, carpeta: 'Octubre',
  materiales: [{ id: 'm-1', nombre: 'video.mp4', tipo: 'video', url: 'api:a-falso.mp4' }],
  preguntas: [
    { id: 'q-1', tipo: 'opcion', pregunta: '¿2+2?', opciones: ['3', '4'], respuestaCorrecta: 1 },
    { id: 'q-2', tipo: 'sopa', pregunta: 'Encuentra', opciones: [], respuestaCorrecta: 0, palabras: ['EMPATIA', 'GESTION', 'INDRA'] },
  ],
});
verificar('crear formación', r.estado === 201, JSON.stringify(r.datos));

// 6. EDITAR formación (el escenario del bug): cambia la pregunta sopa
r = await req('PUT', '/api/formaciones/p-prueba-1', {
  preturno: {
    id: 'p-prueba-1', titulo: 'Formación de prueba EDITADA', descripcion: 'desc',
    fecha: '2026-10-19', tipo: 'preturno', campanas: ['criticos'], oculto: false,
    limiteIntentos: 3, carpeta: 'Octubre',
    materiales: [{ id: 'm-1', nombre: 'video.mp4', tipo: 'video', url: 'api:a-falso.mp4' }],
    preguntas: [
      { id: 'q-1', tipo: 'opcion', pregunta: '¿2+2?', opciones: ['3', '4'], respuestaCorrecta: 1 },
      { id: 'q-2', tipo: 'sopa', pregunta: 'Encuentra v2', opciones: [], respuestaCorrecta: 0, palabras: ['EMPATIA', 'GESTION', 'INDRA', 'CLIENTE'] },
    ],
  },
  cambios: { preguntas: [/* marcador: llega la colección completa */] },
});
verificar('editar formación', r.estado === 200, JSON.stringify(r.datos));

// 7. Verificar persistencia de la edición
r = await req('GET', '/api/estado');
const p = r.datos.preturnos.find((x) => x.id === 'p-prueba-1');
verificar('edición persistió: título', p?.titulo === 'Formación de prueba EDITADA');
verificar('edición persistió: sopa con 4 palabras', p?.preguntas.find((q) => q.id === 'q-2')?.palabras?.length === 4);
verificar('edición persistió: límite intentos 3', p?.limiteIntentos === 3);

// 8. Intento
r = await req('POST', '/api/intentos', {
  id: 'i-1', preturnoId: 'p-prueba-1', usuarioId: 'u-prueba-1', usuarioNombre: 'Asesor Prueba',
  aciertos: 2, total: 2, respuestas: [1, 'EMPATIA|GESTION|INDRA|CLIENTE'], fecha: new Date().toISOString(),
});
verificar('registrar intento', r.estado === 201);

// 9. Borrar intento
r = await req('POST', '/api/intentos/borrar', { ids: ['i-1'] });
verificar('borrar intento', r.estado === 200);

// 10. Carpeta (upsert dos veces)
r = await req('PUT', '/api/carpetas', { id: 'c-1', campana: 'criticos', tipo: 'preturno', nombre: 'Octubre', oculta: false, creadoEn: new Date().toISOString() });
verificar('crear carpeta', r.estado === 200);
r = await req('PUT', '/api/carpetas', { id: 'c-1b', campana: 'criticos', tipo: 'preturno', nombre: 'Octubre', oculta: true, creadoEn: new Date().toISOString() });
r = await req('GET', '/api/estado');
const carpeta = r.datos.carpetas.find((c) => c.nombre === 'Octubre');
verificar('upsert carpeta (sin duplicar, oculta)', carpeta && carpeta.oculta === true && r.datos.carpetas.filter((c) => c.nombre === 'Octubre').length === 1);

// 11. Ocultar formación
r = await req('PATCH', '/api/formaciones/p-prueba-1/oculto', { oculto: true });
r = await req('GET', '/api/estado');
verificar('ocultar formación', r.datos.preturnos.find((x) => x.id === 'p-prueba-1')?.oculto === true);

// 12. Subida y descarga de archivo
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
r = await req('POST', '/archivos', null, png);
verificar('subir archivo', r.estado === 201 && r.datos.nombre, JSON.stringify(r.datos));
const nombreArchivo = r.datos?.nombre;
const resArch = await fetch(`${BASE}/archivos/${nombreArchivo}`);
verificar('descargar archivo', resArch.status === 200);

// 13. Quitar carpeta de formaciones
r = await req('POST', '/api/formaciones/quitar-carpeta', { ids: ['p-prueba-1'] });
r = await req('GET', '/api/estado');
verificar('quitar carpeta de formación', r.datos.preturnos.find((x) => x.id === 'p-prueba-1')?.carpeta === undefined);

// 14. Eliminar formación (los hijos deben irse en cascada)
r = await req('DELETE', '/api/formaciones/p-prueba-1');
r = await req('GET', '/api/estado');
verificar('eliminar formación', !r.datos.preturnos.find((x) => x.id === 'p-prueba-1'));

// 15. Eliminar usuario de prueba
r = await req('DELETE', '/api/usuarios/u-prueba-1');
verificar('eliminar usuario', r.estado === 200);

console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS PASARON' : `\n${fallos} PRUEBAS FALLARON`);
process.exit(fallos === 0 ? 0 : 1);
