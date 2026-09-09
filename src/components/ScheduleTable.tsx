import { ChevronDown, ChevronRight, Box } from 'lucide-react';
import { IFCModelSchedule, STORAGE_STATE_LABELS } from '../types/schedule';
import { formatIso } from '../services/mockData';

interface ScheduleTableProps {
  models: IFCModelSchedule[];
  selectedModelId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onSelectModel: (modelId: string) => void;
  onOpenIn3d: (modelId: string) => void;
}

export default function ScheduleTable({
  models,
  selectedModelId,
  expanded,
  onToggle,
  onSelectModel,
  onOpenIn3d,
}: ScheduleTableProps) {
  const scheduled = models.filter((model) => model.activitiesCount > 0).length;

  return (
    <section className="border-b border-[#e6e7ee]">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2 text-left text-[13px] text-[#252a2e] hover:bg-[#f8f8fb]"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-semibold">Modèles</span>
        <span className="text-[#6a6e79]">
          {models.length} modèle{models.length > 1 ? 's' : ''} · {scheduled} avec un planning
        </span>
      </button>

      {expanded && (
        <div className="min-w-0 overflow-x-auto pb-2">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[#6a6e79]">
                <th className="px-3 py-2 font-semibold">Modèle</th>
                <th className="px-3 py-2 font-semibold">Activités</th>
                <th className="px-3 py-2 font-semibold">Période</th>
                <th className="px-3 py-2 font-semibold">Date de statut</th>
                <th className="px-3 py-2 font-semibold">Objets</th>
                <th className="px-3 py-2 font-semibold">Liens</th>
                <th className="px-3 py-2 font-semibold">Stockage</th>
                <th className="px-3 py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const selected = model.modelId === selectedModelId;
                return (
                  <tr
                    key={model.modelId}
                    className={`cursor-pointer border-t border-[#eee] ${
                      selected ? 'bg-[#e8f3fb]' : 'hover:bg-[#f8f8fb]'
                    }`}
                    onClick={() => onSelectModel(model.modelId)}
                  >
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium text-[#0063a3]">
                        <Box size={14} />
                        {model.modelName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{model.activitiesCount}</td>
                    <td className="px-3 py-2.5 text-[#6a6e79]">
                      {formatIso(new Date(`${model.startDate}T00:00:00`))} → {formatIso(new Date(`${model.endDate}T00:00:00`))}
                    </td>
                    <td className="px-3 py-2.5">{model.statusDate}</td>
                    <td className="px-3 py-2.5">{model.objectsCount}</td>
                    <td className="px-3 py-2.5">{model.linksCount}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex flex-wrap gap-1">
                        <modus-badge color={model.storageState === 'Shared' ? 'primary' : 'secondary'} size="small">
                          {STORAGE_STATE_LABELS[model.storageState]}
                        </modus-badge>
                        {model.lateCount ? (
                          <modus-badge color="warning" size="small">
                            {model.lateCount} en retard
                          </modus-badge>
                        ) : null}
                        <modus-badge color="success" size="small">
                          Réel
                        </modus-badge>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        className="text-[13px] font-medium text-[#0063a3] hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenIn3d(model.modelId);
                        }}
                      >
                        Ouvrir en 3D
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
