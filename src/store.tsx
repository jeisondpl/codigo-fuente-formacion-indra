import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Campana, Carpeta, EstadoApp, Intento, Preturno, TipoPrograma, Usuario } from './tipos';
import { cargarEstado, generarId } from './datos';
import { cargarEstadoRemoto } from './datosBackend';
import {
  alternarOcultoBD,
  actualizarPreturnoBD,
  actualizarUsuarioBD,
  eliminarCarpetaBD,
  eliminarIntentosBD,
  eliminarPreturnoBD,
  eliminarUsuarioBD,
  insertarIntentoBD,
  insertarPreturnoBD,
  insertarUsuarioBD,
  quitarCarpetaDeFormacionesBD,
  upsertCarpetaBD,
} from './datosBackend';
import { borrarArchivo, esTokenArchivo } from './almacenArchivos';
import { supabase } from './supabase';
import { usarBackendNode } from './datosBackend';

const ESTADO_VACIO: EstadoApp = { usuarios: [], preturnos: [], intentos: [], carpetas: [] };

/** Elimina del almacenamiento los archivos (portada y materiales) de una formación. */
function limpiarArchivos(p: Preturno) {
  if (esTokenArchivo(p.portada)) void borrarArchivo(p.portada as string);
  for (const m of p.materiales) {
    if (esTokenArchivo(m.url)) void borrarArchivo(m.url);
  }
}

interface AccionesEstado {
  agregarUsuario: (usuario: Omit<Usuario, 'id'>) => void;
  actualizarUsuario: (id: string, cambios: Partial<Omit<Usuario, 'id'>>) => void;
  eliminarUsuario: (id: string) => void;
  crearPreturno: (preturno: Omit<Preturno, 'id'>) => void;
  actualizarPreturno: (id: string, cambios: Partial<Omit<Preturno, 'id'>>) => void;
  eliminarPreturno: (id: string) => void;
  alternarOculto: (id: string) => void;
  guardarIntento: (intento: Intento) => void;
  eliminarIntentos: (ids: string[]) => void;
  /** Crea una carpeta visible (si ya existe, no hace nada) */
  crearCarpeta: (campana: Campana, tipo: TipoPrograma, nombre: string) => void;
  /** Oculta o vuelve visible una carpeta para los asesores */
  alternarOcultoCarpeta: (campana: Campana, tipo: TipoPrograma, nombre: string) => void;
  /** Elimina la carpeta; sus formaciones pasan a "General" (no se borran) */
  eliminarCarpeta: (campana: Campana, tipo: TipoPrograma, nombre: string) => void;
}

export interface ValorStore extends AccionesEstado {
  estado: EstadoApp;
  /** true mientras se sincroniza el estado inicial con Supabase */
  cargando: boolean;
  /** Mensaje de error si falló la carga inicial */
  errorCarga: string | null;
  /** Vuelve a intentar la carga inicial */
  reintentarCarga: () => void;
}

