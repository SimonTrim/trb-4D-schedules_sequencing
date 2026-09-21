import { ActivityTask, ProgressStatus, STATUS_CONFIGS } from '../types/schedule';

interface SelectionStatusPanelProps {
  selectionCount: number;
  targetActivity: ActivityTask | null;
  onApplyStatus: (status: ProgressStatus) => void;
  onAssignSelection: (mode: 'add' | 'replace') => void;
  onOpenActivities: () => void;
}

const STATUS_ORDER: ProgressStatus[] = [
  'NOT_STARTED',
  'PROCUREMENT',
  'DELIVERED',
  'INSTALLED',
  'APPROVED',
  'BLOCKED',
];

export default function SelectionStatusPanel({
  selectionCount,
  targetActivity,
  onApplyStatus,
  onAssignSelection,
  onOpenActivities,
}: SelectionStatusPanelProps) {
  const disabled = selectionCount === 0;

  return (
    <div className="flex flex-col gap-3 border-t border-[#e6e7ee] pt-3">
      <div>
        <div className="text-[13px] font-semibold text-[#252a2e]">Sélection 3D</div>
        <p className="mt-1 text-[11px] leading-snug text-[#6a6e79]">
          {selectionCount > 0
            ? `${selectionCount} objet${selectionCount > 1 ? 's' : ''} sélectionné${selectionCount > 1 ? 's' : ''} dans le viewer.`
            : 'Sélectionnez des objets dans la maquette 3D, puis assignez-les à une activité ou mettez à jour leur statut.'}
        </p>
      </div>

      {targetActivity ? (
        <div className="rounded border border-[#e6e7ee] bg-[#fafafc] px-2.5 py-2 text-[12px]">
          <span className="text-[#6a6e79]">Activité cible · </span>
          <span className="font-medium text-[#252a2e]">{targetActivity.name}</span>
          <span className="text-[#6a6e79]"> · {targetActivity.assignedObjectIds.length} objets</span>
        </div>
      ) : (
        <button
          type="button"
          className="text-left text-[12px] font-medium text-[#0063a3] hover:underline"
          onClick={onOpenActivities}
        >
          Choisir une activité cible…
        </button>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIGS[status];
          return (
            <button
              key={status}
              type="button"
              disabled={disabled}
              className="flex items-center gap-2 rounded border border-[#e6e7ee] bg-white px-2 py-1.5 text-left text-[11px] disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f8f8fb]"
              onClick={() => onApplyStatus(status)}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: config.colorHex }}
              />
              <span className="truncate text-[#252a2e]">{config.labelFr}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <modus-button
          color="primary"
          size="small"
          disabled={disabled || !targetActivity}
          onClick={() => onAssignSelection('add')}
        >
          Lier à l&apos;activité
        </modus-button>
        <modus-button
          color="secondary"
          size="small"
          button-style="outline"
          disabled={disabled || !targetActivity}
          onClick={() => onAssignSelection('replace')}
        >
          Remplacer les liens
        </modus-button>
      </div>
    </div>
  );
}
