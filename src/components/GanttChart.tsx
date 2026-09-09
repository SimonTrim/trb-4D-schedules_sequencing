import { useMemo, useRef, useState } from 'react';
import { Link2, Maximize2, Minus, Plus, Search } from 'lucide-react';
import { ActivityTask, ProgressRecord, SequencingOptions } from '../types/schedule';
import {
  dateToPercent,
  formatIso,
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
  linkMode?: boolean;
  onToggleLinkMode?: () => void;
  onSelectActivity: (activity: ActivityTask) => void;
  onPlayheadChange: (percent: number) => void;
  onCreateActivity?: () => void;
  onChangeActivity?: (next: ActivityTask) => void;
  onLinkActivities?: (fromId: string, toId: string) => void;
  onUnlinkActivities?: (fromId: string, toId: string) => void;
}

const LABEL_W = 280;
const ROW_H = 32;
const HEAD_H = 40;
const BAR_Y = 9;
const BAR_H = 14;
const PLANNED = '#22c55e';
const PLAYHEAD = '#217cbb';
const STATUS = '#ef4444';
const LINK = '#6a6e79';
const STUB = 10;
const ARROW_GAP = 8;

type DragKind = 'move' | 'start' | 'end';

interface BarGeom {
  x: number;
  w: number;
  right: number;
  cy: number;
}

interface DragState {
  id: string;
  kind: DragKind;
  originX: number;
  startDate: string;
  endDate: string;
}

function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return formatIso(date);
}

function minDuration(start: string, end: string): { startDate: string; endDate: string } {
  if (parseIso(end).getTime() < parseIso(start).getTime()) {
    return { startDate: start, endDate: start };
  }
  return { startDate: start, endDate: end };
}

function barGeom(activity: ActivityTask, range: { start: Date; end: Date }, chartW: number, index: number): BarGeom {
  const startPct = dateToPercent(parseIso(activity.startDate), range.start, range.end);
  const endPct = dateToPercent(parseIso(activity.endDate), range.start, range.end);
  const x = LABEL_W + (startPct / 100) * chartW;
  const w = Math.max(12, ((endPct - startPct) / 100) * chartW);
  return {
    x,
    w,
    right: x + w,
    cy: HEAD_H + index * ROW_H + BAR_Y + BAR_H / 2,
  };
}

function finishToStartPath(
  from: BarGeom,
  to: BarGeom,
  fromIndex: number,
  toIndex: number,
  geoms: BarGeom[],
  chartRight: number,
): string {
  const x1 = from.right;
  const y1 = from.cy;
  const x2 = to.x;
  const y2 = to.cy;
  const endX = x2 - ARROW_GAP;

  if (fromIndex === toIndex) {
    return `M ${x1} ${y1} L ${Math.max(x1 + 2, endX)} ${y2}`;
  }

  const lo = Math.min(fromIndex, toIndex);
  const hi = Math.max(fromIndex, toIndex);
  const mid = (x1 + x2) / 2;
  if (endX >= x1 + STUB * 2) {
    let midClear = true;
    for (let i = lo; i <= hi; i += 1) {
      if (i === fromIndex || i === toIndex) continue;
      if (mid >= geoms[i].x - 3 && mid <= geoms[i].right + 3) {
        midClear = false;
        break;
      }
    }
    if (midClear) {
      const laneX = Math.min(Math.max(x1 + STUB, mid), endX - STUB);
      return `M ${x1} ${y1} L ${laneX} ${y1} L ${laneX} ${y2} L ${endX} ${y2}`;
    }
  }

  let rightLane = x1 + STUB;
  for (let i = lo; i <= hi; i += 1) {
    rightLane = Math.max(rightLane, geoms[i].right + STUB);
  }
  rightLane = Math.min(rightLane, chartRight - 4);
  const inX = Math.max(LABEL_W + 6, endX - STUB);
  const gutterY = fromIndex < toIndex
    ? HEAD_H + toIndex * ROW_H
    : HEAD_H + toIndex * ROW_H + ROW_H;
  return `M ${x1} ${y1} L ${rightLane} ${y1} L ${rightLane} ${gutterY} L ${inX} ${gutterY} L ${inX} ${y2} L ${endX} ${y2}`;
}

