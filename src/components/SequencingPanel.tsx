import { useEffect, useRef } from 'react';
import { Play, Pause, X, ChevronRight } from 'lucide-react';
import { SequencingOptions } from '../types/schedule';
import { formatShort } from '../services/mockData';

interface SequencingPanelProps {
  playheadPercent: number;
  playheadDate: Date;
  rangeStart: Date;
  rangeEnd: Date;
  statusDate: string;
  isPlaying: boolean;
  speed: string;
  activityCount: number;
  options: SequencingOptions;
  onPlayheadChange: (percent: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: string) => void;
  onStatusDateChange: (value: string) => void;
  onOptionsChange: (next: SequencingOptions) => void;
  onOpenActivities: () => void;
  onClose?: () => void;
  fullWidth?: boolean;
  linkedCount?: number;
}

const SWITCHES: { key: keyof SequencingOptions; label: string }[] = [
  { key: 'displayGantt', label: 'Gantt chart' },
  { key: 'statusColors', label: 'Status colors' },
  { key: 'hideUnbuilt', label: 'Hide unbuilt work' },
  { key: 'dependencyLinks', label: 'Dependency links' },
  { key: 'actualProgress', label: 'Actual progress' },
  { key: 'lateElements', label: 'Late elements' },
  { key: 'autoOrbit', label: 'Auto-orbit camera' },
];

export default function SequencingPanel({
  playheadPercent,
  playheadDate,
  rangeStart,
  rangeEnd,
  statusDate,
  isPlaying,
  speed,
  activityCount,
  options,
  onPlayheadChange,
  onTogglePlay,
  onSpeedChange,
  onStatusDateChange,
  onOptionsChange,
  onOpenActivities,
  onClose,
  fullWidth = false,
  linkedCount,
}: SequencingPanelProps) {
  const sliderRef = useRef<HTMLElement | null>(null);
  const switchRefs = useRef<Record<string, HTMLElement | null>>({});
  const statusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = sliderRef.current as any;
    if (!el) return;
    el.value = String(Math.round(playheadPercent));
    el.minValue = 0;
    el.maxValue = 100;
  }, [playheadPercent]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const value = Number(detail ?? (event.target as any)?.value);
      if (!Number.isNaN(value)) onPlayheadChange(value);
    };
    el.addEventListener('valueChange', handler);
    return () => el.removeEventListener('valueChange', handler);
  }, [onPlayheadChange]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    SWITCHES.forEach(({ key }) => {
      const el = switchRefs.current[key] as any;
      if (!el) return;
      el.checked = options[key];
      const handler = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        const checked =
          typeof detail === 'boolean' ? detail : Boolean((event.target as any)?.checked);
        onOptionsChange({ ...options, [key]: checked });
      };
      el.addEventListener('switchClick', handler);
      cleanups.push(() => el.removeEventListener('switchClick', handler));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [options, onOptionsChange]);

  useEffect(() => {
    const el = statusRef.current as any;
    if (!el) return;
    el.value = statusDate;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const value = typeof detail === 'string' ? detail : detail?.value ?? el.value;
      if (value) onStatusDateChange(String(value));
    };
    el.addEventListener('valueChange', handler);
    return () => el.removeEventListener('valueChange', handler);
  }, [statusDate, onStatusDateChange]);

  return (
    <aside className={`flex h-full shrink-0 flex-col bg-white ${fullWidth ? 'w-full' : 'w-[300px] border-l border-[#d0d1db]'}`}>
      <div className="flex items-center justify-between border-b border-[#e6e7ee] px-3 py-2">
        <span className="text-[14px] font-semibold text-[#252a2e]">4D sequencing</span>
        {onClose && (
          <button type="button" className="rounded p-1 text-[#6a6e79] hover:bg-[#f1f1f6]" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[22px] font-semibold leading-none text-[#252a2e]">
            {formatShort(playheadDate)}
          </div>
          <select
            className="rounded border border-[#d0d1db] px-2 py-1 text-[12px]"
            value={speed}
            onChange={(event) => onSpeedChange(event.target.value)}
          >
            <option value="1">1 d/s</option>
            <option value="2">2 d/s</option>
            <option value="7">7 d/s</option>
          </select>
          <modus-button color="primary" size="small" onClick={onTogglePlay}>
            <span className="inline-flex items-center gap-1">
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : 'Play'}
            </span>
          </modus-button>
        </div>

        <div>
          <modus-slider
            ref={sliderRef}
            min-value="0"
            max-value="100"
            value={String(Math.round(playheadPercent))}
          />
          <div className="mt-1 flex justify-between text-[11px] text-[#6a6e79]">
            <span>{formatShort(rangeStart)}</span>
            <span>{formatShort(rangeEnd)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#e6e7ee] pt-3">
          {SWITCHES.map(({ key, label }) => (
            <modus-switch
              key={key}
              ref={(node: HTMLElement | null) => {
                switchRefs.current[key] = node;
              }}
              label={label}
              checked={options[key]}
              size="small"
            />
          ))}
        </div>

        <modus-date-input ref={statusRef} label="Status date" value={statusDate} />
        {typeof linkedCount === 'number' && (
          <p className="text-[11px] text-[#6a6e79]">
            {linkedCount} objects linked to the loaded 3D model
          </p>
        )}
      </div>

      <button
        type="button"
        className="flex items-center justify-between border-t border-[#e6e7ee] px-3 py-3 text-[13px] font-medium text-[#252a2e] hover:bg-[#f8f8fb]"
        onClick={onOpenActivities}
      >
        <span>Activities</span>
        <span className="inline-flex items-center gap-1 text-[#6a6e79]">
          {activityCount}
          <ChevronRight size={14} />
        </span>
      </button>
    </aside>
  );
}
