import { useMemo, useState } from 'react';
import { ActivityTask, ScheduleBaseline } from '../types/schedule';
import { compareBaseline } from '../services/baselines';
import { formatShort } from '../services/mockData';

interface BaselinesPanelProps {
  activities: ActivityTask[];
  baselines: ScheduleBaseline[];
  activeBaselineId: string | null;
  statusDate: string;
  onCapture: (name: string) => void;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

function deltaLabel(days: number): string {
  if (days === 0) return '0 j';
  return `${days > 0 ? '+' : ''}${days} j`;
}

export default function BaselinesPanel({
  activities,
  baselines,
  activeBaselineId,
  statusDate,
  onCapture,
  onSelect,
  onDelete,
}: BaselinesPanelProps) {
  const [name, setName] = useState('');
  const activeBaseline = baselines.find((baseline) => baseline.id === activeBaselineId) ?? null;
  const variance = useMemo(
    () => (activeBaseline ? compareBaseline(activeBaseline, activities) : []),
    [activeBaseline, activities],
  );

  const slipped = variance.filter((row) => row.endDeltaDays > 0).length;
  const ahead = variance.filter((row) => row.endDeltaDays < 0).length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto">
      <div>
        <h3 className="mb-1 text-[16px] font-semibold text-[#252a2e]">Références de planning</h3>
        <p className="max-w-3xl text-[13px] text-[#6a6e79]">
          Enregistrez un instantané du planning courant, puis comparez les écarts de dates et
          d&apos;avancement par activité.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded border border-[#e6e7ee] bg-[#fafafc] p-3">
        <label className="min-w-[220px] text-[12px] text-[#6a6e79]">
          Nom de la référence
          <input
            className="mt-1 w-full rounded border border-[#d0d1db] px-2 py-1.5 text-[13px] text-[#252a2e]"
            placeholder="Ex. Référence T0"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <modus-button
          color="primary"
          onClick={() => {
            onCapture(name);
            setName('');
          }}
          disabled={activities.length === 0}
        >
          Enregistrer la référence
        </modus-button>
      </div>

      {baselines.length === 0 ? (
        <div className="rounded border border-dashed border-[#d7d9e0] px-4 py-8 text-center text-[13px] text-[#6a6e79]">
          Aucune référence enregistrée. Créez une première baseline à partir du planning actuel.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded border border-[#e6e7ee] bg-white">
            <div className="border-b border-[#e6e7ee] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[#6a6e79]">
              Références ({baselines.length})
            </div>
            <ul className="divide-y divide-[#eee]">
              {baselines.map((baseline) => (
                <li key={baseline.id} className="px-3 py-2">
                  <button
                    type="button"
                    className={`w-full text-left ${activeBaselineId === baseline.id ? 'text-[#0063a3]' : 'text-[#252a2e]'}`}
                    onClick={() => onSelect(baseline.id)}
                  >
                    <div className="text-[13px] font-semibold">{baseline.name}</div>
                    <div className="mt-1 text-[11px] text-[#6a6e79]">
                      {formatShort(baseline.capturedAt.slice(0, 10))} · {baseline.activities.length} activités
                    </div>
                  </button>
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-[#c2410c] hover:underline"
                    onClick={() => onDelete(baseline.id)}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {activeBaseline ? (
            <div className="min-w-0 rounded border border-[#e6e7ee] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6e7ee] px-3 py-2">
                <div>
                  <div className="text-[14px] font-semibold text-[#252a2e]">{activeBaseline.name}</div>
                  <div className="text-[12px] text-[#6a6e79]">
                    Capturée le {formatShort(activeBaseline.capturedAt.slice(0, 10))} · date de statut{' '}
                    {formatShort(activeBaseline.statusDate)}
                  </div>
                </div>
                <div className="flex gap-2 text-[12px]">
                  <span className="rounded bg-[#fff7ed] px-2 py-1 text-[#c2410c]">{slipped} en retard</span>
                  <span className="rounded bg-[#eff6ff] px-2 py-1 text-[#217cbb]">{ahead} en avance</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead className="bg-[#fafafc] text-[11px] uppercase tracking-wide text-[#6a6e79]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Activité</th>
                      <th className="px-3 py-2 font-semibold">Réf. début</th>
                      <th className="px-3 py-2 font-semibold">Réf. fin</th>
                      <th className="px-3 py-2 font-semibold">Actuel début</th>
                      <th className="px-3 py-2 font-semibold">Actuel fin</th>
                      <th className="px-3 py-2 font-semibold">Écart fin</th>
                      <th className="px-3 py-2 font-semibold">Écart %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variance.map((row) => (
                      <tr key={row.id} className="border-t border-[#eee]">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-[#6a6e79]">{row.baselineStart}</td>
                        <td className="px-3 py-2 text-[#6a6e79]">{row.baselineEnd}</td>
                        <td className="px-3 py-2">{row.currentStart}</td>
                        <td className="px-3 py-2">{row.currentEnd}</td>
                        <td
                          className={`px-3 py-2 font-medium ${
                            row.endDeltaDays > 0
                              ? 'text-[#dc2626]'
                              : row.endDeltaDays < 0
                                ? 'text-[#217cbb]'
                                : 'text-[#252a2e]'
                          }`}
                        >
                          {deltaLabel(row.endDeltaDays)}
                        </td>
                        <td className="px-3 py-2">
                          {row.progressDelta === 0 ? '—' : `${row.progressDelta > 0 ? '+' : ''}${row.progressDelta}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-[#d7d9e0] px-4 py-8 text-[13px] text-[#6a6e79]">
              Sélectionnez une référence pour afficher la comparaison.
            </div>
          )}
        </div>
      )}

      <p className="text-[12px] text-[#6a6e79]">
        Date de statut courante : {formatShort(statusDate)}. Les écarts sont calculés sur les activités
        encore présentes dans le planning.
      </p>
    </div>
  );
}
