import { useEffect, useState } from 'react';
import type { Material } from '../tipos';
import { usarArchivoUrl } from '../usarArchivo';
import { FileText, Film, Image as ImageIcon, Maximize2, X } from 'lucide-react';

interface Props {
  materiales: Material[];
}

function IconoTipo({ tipo }: { tipo: Material['tipo'] }) {
  if (tipo === 'video') return <Film className="h-4 w-4" />;
  if (tipo === 'pdf') return <FileText className="h-4 w-4" />;
  return <ImageIcon className="h-4 w-4" />;
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
        {material.tipo === 'video' && (
          <video
            key={material.id}
            src={url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-lg bg-black shadow-2xl"
          />
        )}
        {material.tipo === 'imagen' && (
          <img
            src={url}
            alt={material.nombre}
            className="max-h-full max-w-full rounded-lg bg-white dark:bg-slate-900 object-contain shadow-2xl"
          />
        )}
        {material.tipo === 'pdf' && (
          <iframe
            key={material.id}
            src={url}
            title={material.nombre}
            className="h-full w-full max-w-5xl rounded-lg bg-white dark:bg-slate-900 shadow-2xl"
          />
        )}
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
          <>
            {material.tipo === 'video' && (
              <video
                key={material.id}
                src={urlMaterial}
                controls
                playsInline
                className="h-full max-h-[420px] w-full bg-black object-contain"
              />
            )}
            {material.tipo === 'imagen' && (
              <div className="flex h-full max-h-[420px] items-center justify-center bg-white dark:bg-slate-900 p-2">
                <img src={urlMaterial} alt={material.nombre} className="max-h-full w-full rounded-lg object-contain" />
              </div>
            )}
            {material.tipo === 'pdf' && (
              <iframe
                key={material.id}
                src={urlMaterial}
                title={material.nombre}
                className="h-[420px] w-full bg-white dark:bg-slate-900"
              />
            )}
          </>
        )}
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
