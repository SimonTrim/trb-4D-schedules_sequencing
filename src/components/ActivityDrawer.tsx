import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { ACTIVITY_TYPE_LABELS, ActivityTask } from '../types/schedule';
import { successorsOf } from '../services/scheduleLinks';

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
  onLink?: (fromId: string, toId: string) => void;
  onUnlink?: (fromId: string, toId: string) => void;
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
  onLink,
  onUnlink,
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
  const successors = useMemo(
    () => (draft ? successorsOf(activities, draft.id) : []),
    [activities, draft],
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
          Activités <span className="font-normal text-[#6a6e79]">{activities.length}</span>
        </div>
        <div className="flex items-center gap-1 text-[#6a6e79]">
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={onClose} aria-label="Retour">
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={onCreate} aria-label="Ajouter">
            <Plus size={16} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" aria-label="Importer">
            <Upload size={16} />
          </button>
          <button type="button" className="rounded p-1 hover:bg-[#f1f1f6]" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
      </div>

      {draft && (
        <div className="flex flex-col gap-2 border-b border-[#e6e7ee] p-3">
          <modus-text-input ref={nameRef} label="Nom de l'activité" value={draft.name} />
          <div className="grid grid-cols-2 gap-2">
            <modus-date-input ref={startRef} label="Date de début" value={draft.startDate} />
            <modus-date-input ref={endRef} label="Date de fin" value={draft.endDate} />
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
              <option value="Construct">{ACTIVITY_TYPE_LABELS.Construct}</option>
              <option value="Demolish">{ACTIVITY_TYPE_LABELS.Demolish}</option>
              <option value="Temporary">{ACTIVITY_TYPE_LABELS.Temporary}</option>
            </select>
          </label>
          <div>
            <div className="mb-1 text-[12px] text-[#6a6e79]">Après (prédécesseurs)</div>
            <div className="max-h-28 overflow-auto rounded border border-[#e6e7ee] p-2">
              {predecessors.map((item) => {
                const checked = draft.predecessors?.includes(item.id) ?? false;
                return (
                  <label key={item.id} className="flex items-center gap-2 py-0.5 text-[12px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (!draft) return;
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
                        if (checked) onUnlink?.(item.id, draft.id);
                        else onLink?.(item.id, draft.id);
                      }}
                    />
                    <span className="truncate">{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[12px] text-[#6a6e79]">Avant (successeurs)</div>
            <div className="max-h-28 overflow-auto rounded border border-[#e6e7ee] p-2">
              {predecessors.map((item) => {
                const checked = successors.some((succ) => succ.id === item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2 py-0.5 text-[12px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (!draft) return;
                        if (checked) onUnlink?.(draft.id, item.id);
                        else onLink?.(draft.id, item.id);
                      }}
                    />
                    <span className="truncate">{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <modus-date-input ref={actualStartRef} label="Début réel" value={draft.actualStart ?? ''} />
            <modus-date-input ref={actualEndRef} label="Fin réelle" value={draft.actualEnd ?? ''} />
          </div>
          <modus-text-input
            ref={progressRef}
            label="% d'avancement"
            value={String(draft.progressPercent)}
            type="number"
          />
          <div className="flex justify-end gap-2 pt-1">
            <modus-button button-style="outline" color="secondary" size="small" onClick={() => setDraft(null)}>
              Annuler
            </modus-button>
            <modus-button color="primary" size="small" onClick={() => onSave(draft)}>
              Enregistrer
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
                  {ACTIVITY_TYPE_LABELS[item.type ?? 'Construct']}
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
              <span className="text-[#6a6e79]">{item.assignedObjectIds.length} objets</span>
              <button
                type="button"
                className="font-medium text-[#0063a3] hover:underline"
                onClick={() => onAssignSelection(item.id)}
              >
                Assigner la sélection
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
