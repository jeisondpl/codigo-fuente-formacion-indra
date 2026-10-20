import { useCallback, useRef, useState } from 'react';
import type { Material, TipoMaterial } from '../tipos';
import { generarId } from '../datos';
import { leerArchivo, guardarArchivo, LIMITE_ARCHIVO } from '../almacenArchivos';
import { Download } from 'lucide-react';

const MB = 1024 * 1024;

function tipoDesdeMime(mime: string): TipoMaterial | null {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'imagen';
  if (mime === 'application/pdf') return 'pdf';
  return null;
}

function textoTamano(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

interface Props {
  materiales: Material[];
  onAgregar: (material: Material) => void;
  onQuitar: (id: string) => void;
}

export default function SubidorArchivos({ materiales, onAgregar, onQuitar }: Props) {
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const profundidadRef = useRef(0);

  const procesarArchivo = useCallback(
    (archivo: File) => {
      setError(null);
      const tipo = tipoDesdeMime(archivo.type);
      if (!tipo) {
        setError(`"${archivo.name}" no es un formato admitido. Usa video, PDF o imagen.`);
        return;
      }
      if (archivo.size > LIMITE_ARCHIVO) {
        setError(
          `"${archivo.name}" pesa ${textoTamano(archivo.size)} y supera el límite de 20 MB. ` +
            'Comprime el video o usa un archivo más ligero.',
        );
        return;
      }
      // El archivo se sube de inmediato a la nube (Supabase Storage).
      guardarArchivo(archivo)
        .then((token) => {
          onAgregar({
            id: generarId(),
            nombre: archivo.name,
            tipo,
            url: token,
            persistente: true,
          });
        })
        .catch(() => setError(`No fue posible guardar "${archivo.name}". Intenta de nuevo.`));
    },
    [onAgregar],
  );

  const descargarMaterial = async (material: Material) => {
    setError(null);
    setDescargandoId(material.id);
    try {
      let href = material.url;
      let temporal = false;

      if (material.url.startsWith('sbs:') || material.url.startsWith('idb:')) {
        const blob = await leerArchivo(material.url);
        if (!blob) throw new Error('archivo no disponible');
        href = URL.createObjectURL(blob);
        temporal = true;
      }

      const enlace = document.createElement('a');
      enlace.href = href;
      enlace.download = material.nombre;
      enlace.rel = 'noopener';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      if (temporal) URL.revokeObjectURL(href);
    } catch {
      setError(`No fue posible descargar "${material.nombre}". Intenta de nuevo.`);
    } finally {
      setDescargandoId(null);
    }
  };

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
          const archivos = Array.from(e.dataTransfer.files);
          if (archivos.length === 0) return;
          archivos.forEach(procesarArchivo);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          arrastrando
            ? 'border-indra-500 bg-indra-100'
            : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-indra-600 hover:bg-indra-100/50'
        }`}
      >
        <svg
          className={`h-10 w-10 ${arrastrando ? 'text-indra-500' : 'text-indra-600'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Arrastra archivos aquí o haz clic para seleccionarlos
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Videos, PDF o imágenes · máx. 20 MB por archivo</p>
        <input
          ref={entradaRef}
          type="file"
          multiple
          accept="video/*,application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(procesarArchivo);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      {materiales.length > 0 && (
        <ul className="mt-3 space-y-2">
          {materiales.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${
                    m.tipo === 'video'
                      ? 'bg-indra-100 text-indra-700'
                      : m.tipo === 'pdf'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {m.tipo}
                </span>
                <span className="truncate text-sm text-slate-700 dark:text-slate-200">{m.nombre}</span>
                {!m.persistente && (
                  <span className="shrink-0 text-[11px] text-amber-600">(solo esta sesión)</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void descargarMaterial(m)}
                  disabled={descargandoId === m.id}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indra-600 hover:bg-indra-100 disabled:cursor-wait disabled:opacity-60"
                  title={`Descargar ${m.nombre}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {descargandoId === m.id ? 'Descargando…' : 'Descargar'}
                </button>
                <button
                  type="button"
                  onClick={() => onQuitar(m.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
