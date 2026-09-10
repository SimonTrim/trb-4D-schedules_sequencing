import { Link2, Trash2 } from 'lucide-react';
import { ActivityTask } from '../types/schedule';
import { predecessorsOf, successorsOf } from '../services/scheduleLinks';

interface LinkEditorProps {
  activities: ActivityTask[];
  selectedId: string | null;
  linkMode: boolean;
  onToggleLinkMode: () => void;
  onLink: (fromId: string, toId: string) => void;
  onUnlink: (fromId: string, toId: string) => void;
}

export default function LinkEditor({
  activities,
  selectedId,
  linkMode,
  onToggleLinkMode,
  onLink,
  onUnlink,
}: LinkEditorProps) {
  const selected = activities.find((activity) => activity.id === selectedId) ?? null;
  const preds = selected ? predecessorsOf(activities, selected.id) : [];
  const succs = selected ? successorsOf(activities, selected.id) : [];
  const linkable = activities.filter((activity) => activity.id !== selectedId);

  return (
    <div className="flex shrink-0 flex-wrap items-start gap-4 border-b border-[#e6e7ee] bg-[#fafafc] px-3 py-2 text-[12px]">
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium ${
          linkMode ? 'bg-[#0063a3] text-white' : 'border border-[#d0d1db] bg-white text-[#252a2e]'
        }`}
        onClick={onToggleLinkMode}
      >
        <Link2 size={14} />
        {linkMode ? 'Mode liaison activé' : 'Relier des activités'}
      </button>
      <p className="max-w-xl text-[#6a6e79]">
        {linkMode
          ? 'Cliquez d’abord sur l’activité source, puis sur une ou plusieurs cibles. Une source peut alimenter plusieurs activités qui démarrent ensemble.'
          : 'Sélectionnez une activité ou cliquez une liaison sur le Gantt pour modifier son tracé.'}
      </p>
      {selected && (
        <div className="flex min-w-[280px] flex-1 flex-wrap gap-4">
          <label className="flex min-w-[200px] flex-col gap-1">
            <span className="font-medium text-[#252a2e]">Ajouter un prédécesseur</span>
            <select
              className="rounded border border-[#d0d1db] bg-white px-2 py-1"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) onLink(event.target.value, selected.id);
                event.target.value = '';
              }}
            >
              <option value="">Choisir une activité…</option>
              {linkable.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[200px] flex-col gap-1">
            <span className="font-medium text-[#252a2e]">Ajouter un successeur</span>
            <select
              className="rounded border border-[#d0d1db] bg-white px-2 py-1"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) onLink(selected.id, event.target.value);
                event.target.value = '';
              }}
            >
              <option value="">Choisir une activité…</option>
              {linkable.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>
          <div className="min-w-[180px]">
            <div className="mb-1 font-medium text-[#252a2e]">Prédécesseurs ({preds.length})</div>
            {preds.length === 0 && <div className="text-[#6a6e79]">Aucun</div>}
            {preds.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{activity.name}</span>
                <button type="button" aria-label="Supprimer la liaison" onClick={() => onUnlink(activity.id, selected.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="min-w-[180px]">
            <div className="mb-1 font-medium text-[#252a2e]">Successeurs ({succs.length})</div>
            {succs.length === 0 && <div className="text-[#6a6e79]">Aucun</div>}
            {succs.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{activity.name}</span>
                <button type="button" aria-label="Supprimer la liaison" onClick={() => onUnlink(selected.id, activity.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