const ContextoEstado = createContext<ValorStore | null>(null);

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoApp>(ESTADO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);

  // Recarga agrupada (realtime + sondeo) con espera corta para no saturar
  const temporizadorRef = useRef<number | null>(null);
  const programarRecarga = () => {
    if (temporizadorRef.current !== null) window.clearTimeout(temporizadorRef.current);
    temporizadorRef.current = window.setTimeout(() => {
      temporizadorRef.current = null;
      cargarEstadoRemoto()
        .then((remoto) => setEstado(remoto))
        .catch((e) => console.error('Error de sincronización con la base de datos:', e));
    }, 500);
  };

  // Carga inicial desde Supabase (con migración de datos locales la primera vez)
  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga(null);
    cargarEstado()
      .then((cargado) => {
        if (activo) setEstado(cargado);
      })
      .catch(() => {
        if (activo) {
          setErrorCarga(
            'No fue posible conectar con la base de datos. Revisa tu conexión a internet e inténtalo de nuevo.',
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [intentoCarga]);

  // Sincronización en vivo: cambios de otros equipos + sondeo de respaldo.
  // En modo backend Node no hay canal realtime (solo sondeo cada 30 s).
  useEffect(() => {
    if (!usarBackendNode) {
      const canal = supabase
        .channel('formacion-indra-estado')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, programarRecarga)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'preturnos' }, programarRecarga)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'materiales' }, programarRecarga)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'preguntas' }, programarRecarga)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'intentos' }, programarRecarga)
        .subscribe();

      const sondeo = window.setInterval(programarRecarga, 30_000);

      return () => {
        if (temporizadorRef.current !== null) window.clearTimeout(temporizadorRef.current);
        window.clearInterval(sondeo);
        void supabase.removeChannel(canal);
      };
    }

    const sondeo = window.setInterval(programarRecarga, 30_000);
    return () => {
      if (temporizadorRef.current !== null) window.clearTimeout(temporizadorRef.current);
      window.clearInterval(sondeo);
    };
  }, []);

  const acciones: AccionesEstado = {
    agregarUsuario: (nuevo) => {
      const usuario: Usuario = { ...nuevo, id: `u-${Date.now().toString(36)}` };
      setEstado((prev) => ({ ...prev, usuarios: [...prev.usuarios, usuario] }));
      void insertarUsuarioBD(usuario).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    actualizarUsuario: (id, cambios) => {
      setEstado((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
      }));
      void actualizarUsuarioBD(id, cambios).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    eliminarUsuario: (id) => {
      setEstado((prev) => ({
        ...prev,
        usuarios: prev.usuarios.filter((u) => u.id !== id),
        intentos: prev.intentos.filter((i) => i.usuarioId !== id),
      }));
      void eliminarUsuarioBD(id).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    crearPreturno: (nuevo) => {
      const preturno: Preturno = { ...nuevo, id: `p-${Date.now().toString(36)}` };
      setEstado((prev) => ({ ...prev, preturnos: [...prev.preturnos, preturno] }));
      void insertarPreturnoBD(preturno).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    actualizarPreturno: (id, cambios) => {
      const previo = estado.preturnos.find((p) => p.id === id);
      if (!previo) return;
      // Detecta archivos reemplazados o quitados para limpiarlos del almacenamiento
      const portadaNueva = 'portada' in cambios ? cambios.portada : previo.portada;
      const urlsNuevas = new Set<string>([
        ...(portadaNueva ? [portadaNueva] : []),
        ...(cambios.materiales ?? previo.materiales).map((m) => m.url),
      ]);
      if (previo.portada && !urlsNuevas.has(previo.portada)) void borrarArchivo(previo.portada);
      for (const m of previo.materiales) {
        if (!urlsNuevas.has(m.url)) void borrarArchivo(m.url);
      }
      const combinado: Preturno = { ...previo, ...cambios, id };
      setEstado((prev) => ({
        ...prev,
        preturnos: prev.preturnos.map((p) => (p.id === id ? combinado : p)),
      }));
      void actualizarPreturnoBD(combinado, cambios).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    eliminarPreturno: (id) => {
      setEstado((prev) => {
        const eliminado = prev.preturnos.find((p) => p.id === id);
        if (eliminado) limpiarArchivos(eliminado);
        return {
          ...prev,
          preturnos: prev.preturnos.filter((p) => p.id !== id),
          intentos: prev.intentos.filter((i) => i.preturnoId !== id),
        };
      });
      void eliminarPreturnoBD(id).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    alternarOculto: (id) => {
      const actual = estado.preturnos.find((p) => p.id === id);
      if (!actual) return;
      const oculto = !actual.oculto;
      setEstado((prev) => ({
        ...prev,
        preturnos: prev.preturnos.map((p) => (p.id === id ? { ...p, oculto } : p)),
      }));
      void alternarOcultoBD(id, oculto).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    guardarIntento: (intento) => {
      setEstado((prev) => ({ ...prev, intentos: [...prev.intentos, intento] }));
      void insertarIntentoBD(intento).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    eliminarIntentos: (ids) => {
      if (ids.length === 0) return;
      setEstado((prev) => ({
        ...prev,
        intentos: prev.intentos.filter((i) => !ids.includes(i.id)),
      }));
      void eliminarIntentosBD(ids).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    crearCarpeta: (campana, tipo, nombre) => {
      const limpio = nombre.trim();
      if (!limpio) return;
      if (estado.carpetas.some((c) => c.campana === campana && c.tipo === tipo && c.nombre === limpio)) return;
      const carpeta: Carpeta = { id: generarId(), campana, tipo, nombre: limpio, oculta: false };
      setEstado((prev) => ({ ...prev, carpetas: [...prev.carpetas, carpeta] }));
      void upsertCarpetaBD(carpeta).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    alternarOcultoCarpeta: (campana, tipo, nombre) => {
      const registro = estado.carpetas.find(
        (c) => c.campana === campana && c.tipo === tipo && c.nombre === nombre,
      );
      const carpeta: Carpeta = registro
        ? { ...registro, oculta: !registro.oculta }
        : { id: generarId(), campana, tipo, nombre, oculta: true };
      setEstado((prev) => ({
        ...prev,
        carpetas: registro
          ? prev.carpetas.map((c) => (c.id === carpeta.id ? carpeta : c))
          : [...prev.carpetas, carpeta],
      }));
      void upsertCarpetaBD(carpeta).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
    eliminarCarpeta: (campana, tipo, nombre) => {
      const registro = estado.carpetas.find(
        (c) => c.campana === campana && c.tipo === tipo && c.nombre === nombre,
      );
      // Las formaciones de esa carpeta pasan a "General" (no se eliminan)
      const afectadas = estado.preturnos
        .filter((p) => p.tipo === tipo && p.carpeta === nombre && p.campanas.includes(campana))
        .map((p) => p.id);
      setEstado((prev) => ({
        ...prev,
        carpetas: registro ? prev.carpetas.filter((c) => c.id !== registro.id) : prev.carpetas,
        preturnos: prev.preturnos.map((p) =>
          afectadas.includes(p.id) ? { ...p, carpeta: undefined } : p,
        ),
      }));
      if (registro) void eliminarCarpetaBD(registro.id).catch((e) => console.error('Error de sincronización con la base de datos:', e));
      void quitarCarpetaDeFormacionesBD(afectadas).catch((e) => console.error('Error de sincronización con la base de datos:', e));
    },
  };

  return (
    <ContextoEstado.Provider
      value={{
        estado,
        cargando,
        errorCarga,
        reintentarCarga: () => setIntentoCarga((n) => n + 1),
        ...acciones,
      }}
    >
      {children}
    </ContextoEstado.Provider>
  );
}

export function useStore(): ValorStore {
  const valor = useContext(ContextoEstado);
  if (!valor) throw new Error('useStore debe usarse dentro de ProveedorEstado');
  return valor;
}
