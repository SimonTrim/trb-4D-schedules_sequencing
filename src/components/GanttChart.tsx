import { useMemo, useRef, useState } from 'react';
import { Link2, Maximize2, Minus, Plus, Search } from 'lucide-react';
import { ActivityTask, LinkRoute, ProgressRecord, SequencingOptions } from '../types/schedule';
import {
  dateToPercent,
  formatIso,
  formatShort,
  getActualProgressRange,
  getDelayEnd,
  getProjectDateRange,
  isActivityLate,
  parseIso,
} from '../services/mockData';
import { computeLinkGeometry, routeFromGeometry, type BarGeom } from '../services/ganttLinks';

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

const DEFAULT_LABEL_W = 280;
const MIN_LABEL_W = 180;
const MAX_LABEL_W = 560;
const LABEL_W_KEY = 'tc-4d-gantt-label-w';
const ROW_H = 32;
const HEAD_H = 44;
const BAR_Y = 8;
const BAR_H = 16;
const PLANNED_DONE = '#16a34a';
const PLANNED_TODO = '#86efac';
const LATE_DONE = '#dc2626';
const LATE_TODO = '#fca5a5';
const PLAYHEAD = '#217cbb';
const STATUS = '#ef4444';
const LINK = '#6a6e79';
type DragKind = 'move' | 'start' | 'end';
type PointerMode = 'bar' | 'playhead' | 'column' | 'link' | null;
type LinkHandle = 'out' | 'mid' | 'in';

interface SelectedLink {
  fromId: string;
  toId: string;
}

interface BarDragState {
  id: string;
  kind: DragKind;
  originX: number;
  startDate: string;
  endDate: string;
}

