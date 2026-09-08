import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { ActivityTask } from '../types/schedule';

interface ActivityDrawerProps {
  activities: ActivityTask[];
  activity: ActivityTask | null;
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (activity: ActivityTask) => void;
  onDelete: (id: string) => void;
  onSave: (next: ActivityTask) => void;
  onAssignSelection: (activityId: string) => void;
}

export default function ActivityDrawer({
  activities,
  activity,
  open,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  onSave,
  onAssignSelection,
}: ActivityDrawerProps) {
  const [draft, setDraft] = useState<ActivityTask | null>(activity);
  const nameRef = useRef<HTMLElement | null>(null);
  const startRef = useRef<HTMLElement | null>(null);
  const endRef = useRef<HTMLElement | null>(null);
  const actualStartRef = useRef<HTMLElement | null>(null);
  const actualEndRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setDraft(activity);
  }, [activity]);

  const predecessors = useMemo(
    () => activities.filter((item) => item.id !== draft?.id),
    [activities, draft?.id],
  );

  useEffect(() => {
    if (!draft) return;
    const bind = (el: any, eventName: string, key: keyof ActivityTask, numeric = false) => {
      if (!el) return () => undefined;
      el.value = draft[key] ?? '';
      const handler = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        const raw = typeof detail === 'string' || typeof detail === 'number'
          ? detail
          : detail?.value ?? el.value;
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                [key]: numeric ? Number(raw) : String(raw),
              }
            : prev,
        );
      };
      el.addEventListener(eventName, handler);
      return () => el.removeEventListener(eventName, handler);
    };

    const cleanups = [
      bind(nameRef.current, 'valueChange', 'name'),
      bind(startRef.current, 'valueChange', 'startDate'),
      bind(endRef.current, 'valueChange', 'endDate'),
      bind(actualStartRef.current, 'valueChange', 'actualStart'),
      bind(actualEndRef.current, 'valueChange', 'actualEnd'),
      bind(progressRef.current, 'valueChange', 'progressPercent', true),
    ];
    return () => cleanups.forEach((fn) => fn && fn());
  }, [draft?.id]);

  if (!open) return null;

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-[#d0d1db] bg-white">
      <div className="flex items-center justify-between border-b border-[#e6e7ee] px-3 py-2">
        <div className="text-[14px] font-semibold">
          Activities <span className="font-normal text-[#6a6e79]">{activities.length}</span>
        </div>
        <div className="flex items-center gap-1 text-[#6a6e79]">
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={onClose} aria-label="Back">
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={onCreate} aria-label="Add">
            <Plus size={16} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" aria-label="Upload">
            <Upload size={16} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {draft && (
        <div className="flex flex-col gap-2 border-b border-[#e6e7ee] p-3">
          <modus-text-input ref={nameRef} label="Activity name" value={draft.name} />
          <div className="grid grid-cols-2 gap-2">
            <modus-date-input ref={startRef} label="Start date" value={draft.startDate} />
            <modus-date-input ref={endRef} label="End date" value={draft.endDate} />
          </div>
          <label className="text-[12px] text-[#6a6e79]">
            Type
            <select
              className="mt-1 w-full rounded border border-[#d0d1db] px-2 py-1.5 text-[13px] text-[#252a2e]"
              value={draft.type ?? 'Construct'}
              onChange={(event) =>
                setDraft((prev) => (prev ? { ...prev, type: event.target.value as ActivityTask['type'] } : prev))
              }
            >
              <option value="Construct">Construct</option>
              <option value="Demolish">Demolish</option>
              <option value="Temporary">Temporary</option>
            </select>
          </label>
          <div>
            <div className="mb-1 text-[12px] text-[#6a6e79]">After (predecessors)</div>
            <div className="max-h-28 overflow-auto rounded border border-[#e6e7ee] p-2">
              {predecessors.map((item) => {
                const checked = draft.predecessors?.includes(item.id) ?? false;
                return (
                  <label key={item.id} className="flex items-center gap-2 py-0.5 text-[12px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setDraft((prev) => {
                          if (!prev) return prev;
                          const current = prev.predecessors ?? [];
                          return {
                            ...prev,
                            predecessors: checked
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          };
                        });
                      }}
                    />
                    <span className="truncate">{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <modus-date-input ref={actualStartRef} label="Actual start" value={draft.actualStart ?? ''} />
            <modus-date-input ref={actualEndRef} label="Actual finish" value={draft.actualEnd ?? ''} />
          </div>
          <modus-text-input
            ref={progressRef}
            label="% complete"
            value={String(draft.progressPercent)}
            type="number"
          />
          <div className="flex justify-end gap-2 pt-1">
            <modus-button button-style="outline" color="secondary" size="small" onClick={() => setDraft(null)}>
              Cancel
            </modus-button>
            <modus-button color="primary" size="small" onClick={() => onSave(draft)}>
              Save
            </modus-button>
          </div>
        </div>
      )}

      <ul className="min-h-0 flex-1 overflow-auto">
        {activities.map((item) => (
          <li key={item.id} className="border-b border-[#f1f1f6] px-3 py-3">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <modus-badge color="success" size="small">
                  {item.type ?? 'Construct'}
                </modus-badge>
                <div className="mt-1 text-[13px] font-medium">{item.name}</div>
              </div>
              <div className="flex gap-1 text-[#6a6e79]">
                <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={() => onEdit(item)}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={() => onDelete(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-[#6a6e79]">
              {item.startDate} → {item.endDate}
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="text-[#6a6e79]">{item.assignedObjectIds.length} objects</span>
              <button
                type="button"
                className="font-medium text-[#0063a3] hover:underline"
                onClick={() => onAssignSelection(item.id)}
              >
                Assign selection
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
