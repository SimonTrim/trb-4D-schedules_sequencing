import { StatusHeatmapCell } from '../types/schedule';

interface StatusHeatmapProps {
  cells: StatusHeatmapCell[];
}

export default function StatusHeatmap({ cells }: StatusHeatmapProps) {
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);

  return (
    <div className="rounded border border-[#e6e7ee] bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-[14px] font-semibold text-[#252a2e]">Heatmap des statuts de pose</h4>
          <p className="text-[12px] text-[#6a6e79]">
            Répartition des objets IFC assignés à la date de statut.
          </p>
        </div>
        <div className="text-[12px] text-[#6a6e79]">{total} objet{total > 1 ? 's' : ''}</div>
      </div>

      {total === 0 ? (
        <div className="rounded border border-dashed border-[#d7d9e0] px-4 py-6 text-center text-[13px] text-[#6a6e79]">
          Aucun objet assigné. Liez des éléments 3D aux activités depuis le viewer.
        </div>
      ) : (
        <>
          <div className="flex h-8 overflow-hidden rounded">
            {cells
              .filter((cell) => cell.count > 0)
              .map((cell) => (
                <div
                  key={cell.status}
                  className="flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{
                    width: `${cell.percent}%`,
                    backgroundColor: cell.colorHex,
                    minWidth: cell.count > 0 ? '28px' : undefined,
                  }}
                  title={`${cell.label}: ${cell.count}`}
                >
                  {cell.percent >= 8 ? `${cell.percent}%` : ''}
                </div>
              ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {cells.map((cell) => (
              <div
                key={cell.status}
                className="flex items-center justify-between rounded border border-[#eee] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: cell.colorHex }}
                  />
                  <span className="text-[12px] text-[#252a2e]">{cell.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-[#252a2e]">{cell.count}</div>
                  <div className="text-[11px] text-[#6a6e79]">{cell.percent}%</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