function readLabelWidth(): number {
  try {
    const raw = localStorage.getItem(LABEL_W_KEY);
    const value = raw ? Number(raw) : DEFAULT_LABEL_W;
    if (!Number.isFinite(value)) return DEFAULT_LABEL_W;
    return Math.max(MIN_LABEL_W, Math.min(MAX_LABEL_W, value));
  } catch {
    return DEFAULT_LABEL_W;
  }
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

function formatCursor(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function truncateToWidth(text: string, px: number): string {
  const max = Math.max(0, Math.floor(px / 6.4));
  if (max < 2) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function playheadProgress(activity: ActivityTask, playhead: Date): number {
  const start = parseIso(activity.startDate).getTime();
  const end = parseIso(activity.endDate).getTime();
  const time = playhead.getTime();
  if (time <= start) return 0;
  if (time >= end) return 1;
  if (end <= start) return 1;
  return (time - start) / (end - start);
}

function barGeom(
  activity: ActivityTask,
  range: { start: Date; end: Date },
  chartW: number,
  index: number,
  labelW: number,
): BarGeom {
  const startPct = dateToPercent(parseIso(activity.startDate), range.start, range.end);
  const endPct = dateToPercent(parseIso(activity.endDate), range.start, range.end);
  const x = labelW + (startPct / 100) * chartW;
  const w = Math.max(12, ((endPct - startPct) / 100) * chartW);
  return {
    x,
    w,
    right: x + w,
    cy: HEAD_H + index * ROW_H + BAR_Y + BAR_H / 2,
  };
}

interface LinkDragState {
  fromId: string;
  toId: string;
  handle: LinkHandle;
  outX: number;
  midY: number;
  inX: number;
}

function CursorCircle({ cx, cy, progress }: { cx: number; cy: number; progress: number }) {
  const value = Math.max(0, Math.min(1, progress));
  if (value <= 0.001) {
    return <circle cx={cx} cy={cy} r="5" fill="#ffffff" stroke="#c5c7d1" strokeWidth="1.6" />;
  }
  if (value >= 0.999) {
    return <circle cx={cx} cy={cy} r="5" fill="#16a34a" />;
  }
  const angle = value * Math.PI * 2 - Math.PI / 2;
  const x = cx + 5 * Math.cos(angle);
  const y = cy + 5 * Math.sin(angle);
  const large = value > 0.5 ? 1 : 0;
  return (
    <>
      <circle cx={cx} cy={cy} r="5" fill="#ffffff" stroke="#c5c7d1" strokeWidth="1.6" />
      <path d={`M ${cx} ${cy} L ${cx} ${cy - 5} A 5 5 0 ${large} 1 ${x} ${y} Z`} fill="#16a34a" />
    </>
  );
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
  const [labelW, setLabelW] = useState(readLabelWidth);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [preview, setPreview] = useState<{ id: string; startDate: string; endDate: string } | null>(null);
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkRoute | null>(null);
  const pointerMode = useRef<PointerMode>(null);
  const dragRef = useRef<BarDragState | null>(null);
  const linkDragRef = useRef<LinkDragState | null>(null);
  const draggingRef = useRef(false);
  const columnOrigin = useRef({ x: 0, width: DEFAULT_LABEL_W });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipPrefix = compact ? 'v' : 'p';

  const range = useMemo(() => getProjectDateRange(activities), [activities]);
  const width = Math.round(920 * zoom) + 28;
  const chartW = Math.max(120, width - labelW - 28);
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
  const playX = labelW + (dateToPercent(playheadDate, range.start, range.end) / 100) * chartW;
  const statusX = labelW + (dateToPercent(parseIso(statusDate), range.start, range.end) / 100) * chartW;
  const geoms = useMemo(
    () => visible.map((activity, index) => barGeom(activity, range, chartW, index, labelW)),
    [visible, range, chartW, labelW],
  );
  const cursorLabel = formatCursor(playheadDate);
  const badgeW = Math.max(52, cursorLabel.length * 7 + 16);

  const months = useMemo(() => {
    const ticks: { label: string; x: number }[] = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor.getTime() <= range.end.getTime()) {
      ticks.push({
        label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        x: labelW + (dateToPercent(cursor, range.start, range.end) / 100) * chartW,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [range, chartW, labelW]);

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  };

  const clientToSvgX = (clientX: number) => clientToSvg(clientX, 0).x;

  const setPlayheadFromClientX = (clientX: number) => {
    const x = clientToSvgX(clientX);
    onPlayheadChange(Math.max(0, Math.min(100, ((x - labelW) / chartW) * 100)));
  };

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

  const startBarDrag = (activity: ActivityTask, kind: DragKind, clientX: number, event: React.PointerEvent) => {
    if (!onChangeActivity || linkMode) return;
    event.preventDefault();
    event.stopPropagation();
    pointerMode.current = 'bar';
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

  const startPlayheadDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    pointerMode.current = 'playhead';
    draggingRef.current = false;
    svgRef.current?.setPointerCapture(event.pointerId);
    setPlayheadFromClientX(event.clientX);
  };

  const startColumnDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    pointerMode.current = 'column';
    draggingRef.current = false;
    columnOrigin.current = { x: event.clientX, width: labelW };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startLinkDrag = (
    event: React.PointerEvent,
    fromId: string,
    toId: string,
    handle: LinkHandle,
    geom: ReturnType<typeof computeLinkGeometry>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    pointerMode.current = 'link';
    draggingRef.current = false;
    linkDragRef.current = {
      fromId,
      toId,
      handle,
      outX: geom.outX,
      midY: geom.midY,
      inX: geom.inX,
    };
    setSelectedLink({ fromId, toId });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const applyLinkDrag = (clientX: number, clientY: number) => {
    const drag = linkDragRef.current;
    if (!drag) return;
    const point = clientToSvg(clientX, clientY);
    const fromIndex = visible.findIndex((item) => item.id === drag.fromId);
    const toIndex = visible.findIndex((item) => item.id === drag.toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = {
      outX: drag.handle === 'out' ? point.x : drag.outX,
      midY: drag.handle === 'mid' ? point.y : drag.midY,
      inX: drag.handle === 'in' ? point.x : drag.inX,
    };
    linkDragRef.current = { ...drag, ...next };
    setLinkPreview(routeFromGeometry(geoms[fromIndex], geoms[toIndex], fromIndex, toIndex, next.outX, next.midY, next.inX));
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointerMode.current) return;
    draggingRef.current = true;
    if (pointerMode.current === 'playhead') {
      setPlayheadFromClientX(event.clientX);
      return;
    }
    if (pointerMode.current === 'column') {
      const next = Math.max(
        MIN_LABEL_W,
        Math.min(MAX_LABEL_W, columnOrigin.current.width + (event.clientX - columnOrigin.current.x)),
      );
      setLabelW(next);
      return;
    }
    if (pointerMode.current === 'link') {
      applyLinkDrag(event.clientX, event.clientY);
      return;
    }
    const next = datesFromDrag(event.clientX);
    const drag = dragRef.current;
    if (drag && next) setPreview({ id: drag.id, ...next });
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const mode = pointerMode.current;
    if (mode === 'bar') {
      const nextDates = datesFromDrag(event.clientX);
      const drag = dragRef.current;
      const activity = drag ? activities.find((item) => item.id === drag.id) : null;
      dragRef.current = null;
      setPreview(null);
      if (drag && nextDates && activity && onChangeActivity) {
        onChangeActivity({ ...activity, ...nextDates });
      }
    }
    if (mode === 'link') {
      applyLinkDrag(event.clientX, event.clientY);
      const drag = linkDragRef.current;
      const fromIndex = drag ? visible.findIndex((item) => item.id === drag.fromId) : -1;
      const toIndex = drag ? visible.findIndex((item) => item.id === drag.toId) : -1;
      const target = drag ? activities.find((item) => item.id === drag.toId) : null;
      if (drag && fromIndex >= 0 && toIndex >= 0 && target && onChangeActivity) {
        onChangeActivity({
          ...target,
          linkRoutes: {
            ...(target.linkRoutes ?? {}),
            [drag.fromId]: routeFromGeometry(
              geoms[fromIndex],
              geoms[toIndex],
              fromIndex,
              toIndex,
              drag.outX,
              drag.midY,
              drag.inX,
            ),
          },
        });
      }
      linkDragRef.current = null;
      setLinkPreview(null);
    }
    if (mode === 'column') {
      try {
        localStorage.setItem(LABEL_W_KEY, String(labelW));
      } catch {
        /* ignore */
      }
    }
    pointerMode.current = null;
    window.setTimeout(() => {
      draggingRef.current = false;
    }, 0);
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
              Glissez le curseur bleu pour changer la date. Glissez une barre pour la déplacer, le bord de la
              colonne Activité pour l’élargir.
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
              <span className="h-2 w-6 rounded-sm bg-[#16a34a]" /> Planifié
            </span>
            {options.actualProgress && (
              <span className="inline-flex items-center gap-1">
                <span className="h-px w-6 bg-black" /> Réel
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <span className="h-px w-6 bg-[#dc2626]" /> Retard
            </span>
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
            ? 'Cliquez sur une ou plusieurs activités cibles. Cliquez une liaison pour l’éditer.'
            : 'Cliquez sur l’activité source, puis sur les activités à relier (1 vers n).'}
        </div>
      )}

      {selectedLink && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#e6e7ee] bg-[#fafafc] px-3 py-1.5 text-[12px]">
          <span className="font-medium text-[#252a2e]">Éditeur de liaison</span>
          <label className="flex items-center gap-1">
            De
            <select
              className="rounded border border-[#d0d1db] bg-white px-1.5 py-0.5"
              value={selectedLink.fromId}
              onChange={(event) => {
                const nextFrom = event.target.value;
                if (!nextFrom || nextFrom === selectedLink.fromId) return;
                const current = activities.find((item) => item.id === selectedLink.toId);
                if (!current || !onChangeActivity) return;
                const routes = { ...(current.linkRoutes ?? {}) };
                const kept = routes[selectedLink.fromId];
                delete routes[selectedLink.fromId];
                if (kept) routes[nextFrom] = kept;
                onChangeActivity({
                  ...current,
                  predecessors: [
                    ...(current.predecessors ?? []).filter((id) => id !== selectedLink.fromId),
                    nextFrom,
                  ],
                  linkRoutes: routes,
                });
                setSelectedLink({ fromId: nextFrom, toId: selectedLink.toId });
              }}
            >
              {activities
                .filter((item) => item.id !== selectedLink.toId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Vers
            <select
              className="rounded border border-[#d0d1db] bg-white px-1.5 py-0.5"
              value={selectedLink.toId}
              onChange={(event) => {
                const nextTo = event.target.value;
                if (!nextTo || nextTo === selectedLink.toId) return;
                onUnlinkActivities?.(selectedLink.fromId, selectedLink.toId);
                onLinkActivities?.(selectedLink.fromId, nextTo);
                setSelectedLink({ fromId: selectedLink.fromId, toId: nextTo });
              }}
            >
              {activities
                .filter((item) => item.id !== selectedLink.fromId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <span className="text-[#6a6e79]">Glissez les poignées pour déplacer le tracé.</span>
          <button
            type="button"
            className="rounded border border-[#d0d1db] bg-white px-2 py-0.5"
            onClick={() => {
              const target = activities.find((item) => item.id === selectedLink.toId);
              if (!target || !onChangeActivity) return;
              const routes = { ...(target.linkRoutes ?? {}) };
              delete routes[selectedLink.fromId];
              onChangeActivity({ ...target, linkRoutes: routes });
              setLinkPreview(null);
            }}
          >
            Réinitialiser
          </button>
          <button
            type="button"
            className="rounded border border-[#d0d1db] bg-white px-2 py-0.5 text-[#c2410c]"
            onClick={() => {
              onUnlinkActivities?.(selectedLink.fromId, selectedLink.toId);
              setSelectedLink(null);
            }}
          >
            Supprimer
          </button>
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
            className="min-w-[860px]"
            style={{ width: `${width}px`, height: `${height}px`, touchAction: 'none' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <defs>
              <marker id={`gantt-arrow-${clipPrefix}`} markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L8,4 L0,8 Z" fill={LINK} />
              </marker>
              {visible.map((activity, index) => (
                <clipPath key={activity.id} id={`bar-clip-${clipPrefix}-${activity.id}`}>
                  <rect x={geoms[index].x} y={HEAD_H + index * ROW_H + BAR_Y} width={geoms[index].w} height={BAR_H} rx="2" />
                </clipPath>
              ))}
              <clipPath id={`label-clip-${clipPrefix}`}>
                <rect x="24" y={HEAD_H} width={Math.max(40, labelW - 86)} height={height} />
              </clipPath>
            </defs>

            <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
            <rect x="0" y="0" width={width} height={HEAD_H} fill="#fafafc" />
            <rect
              x={labelW}
              y="0"
              width={chartW + 28}
              height={HEAD_H}
              fill="transparent"
              className="cursor-ew-resize"
              onPointerDown={startPlayheadDrag}
            />

            {months.map((tick) => (
              <g key={tick.label}>
                <line x1={tick.x} y1="0" x2={tick.x} y2={height} stroke="#eeeef3" />
                <text x={tick.x + 6} y={18} fontSize="11" fill="#6a6e79">
                  {tick.label}
                </text>
              </g>
            ))}

            <text x="24" y="18" fontSize="11" fontWeight="600" fill="#6a6e79">
              Activité
            </text>

            <line x1={labelW} y1="0" x2={labelW} y2={height} stroke="#e0e1e9" />

            {visible.map((activity, index) => {
              const y = HEAD_H + index * ROW_H;
              const geom = geoms[index];
              const selected = selectedActivityId === activity.id;
              const source = linkSourceId === activity.id;
              const late = options.lateElements && isActivityLate(activity, statusDate);
              const progressAtCursor = playheadProgress(activity, playheadDate);
              const doneW = Math.max(0, Math.min(geom.w, geom.w * progressAtCursor));
              const toX = (date: Date) =>
                labelW + (dateToPercent(date, range.start, range.end) / 100) * chartW;
              const actualRange = getActualProgressRange(activity);
              const delayEnd = getDelayEnd(activity, statusDate);
              const lineY = y + BAR_Y + BAR_H - 2;
              const actualX1 = actualRange
                ? Math.max(geom.x, Math.min(geom.right, toX(actualRange.start)))
                : geom.x;
              const actualX2 = actualRange
                ? Math.max(geom.x, Math.min(geom.right, toX(actualRange.end)))
                : geom.x;
              const delayX = delayEnd ? Math.max(geom.right, toX(delayEnd)) : geom.right;

              return (
                <g
                  key={activity.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (draggingRef.current) return;
                    setSelectedLink(null);
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
                  <CursorCircle cx={14} cy={y + 16} progress={progressAtCursor} />
                  <text x="24" y={y + 20} fontSize="12" fill="#252a2e" clipPath={`url(#label-clip-${clipPrefix})`}>
                    {activity.name}
                  </text>
                  {late && (
                    <text x={labelW - 58} y={y + 20} fontSize="10" fill="#c2410c" fontWeight="600">
                      {activity.assignedObjectIds.length} en retard
                    </text>
                  )}
                  <text x={labelW - 10} y={y + 20} fontSize="11" fill="#6a6e79" textAnchor="end">
                    {activity.assignedObjectIds.length}
                  </text>
                  <rect
                    x={geom.x}
                    y={y + BAR_Y}
                    width={geom.w}
                    height={BAR_H}
                    rx="2"
                    fill={late ? LATE_TODO : PLANNED_TODO}
                    onPointerDown={(event) => startBarDrag(activity, 'move', event.clientX, event)}
                  />
                  {doneW > 0 && (
                    <rect
                      x={geom.x}
                      y={y + BAR_Y}
                      width={doneW}
                      height={BAR_H}
                      rx="2"
                      fill={late ? LATE_DONE : PLANNED_DONE}
                      onPointerDown={(event) => startBarDrag(activity, 'move', event.clientX, event)}
                    />
                  )}
                  <text
                    x={geom.x + 5}
                    y={y + BAR_Y + 12}
                    fontSize="10"
                    fill="#ffffff"
                    clipPath={`url(#bar-clip-${clipPrefix}-${activity.id})`}
                    pointerEvents="none"
                  >
                    {truncateToWidth(activity.name, geom.w - 8)}
                  </text>
                  {onChangeActivity && !linkMode && (
                    <>
                      <rect
                        x={geom.x}
                        y={y + BAR_Y}
                        width="6"
                        height={BAR_H}
                        fill="transparent"
                        className="cursor-ew-resize"
                        onPointerDown={(event) => startBarDrag(activity, 'start', event.clientX, event)}
                      />
                      <rect
                        x={geom.right - 6}
                        y={y + BAR_Y}
                        width="6"
                        height={BAR_H}
                        fill="transparent"
                        className="cursor-ew-resize"
                        onPointerDown={(event) => startBarDrag(activity, 'end', event.clientX, event)}
                      />
                    </>
                  )}
                  {options.actualProgress && actualRange && actualX2 - actualX1 > 1 && (
                    <line
                      x1={actualX1}
                      y1={lineY}
                      x2={actualX2}
                      y2={lineY}
                      stroke="#111827"
                      strokeWidth="2"
                      pointerEvents="none"
                    />
                  )}
                  {delayEnd && delayX > geom.right + 1 && (
                    <line
                      x1={geom.right}
                      y1={lineY}
                      x2={delayX}
                      y2={lineY}
                      stroke="#dc2626"
                      strokeWidth="2"
                      pointerEvents="none"
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
                  const selected =
                    selectedLink?.fromId === predId && selectedLink?.toId === activity.id;
                  const route =
                    selected && linkPreview
                      ? linkPreview
                      : activity.linkRoutes?.[predId];
                  const geom = computeLinkGeometry(
                    geoms[fromIndex],
                    geoms[toIndex],
                    fromIndex,
                    toIndex,
                    route,
                    labelW,
                    width,
                  );
                  return (
                    <g key={`${predId}-${activity.id}`}>
                      <path
                        d={geom.path}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="10"
                        className="cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedLink({ fromId: predId, toId: activity.id });
                        }}
                      />
                      <path
                        d={geom.path}
                        fill="none"
                        stroke={selected ? '#0063a3' : LINK}
                        strokeWidth={selected ? 2.2 : 1.6}
                        className="pointer-events-none"
                      />
                      <circle cx={geom.endX} cy={geom.y2} r="3.2" fill={selected ? '#0063a3' : LINK} />
                      {selected && (
                        <>
                          <line
                            x1={geom.outX}
                            y1={geom.y1}
                            x2={geom.outX}
                            y2={geom.midY}
                            stroke="transparent"
                            strokeWidth="10"
                            className="cursor-ew-resize"
                            onPointerDown={(event) => startLinkDrag(event, predId, activity.id, 'out', geom)}
                          />
                          <line
                            x1={geom.outX}
                            y1={geom.midY}
                            x2={geom.inX}
                            y2={geom.midY}
                            stroke="transparent"
                            strokeWidth="10"
                            className="cursor-ns-resize"
                            onPointerDown={(event) => startLinkDrag(event, predId, activity.id, 'mid', geom)}
                          />
                          <line
                            x1={geom.inX}
                            y1={geom.midY}
                            x2={geom.inX}
                            y2={geom.y2}
                            stroke="transparent"
                            strokeWidth="10"
                            className="cursor-ew-resize"
                            onPointerDown={(event) => startLinkDrag(event, predId, activity.id, 'in', geom)}
                          />
                          <rect
                            x={geom.outX - 4}
                            y={geom.midY - 4}
                            width="8"
                            height="8"
                            fill="#ffffff"
                            stroke="#0063a3"
                            className="cursor-move"
                            onPointerDown={(event) => startLinkDrag(event, predId, activity.id, 'out', geom)}
                          />
                          <rect
                            x={geom.inX - 4}
                            y={geom.midY - 4}
                            width="8"
                            height="8"
                            fill="#ffffff"
                            stroke="#0063a3"
                            className="cursor-move"
                            onPointerDown={(event) => startLinkDrag(event, predId, activity.id, 'in', geom)}
                          />
                        </>
                      )}
                    </g>
                  );
                }),
              )}

            <line
              x1={statusX}
              y1="0"
              x2={statusX}
              y2={height}
              stroke={STATUS}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              pointerEvents="none"
            />

            <g onPointerDown={startPlayheadDrag} className="cursor-ew-resize">
              <rect x={playX - 8} y="0" width="16" height={height} fill="transparent" />
              <line x1={playX} y1="0" x2={playX} y2={height} stroke={PLAYHEAD} strokeWidth="2" />
              <rect x={playX - badgeW / 2} y="3" width={badgeW} height="18" rx="3" fill={PLAYHEAD} />
              <text
                x={playX}
                y="16"
                fontSize="10"
                fontWeight="700"
                fill="#ffffff"
                textAnchor="middle"
                pointerEvents="none"
              >
                {cursorLabel}
              </text>
              <rect x={playX - 11} y={HEAD_H - 2} width="22" height="12" rx="2" fill={PLAYHEAD} />
              <text x={playX} y={HEAD_H + 8} fontSize="8" fill="#ffffff" textAnchor="middle" pointerEvents="none">
                ◂|▸
              </text>
            </g>

            <rect
              x={labelW - 3}
              y="0"
              width="6"
              height={height}
              fill="transparent"
              className="cursor-col-resize"
              onPointerDown={startColumnDrag}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
