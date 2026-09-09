import { useMemo, useState } from 'react';
import { Maximize2, Minus, Plus, Search } from 'lucide-react';
import { ActivityTask, ProgressRecord, SequencingOptions } from '../types/schedule';
import {
  dateToPercent,
  formatShort,
  getActivityState,
  getProjectDateRange,
  isActivityLate,
  parseIso,
} from '../services/mockData';

interface GanttChartProps {
  activities: ActivityTask[];
  progress: ProgressRecord[];
  playheadDate: Date;
  statusDate: string;
  options: SequencingOptions;
  selectedActivityId: string | null;
  compact?: boolean;
  emptyHint?: string;
  onSelectActivity: (activity: ActivityTask) => void;
  onPlayheadChange: (percent: number) => void;
  onCreateActivity?: () => void;
}

const LABEL_W = 280;
const ROW_H = 32;
const HEAD_H = 40;
const PLANNED = '#22c55e';
const PLAYHEAD = '#217cbb';
const STATUS = '#ef4444';

export default function GanttChart({
  activities,
  playheadDate,
  statusDate,
  options,
  selectedActivityId,
  compact = false,
  emptyHint,
  onSelectActivity,
  onPlayheadChange,
  onCreateActivity,
}: GanttChartProps) {
  const [zoom, setZoom] = useState(1);
  const range = useMemo(() => getProjectDateRange(activities), [activities]);
  const width = Math.round(920 * zoom);
  const chartW = width - LABEL_W;
  const height = HEAD_H + Math.max(activities.length, 1) * ROW_H + 8;
  const playX = LABEL_W + (dateToPercent(playheadDate, range.start, range.end) / 100) * chartW;
  const statusX = LABEL_W + (dateToPercent(parseIso(statusDate), range.start, range.end) / 100) * chartW;

  const months = useMemo(() => {
    const ticks: { label: string; x: number }[] = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor.getTime() <= range.end.getTime()) {
      ticks.push({
        label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        x: LABEL_W + (dateToPercent(cursor, range.start, range.end) / 100) * chartW,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [range, chartW]);

  const handleTimelineClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    if (x < LABEL_W) return;
    onPlayheadChange(Math.max(0, Math.min(100, ((x - LABEL_W) / chartW) * 100)));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e6e7ee] px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-[12px] text-[#6a6e79]">
          <span className="rounded bg-[#217cbb] px-2 py-0.5 font-semibold text-white">
            {formatShort(playheadDate)}
          </span>
          {!compact && (
            <span>
              Cliquez sur une barre pour sélectionner ses objets 3D. Créez une activité ou importez un planning.
            </span>
          )}
          {!compact && onCreateActivity && (
            <modus-button color="primary" size="small" button-style="outline" onClick={onCreateActivity}>
              Nouvelle activité
            </modus-button>
          )}
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-6 rounded-sm bg-[#22c55e]" /> Planifié
            </span>
            {options.actualProgress && (
              <span className="inline-flex items-center gap-1">
                <span className="h-px w-6 bg-black" /> Réel
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-px border-l border-dashed border-[#ef4444]" /> Date de statut
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[#6a6e79]">
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" aria-label="Rechercher">
            <Search size={14} />
          </button>
          <button
            type="button"
            className="rounded p-1 hover:bg-[#f1f1f6]"
            aria-label="Dézoomer"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
          >
            <Minus size={14} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" aria-label="Ajuster">
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            className="rounded p-1 hover:bg-[#f1f1f6]"
            aria-label="Zoomer"
            onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-[14px] text-[#6a6e79]">
            {emptyHint ?? 'Aucun planning pour le moment. Créez une activité ou importez un fichier 4D.'}
          </p>
          {onCreateActivity && (
            <modus-button color="primary" size="small" onClick={onCreateActivity}>
              Créer une activité
            </modus-button>
          )}
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[860px] cursor-crosshair"
          style={{ width: `${width}px`, height: `${height}px` }}
          onClick={handleTimelineClick}
        >
          <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
          <rect x="0" y="0" width={width} height={HEAD_H} fill="#fafafc" />

          {months.map((tick) => (
            <g key={tick.label}>
              <line x1={tick.x} y1="0" x2={tick.x} y2={height} stroke="#eeeef3" />
              <text x={tick.x + 6} y={26} fontSize="11" fill="#6a6e79">
                {tick.label}
              </text>
            </g>
          ))}

          <line x1={LABEL_W} y1="0" x2={LABEL_W} y2={height} stroke="#e0e1e9" />

          {activities.map((activity, index) => {
            const y = HEAD_H + index * ROW_H;
            const startPct = dateToPercent(parseIso(activity.startDate), range.start, range.end);
            const endPct = dateToPercent(parseIso(activity.endDate), range.start, range.end);
            const x = LABEL_W + (startPct / 100) * chartW;
            const w = Math.max(10, ((endPct - startPct) / 100) * chartW);
            const selected = selectedActivityId === activity.id;
            const late = options.lateElements && isActivityLate(activity, statusDate);
            const state = getActivityState(activity, statusDate);
            const done = state === 'Finished' || state === 'Ahead';
            const actualStart = activity.actualStart ? parseIso(activity.actualStart) : null;
            const actualEnd = activity.actualEnd
              ? parseIso(activity.actualEnd)
              : activity.progressPercent > 0
                ? new Date(
                    parseIso(activity.startDate).getTime()
                      + ((parseIso(activity.endDate).getTime() - parseIso(activity.startDate).getTime())
                        * activity.progressPercent)
                        / 100,
                  )
                : null;
            const ax1 = actualStart
              ? LABEL_W + (dateToPercent(actualStart, range.start, range.end) / 100) * chartW
              : x;
            const ax2 = actualEnd
              ? LABEL_W + (dateToPercent(actualEnd, range.start, range.end) / 100) * chartW
              : x;

            return (
              <g
                key={activity.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectActivity(activity);
                }}
                className="cursor-pointer"
              >
                <rect
                  x="0"
                  y={y}
                  width={width}
                  height={ROW_H}
                  fill={selected ? '#e8f3fb' : index % 2 === 0 ? '#ffffff' : '#fcfcfd'}
                />
                <circle cx="14" cy={y + 16} r="4" fill={done ? '#22c55e' : '#c5c7d1'} />
                <text x="24" y={y + 20} fontSize="12" fill="#252a2e">
                  {activity.name.length > 28 ? `${activity.name.slice(0, 28)}…` : activity.name}
                </text>
                {late && (
                  <text x={LABEL_W - 78} y={y + 20} fontSize="10" fill="#c2410c" fontWeight="600">
                    {activity.assignedObjectIds.length} en retard
                  </text>
                )}
                <text x={LABEL_W - 18} y={y + 20} fontSize="11" fill="#6a6e79" textAnchor="end">
                  {activity.assignedObjectIds.length}
                </text>
                <rect x={x} y={y + 9} width={w} height={14} rx="2" fill={late ? '#ef4444' : PLANNED} />
                <text x={x + 6} y={y + 20} fontSize="10" fill="#ffffff">
                  {activity.name.length > 22 ? `${activity.name.slice(0, 22)}…` : activity.name}
                </text>
                {options.actualProgress && actualEnd && (
                  <line x1={ax1} y1={y + 16} x2={ax2} y2={y + 16} stroke="#111827" strokeWidth="2" />
                )}
              </g>
            );
          })}

          {options.dependencyLinks &&
            activities.flatMap((activity, toIndex) =>
              (activity.predecessors ?? []).map((predId) => {
                const fromIndex = activities.findIndex((a) => a.id === predId);
                if (fromIndex < 0) return null;
                const from = activities[fromIndex];
                const x1 =
                  LABEL_W +
                  (dateToPercent(parseIso(from.endDate), range.start, range.end) / 100) * chartW;
                const y1 = HEAD_H + fromIndex * ROW_H + 16;
                const x2 =
                  LABEL_W +
                  (dateToPercent(parseIso(activity.startDate), range.start, range.end) / 100) * chartW;
                const y2 = HEAD_H + toIndex * ROW_H + 16;
                const stub = 12;
                const midX = x2 >= x1 + stub * 2 ? x1 + Math.max(stub, (x2 - x1) / 2) : x1 + stub;
                const path =
                  Math.abs(y2 - y1) < 1
                    ? `M ${x1} ${y1} L ${x2} ${y2}`
                    : `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                return (
                  <path
                    key={`${predId}-${activity.id}`}
                    d={path}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.1"
                    markerEnd="url(#arrow)"
                  />
                );
              }),
            )}

          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af" />
            </marker>
          </defs>

          <line x1={playX} y1="0" x2={playX} y2={height} stroke={PLAYHEAD} strokeWidth="2" />
          <line
            x1={statusX}
            y1="0"
            x2={statusX}
            y2={height}
            stroke={STATUS}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        </svg>
      </div>
      )}
    </div>
  );
}
