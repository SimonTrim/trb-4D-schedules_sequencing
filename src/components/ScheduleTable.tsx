import { ChevronDown, ChevronRight, Box } from 'lucide-react';
import { IFCModelSchedule } from '../types/schedule';
import { formatIso, UNSCHEDULED_MODEL_COUNT } from '../services/mockData';

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
  const scheduled = models.length;
  const total = scheduled + UNSCHEDULED_MODEL_COUNT;

  return (
    <section className="border-b border-[#e6e7ee]">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2 text-left text-[13px] text-[#252a2e] hover:bg-[#f8f8fb]"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-semibold">Models</span>
        <span className="text-[#6a6e79]">
          {total} models · {scheduled} with a schedule
        </span>
      </button>

      {expanded && (
        <div className="min-w-0 overflow-x-auto pb-2">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[#6a6e79]">
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Activities</th>
                <th className="px-3 py-2 font-semibold">Date range</th>
                <th className="px-3 py-2 font-semibold">Status date</th>
                <th className="px-3 py-2 font-semibold">Objects</th>
                <th className="px-3 py-2 font-semibold">Links</th>
                <th className="px-3 py-2 font-semibold">Storage</th>
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
                          {model.storageState}
                        </modus-badge>
                        {model.lateCount ? (
                          <modus-badge color="warning" size="small">
                            {model.lateCount} late
                          </modus-badge>
                        ) : null}
                        <modus-badge color="success" size="small">
                          Actual
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
                        Open in 3D
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