export default function GanttChart({
  activities,
  playheadDate,
  statusDate,
  options,
  selectedActivityId,
  compact = false,
  emptyHint,
  linkMode = false,
  onToggleLinkMode,
  onSelectActivity,
  onPlayheadChange,
  onCreateActivity,
  onChangeActivity,
  onLinkActivities,
  onUnlinkActivities,
}: GanttChartProps) {
  const [zoom, setZoom] = useState(1);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [preview, setPreview] = useState<{ id: string; startDate: string; endDate: string } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const draggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const range = useMemo(() => getProjectDateRange(activities), [activities]);
  const width = Math.round(920 * zoom) + 28;
  const chartW = width - LABEL_W - 28;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? activities.filter((activity) => activity.name.toLowerCase().includes(q))
      : activities;
    if (!preview) return source;
    return source.map((activity) =>
      activity.id === preview.id
        ? { ...activity, startDate: preview.startDate, endDate: preview.endDate }
        : activity,
    );
  }, [activities, query, preview]);
  const height = HEAD_H + Math.max(visible.length, 1) * ROW_H + 8;
  const playX = LABEL_W + (dateToPercent(playheadDate, range.start, range.end) / 100) * chartW;
  const statusX = LABEL_W + (dateToPercent(parseIso(statusDate), range.start, range.end) / 100) * chartW;
  const geoms = useMemo(
    () => visible.map((activity, index) => barGeom(activity, range, chartW, index)),
    [visible, range, chartW],
  );

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

  const daysFromDelta = (dx: number) => {
    const spanDays = Math.max(1, (range.end.getTime() - range.start.getTime()) / 86_400_000);
    return Math.round((dx / chartW) * spanDays);
  };

  const datesFromDrag = (clientX: number) => {
    const drag = dragRef.current;
    if (!drag) return null;
    const days = daysFromDelta(clientX - drag.originX);
    if (drag.kind === 'move') {
      return { startDate: addDays(drag.startDate, days), endDate: addDays(drag.endDate, days) };
    }
    if (drag.kind === 'start') {
      return minDuration(addDays(drag.startDate, days), drag.endDate);
    }
    return minDuration(drag.startDate, addDays(drag.endDate, days));
  };

  const previewDrag = (clientX: number) => {
    const drag = dragRef.current;
    const next = datesFromDrag(clientX);
    if (!drag || !next) return;
    setPreview({ id: drag.id, ...next });
  };

  const commitDrag = (clientX: number) => {
    const drag = dragRef.current;
    const nextDates = datesFromDrag(clientX);
    const activity = drag ? activities.find((item) => item.id === drag.id) : null;
    dragRef.current = null;
    setPreview(null);
    if (!drag || !nextDates || !activity || !onChangeActivity) return;
    onChangeActivity({ ...activity, ...nextDates });
  };

  const handleTimelineClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (draggingRef.current) return;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    if (x < LABEL_W) return;
    onPlayheadChange(Math.max(0, Math.min(100, ((x - LABEL_W) / chartW) * 100)));
  };

  const startDrag = (activity: ActivityTask, kind: DragKind, clientX: number, event: React.PointerEvent) => {
    if (!onChangeActivity || linkMode) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      id: activity.id,
      kind,
      originX: clientX,
      startDate: activity.startDate,
      endDate: activity.endDate,
    };
    draggingRef.current = false;
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const canEditLinks = Boolean(onLinkActivities);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e6e7ee] px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-[12px] text-[#6a6e79]">
          <span className="rounded bg-[#217cbb] px-2 py-0.5 font-semibold text-white">
            {formatShort(playheadDate)}
          </span>
          {!compact && (
            <span>
              Glissez une barre pour la déplacer, ses bords pour changer les dates. Les liaisons partent de la fin
              et arrivent au début.
            </span>
          )}
          {!compact && onCreateActivity && (
            <modus-button color="primary" size="small" button-style="outline" onClick={onCreateActivity}>
              Nouvelle activité
            </modus-button>
          )}
          {canEditLinks && onToggleLinkMode && (
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium ${
                linkMode ? 'bg-[#0063a3] text-white' : 'border border-[#d0d1db] bg-white text-[#252a2e]'
              }`}
              onClick={() => {
                setLinkSourceId(null);
                onToggleLinkMode();
              }}
            >
              <Link2 size={13} />
              {linkMode ? 'Liaison…' : 'Relier'}
            </button>
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
          {showSearch && (
            <input
              className="w-36 rounded border border-[#d0d1db] px-2 py-0.5 text-[12px]"
              placeholder="Filtrer…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          <button
            type="button"
            className="rounded p-1 hover:bg-[#f1f1f6]"
            aria-label="Rechercher"
            onClick={() => setShowSearch((value) => !value)}
          >
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
          <button
            type="button"
            className="rounded p-1 hover:bg-[#f1f1f6]"
            aria-label="Ajuster"
            onClick={() => setZoom(1)}
          >
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

      {linkMode && (
        <div className="shrink-0 border-b border-[#d7e8f5] bg-[#e8f3fb] px-3 py-1.5 text-[12px] text-[#0063a3]">
          {linkSourceId
            ? 'Cliquez sur une ou plusieurs activités cibles. Cliquez une liaison pour la supprimer.'
            : 'Cliquez sur l’activité source, puis sur les activités à relier (1 vers n).'}
        </div>
      )}

      {visible.length === 0 ? (
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
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-[860px] cursor-crosshair"
            style={{ width: `${width}px`, height: `${height}px` }}
            onClick={handleTimelineClick}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              if (Math.abs(event.clientX - dragRef.current.originX) > 3) draggingRef.current = true;
              previewDrag(event.clientX);
            }}
            onPointerUp={(event) => {
              if (dragRef.current) {
                commitDrag(event.clientX);
                window.setTimeout(() => {
                  draggingRef.current = false;
                }, 0);
              }
            }}
          >
            <defs>
              <marker id="gantt-arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L8,4 L0,8 Z" fill={LINK} />
              </marker>
            </defs>

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

            {visible.map((activity, index) => {
              const y = HEAD_H + index * ROW_H;
              const geom = geoms[index];
              const selected = selectedActivityId === activity.id;
              const source = linkSourceId === activity.id;
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
                : geom.x;
              const ax2 = actualEnd
                ? LABEL_W + (dateToPercent(actualEnd, range.start, range.end) / 100) * chartW
                : geom.x;

              return (
                <g
                  key={activity.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (draggingRef.current) return;
                    if (linkMode && onLinkActivities) {
                      if (!linkSourceId) {
                        setLinkSourceId(activity.id);
                        onSelectActivity(activity);
                        return;
                      }
                      if (linkSourceId !== activity.id) onLinkActivities(linkSourceId, activity.id);
                      onSelectActivity(activity);
                      return;
                    }
                    onSelectActivity(activity);
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x="0"
                    y={y}
                    width={width}
                    height={ROW_H}
                    fill={source ? '#d7e8f5' : selected ? '#e8f3fb' : index % 2 === 0 ? '#ffffff' : '#fcfcfd'}
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
                  <rect
                    x={geom.x}
                    y={y + BAR_Y}
                    width={geom.w}
                    height={BAR_H}
                    rx="2"
                    fill={late ? '#ef4444' : PLANNED}
                    onPointerDown={(event) => startDrag(activity, 'move', event.clientX, event)}
                  />
                  {onChangeActivity && !linkMode && (
                    <>
                      <rect
                        x={geom.x}
                        y={y + BAR_Y}
                        width="6"
                        height={BAR_H}
                        fill="transparent"
                        className="cursor-ew-resize"
                        onPointerDown={(event) => startDrag(activity, 'start', event.clientX, event)}
                      />
                      <rect
                        x={geom.right - 6}
                        y={y + BAR_Y}
                        width="6"
                        height={BAR_H}
                        fill="transparent"
                        className="cursor-ew-resize"
                        onPointerDown={(event) => startDrag(activity, 'end', event.clientX, event)}
                      />
                    </>
                  )}
                  {options.actualProgress && actualEnd && (
                    <line
                      x1={ax1}
                      y1={y + BAR_Y + BAR_H - 2}
                      x2={ax2}
                      y2={y + BAR_Y + BAR_H - 2}
                      stroke="#111827"
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}

            {options.dependencyLinks &&
              visible.flatMap((activity, toIndex) =>
                (activity.predecessors ?? []).map((predId) => {
                  const fromIndex = visible.findIndex((item) => item.id === predId);
                  if (fromIndex < 0) return null;
                  const path = finishToStartPath(
                    geoms[fromIndex],
                    geoms[toIndex],
                    fromIndex,
                    toIndex,
                    geoms,
                    width,
                  );
                  return (
                    <path
                      key={`${predId}-${activity.id}`}
                      d={path}
                      fill="none"
                      stroke={LINK}
                      strokeWidth="1.6"
                      markerEnd="url(#gantt-arrow)"
                      className={onUnlinkActivities ? 'cursor-pointer' : undefined}
                      onClick={(event) => {
                        event.stopPropagation();
                        onUnlinkActivities?.(predId, activity.id);
                      }}
                    >
                      <title>Liaison Fin → Début — cliquer pour supprimer</title>
                    </path>
                  );
                }),
              )}

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
