import { useEffect, useState } from 'react';
import type { Material } from '../tipos';
import { usarArchivoUrl } from '../usarArchivo';
import { esEnlaceExterno } from '../almacenArchivos';
import { ExternalLink, FileText, Film, Image as ImageIcon, Maximize2, X } from 'lucide-react';

interface Props {
  materiales: Material[];
}

function IconoTipo({ tipo }: { tipo: Material['tipo'] }) {
  if (tipo === 'video') return <Film className="h-4 w-4" />;
  if (tipo === 'pdf') return <FileText className="h-4 w-4" />;
  return <ImageIcon className="h-4 w-4" />;
}

/**
 * Convierte enlaces conocidos a una URL incrustable en <iframe>.
 * - YouTube: /embed/ (con nocookie).
 * - Google Drive: /preview.
 * Devuelve null si no hay conversión conocida (se intenta <video>/<iframe> directo).
 */
function urlInsertable(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return null;
}

/** Contenido del material según su tipo (soporta archivos subidos y enlaces externos). */
function ContenidoMedia({ material, url, pantallaCompleta = false }: { material: Material; url: string; pantallaCompleta?: boolean }) {
  const externo = esEnlaceExterno(material.url);
  const insertable = externo ? urlInsertable(url) : null;

  if (insertable) {
    return (
      <iframe
        key={material.id}
        src={insertable}
        title={material.nombre}
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        className={
          pantallaCompleta
            ? 'h-full w-full max-w-5xl rounded-lg bg-black shadow-2xl'
            : 'h-[420px] w-full bg-black'
        }
      />
    );
  }

  if (material.tipo === 'video') {
    return (
      <video
        key={material.id}
        src={url}
        controls
        autoPlay={pantallaCompleta}
        playsInline
        className={
          pantallaCompleta
            ? 'max-h-full max-w-full rounded-lg bg-black shadow-2xl'
            : 'h-full max-h-[420px] w-full bg-black object-contain'
        }
      />
    );
  }
  if (material.tipo === 'imagen') {
    return (
      <img
        src={url}
        alt={material.nombre}
        className={
          pantallaCompleta
            ? 'max-h-full max-w-full rounded-lg bg-white dark:bg-slate-900 object-contain shadow-2xl'
            : 'max-h-full w-full rounded-lg object-contain'
        }
      />
    );
  }
  return (
    <iframe
      key={material.id}
      src={url}
      title={material.nombre}
      className={
        pantallaCompleta
          ? 'h-full w-full max-w-5xl rounded-lg bg-white dark:bg-slate-900 shadow-2xl'
          : 'h-[420px] w-full bg-white dark:bg-slate-900'
      }
    />
  );
}

/** Botón para abrir un enlace externo en pestaña nueva (para cuando la incrustación no es posible). */
function BotonAbrirExterno({ material }: { material: Material }) {
  if (!esEnlaceExterno(material.url)) return null;
  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-marina-950/90 px-3 py-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-indra-600"
      title="Abrir en una pestaña nueva"
    >
      <ExternalLink className="h-3.5 w-3.5" /> Abrir en pestaña nueva
    </a>
  );
}

/** Ventana emergente que muestra el material a pantalla completa. */
function VentanaMaterial({
  material,
  url,
  onCerrar,
}: {
  material: Material;
  url: string;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPulsar);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = '';
    };
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4 sm:p-8"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={`Vista ampliada de ${material.nombre}`}
    >
      <div className="mb-3 flex items-center justify-between text-white">
        <p className="truncate text-sm font-bold">{material.nombre}</p>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Cerrar vista ampliada"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <ContenidoMedia material={material} url={url} pantallaCompleta />
      </div>
    </div>
  );
}

export default function VisorMaterial({ materiales }: Props) {
  const [seleccionado, setSeleccionado] = useState(0);
  const [ampliado, setAmpliado] = useState(false);
  const material = materiales[seleccionado];
  const urlMaterial = usarArchivoUrl(material?.url);

  useEffect(() => {
    setSeleccionado(0);
  }, [materiales]);

  if (!material) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
        <ImageIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Este preturno aún no tiene materiales</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">El formador puede adjuntar videos, PDF o imágenes.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {materiales.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {materiales.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSeleccionado(i)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                i === seleccionado
                  ? 'bg-marina-950 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <IconoTipo tipo={m.tipo} />
              <span className="max-w-40 truncate">{m.nombre}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-black/[0.03]">
        {!urlMaterial ? (
          <div className="flex h-full max-h-[420px] items-center justify-center text-sm font-semibold text-slate-400 dark:text-slate-500">
            Cargando material…
          </div>
        ) : (
          <ContenidoMedia material={material} url={urlMaterial} />
        )}
        {urlMaterial && <BotonAbrirExterno material={material} />}
        <button
          type="button"
          onClick={() => setAmpliado(true)}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-marina-950/90 px-3 py-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-indra-600"
          title="Ampliar material"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Ampliar
        </button>
      </div>

      {ampliado && urlMaterial && (
        <VentanaMaterial material={material} url={urlMaterial} onCerrar={() => setAmpliado(false)} />
      )}
    </div>
  );
}
