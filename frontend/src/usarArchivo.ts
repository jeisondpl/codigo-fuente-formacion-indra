import { useEffect, useState } from 'react';
import { esTokenApi, esTokenArchivo, esTokenIdb, esTokenStorage, leerArchivo, urlPublicaArchivo } from './almacenArchivos';

/**
 * Resuelve una URL de material/portada a una URL mostrable.
 * - Token `sbs:<ruta>` o `api:<nombre>` → URL pública directa (inmediata).
 * - Token `idb:<id>` legado → busca el Blob en IndexedDB y crea una URL de objeto.
 * - dataURL o enlace normal → pasa directo (compatibilidad con datos antiguos).
 * Devuelve `undefined` mientras carga o si el archivo no existe.
 */
export function usarArchivoUrl(url: string | undefined): string | undefined {
  const [resuelta, setResuelta] = useState<string | undefined>(() => {
    if (!url) return undefined;
    if (esTokenStorage(url) || esTokenApi(url)) return urlPublicaArchivo(url);
    return esTokenArchivo(url) ? undefined : url;
  });

  useEffect(() => {
    let activo = true;
    let objectUrl: string | null = null;

    if (!url) {
      setResuelta(undefined);
      return;
    }
    if (esTokenStorage(url) || esTokenApi(url)) {
      setResuelta(urlPublicaArchivo(url));
      return;
    }
    if (!esTokenIdb(url)) {
      setResuelta(url);
      return;
    }

    setResuelta(undefined);
    leerArchivo(url)
      .then((blob) => {
        if (!activo) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setResuelta(objectUrl);
        }
      })
      .catch(() => {});

    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return resuelta;
}
