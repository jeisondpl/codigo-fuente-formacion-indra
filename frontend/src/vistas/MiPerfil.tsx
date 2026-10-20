import type { Usuario } from '../tipos';
import { construirUsuarioLogin, ETIQUETAS_CAMPANA } from '../datos';
import { UserRound } from 'lucide-react';

interface Props {
  usuario: Usuario;
}

/** Perfil del usuario: nombre, datos de acceso y rol. */
export default function MiPerfil({ usuario }: Props) {
  const iniciales = usuario.nombre
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-marina-950 dark:text-slate-100">
          <UserRound className="h-5 w-5 text-indra-600" /> Mi perfil
        </h2>

        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indra-600 text-xl font-black text-white shadow-sm">
            {iniciales}
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-black text-marina-950 dark:text-slate-100">{usuario.nombre}</p>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {construirUsuarioLogin(usuario.documento)} · {usuario.rol}
            </p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              {usuario.campanas.map((c) => (
                <span
                  key={c}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    c === 'sta' ? 'bg-indra-500 text-white' : 'bg-marina-950 text-white'
                  }`}
                >
                  {ETIQUETAS_CAMPANA[c]}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-sm shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Datos de acceso
        </h3>
        <p className="text-slate-600 dark:text-slate-300">
          Usuario: <strong className="font-mono text-indra-700">{construirUsuarioLogin(usuario.documento)}</strong>
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Contraseña: <strong className="font-mono text-indra-700">{usuario.documento}</strong>
        </p>
      </div>
    </div>
  );
}
