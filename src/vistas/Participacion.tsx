import type { Campana, Usuario } from '../tipos';
import { ETIQUETAS_CAMPANA, estaDisponible } from '../datos';
import { useStore } from '../store';
import { BarChart3 } from 'lucide-react';

interface Props {
  usuario: Usuario;
  campana: Campana;
}

function pct(val: number, total: number): number {
  return total > 0 ? Math.round((val / total) * 100 * 100) / 100 : 0;
}

function formatearPct(n: number): string {
  return `${n.toFixed(2)} %`;
}

export default function Participacion({ usuario: _usuario, campana }: Props) {
  const { estado } = useStore();

  const formaciones = estado.preturnos
    .filter((p) => p.campanas.includes(campana) && !p.oculto && estaDisponible(p))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const asesores = estado.usuarios.filter(
    (u) => u.rol === 'Asesor' && u.campanas.includes(campana),
  );
  const supervisores = estado.usuarios.filter(
    (u) => u.rol === 'Supervisor' && u.campanas.includes(campana),
  );

  const idsHechosPorAsesor = new Map<string, Set<string>>();
  for (const a of asesores) {
    idsHechosPorAsesor.set(
      a.id,
      new Set(
        estado.intentos.filter((i) => i.usuarioId === a.id).map((i) => i.preturnoId),
      ),
    );
  }

  const cobertura = (supervisorId?: string) => {
    const grupo = asesores.filter((a) => a.supervisorId === supervisorId);
    const posible = grupo.length * formaciones.length;
    const hechos = grupo.reduce(
      (sum, a) =>
        sum + formaciones.filter((f) => idsHechosPorAsesor.get(a.id)?.has(f.id)).length,
      0,
    );
    return { grupo, posible, hechos, pct: pct(hechos, posible) };
  };

  // Todos los supervisores (aunque no tengan asesores asignados)
  const grupos = supervisores.map((s) => ({ supervisor: s, ...cobertura(s.id) }));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indra-100 text-indra-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-marina-950 dark:text-slate-100 sm:text-lg">
              COBERTURA% <span className="text-indra-600">POR JEFE INMEDIATO</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ETIQUETAS_CAMPANA[campana]} · {formaciones.length}{' '}
              {formaciones.length === 1 ? 'formación visible' : 'formaciones visibles'} · se
              actualiza con cada intento
            </p>
          </div>
        </div>

        {supervisores.length === 0 && asesores.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-6 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Aún no hay supervisores ni asesores registrados en esta campaña.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            {grupos.map((g) => (
              <div key={g.supervisor.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-xs font-bold text-marina-950 dark:text-slate-100 sm:text-sm">
                    {g.supervisor.nombre.toUpperCase()}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-black sm:text-sm ${
                      g.pct >= 70
                        ? 'text-emerald-600'
                        : g.pct > 0
                          ? 'text-indra-600'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {formatearPct(g.pct)}
                  </span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.pct >= 70
                        ? 'bg-emerald-500'
                        : g.pct > 0
                          ? 'bg-indra-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(g.pct, g.posible === 0 ? 0 : 1.5))}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {g.hechos} de {g.posible} formaciones · {g.grupo.length}{' '}
                  {g.grupo.length === 1 ? 'asesor' : 'asesores'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
