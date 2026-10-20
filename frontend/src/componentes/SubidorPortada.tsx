import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { borrarArchivo, guardarArchivo, LIMITE_ARCHIVO } from '../almacenArchivos';
import { usarArchivoUrl } from '../usarArchivo';

interface Props {
  portada: string | null;
  onCambiar: (portada: string | null) => void;
  /** En modo edición (true) no se borra la portada anterior al cambiar/quitar; se limpia al guardar. */
  diferido?: boolean;
}

export default function SubidorPortada({ portada, onCambiar, diferido }: Props) {
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const profundidadRef = useRef(0);
  const urlPortada = usarArchivoUrl(portada ?? undefined);

  const procesarArchivo = useCallback(
    (archivo: File) => {
      setError(null);
      if (!archivo.type.startsWith('image/')) {
        setError('La portada debe ser una imagen (PNG, JPG, etc.).');
        return;
      }
      if (archivo.size > LIMITE_ARCHIVO) {
        setError('La imagen supera el límite de 20 MB. Usa una imagen más ligera.');
        return;
      }
      const anterior = portada;
      guardarArchivo(archivo)
        .then((token) => {
          if (anterior && !diferido) void borrarArchivo(anterior);
          onCambiar(token);
        })
        .catch(() => setError('No fue posible guardar la imagen. Intenta de nuevo.'));
    },
    [onCambiar, portada, diferido],
  );

  if (portada) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {urlPortada ? (
            <img src={urlPortada} alt="Portada seleccionada" className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 w-full items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-400 dark:text-slate-500">
              Cargando portada…
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (!diferido) void borrarArchivo(portada);
              onCambiar(null);
            }}
            className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Quitar portada
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Esta imagen se mostrará como banner en la tarjeta y en la vista del asesor.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => entradaRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') entradaRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          profundidadRef.current += 1;
          setArrastrando(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.dropEffect) e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          profundidadRef.current = Math.max(0, profundidadRef.current - 1);
          if (profundidadRef.current === 0) setArrastrando(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          profundidadRef.current = 0;
          setArrastrando(false);
          const archivo = e.dataTransfer.files[0];
          if (archivo) procesarArchivo(archivo);
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-5 py-5 transition-colors ${
          arrastrando
            ? 'border-indra-500 bg-indra-100'
            : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-indra-600 hover:bg-indra-100/50'
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indra-100 text-indra-600">
          <ImagePlus className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Arrastra una imagen de portada o haz clic para seleccionarla
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">PNG o JPG · opcional</p>
        </div>
        <input
          ref={entradaRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) procesarArchivo(archivo);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
