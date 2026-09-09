import React, { useEffect, useRef } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { ActivityTask, DashboardTab, IFCModelSchedule, ProgressRecord, SequencingOptions } from '../types/schedule';
import { formatIso } from '../services/mockData';
import ScheduleTable from './ScheduleTable';
import GanttChart from './GanttChart';
import ProgressAnalytics from './ProgressAnalytics';

interface ProjectDashboardProps {
  models: IFCModelSchedule[];
  selectedModelId: string | null;
  modelsExpanded: boolean;
  activeTab: DashboardTab;
  tabsRef: React.RefObject<HTMLElement | null>;
  activities: ActivityTask[];
  progress: ProgressRecord[];
  playheadDate: Date;
  statusDate: string;
  options: SequencingOptions;
  selectedActivityId: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onToggleModels: () => void;
  onSelectModel: (modelId: string) => void;
  onOpenIn3d: (modelId?: string) => void;
  onPlayheadDateChange: (iso: string) => void;
  onStatusDateChange: (iso: string) => void;
  onSelectActivity: (activity: ActivityTask) => void;
  onPlayheadChange: (percent: number) => void;
  onCopyLink: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImportFile: (file: File) => void;
  onCreateActivity: () => void;
  onLoadExample: () => void;
}

export default function ProjectDashboard({
  models,
  selectedModelId,
  modelsExpanded,
  activeTab,
  tabsRef,
  activities,
  progress,
  playheadDate,
  statusDate,
  options,
  selectedActivityId,
  fileRef,
  onToggleModels,
  onSelectModel,
  onOpenIn3d,
  onPlayheadDateChange,
  onStatusDateChange,
  onSelectActivity,
  onPlayheadChange,
  onCopyLink,
  onExportJson,
  onExportCsv,
  onImportFile,
  onCreateActivity,
  onLoadExample,
}: ProjectDashboardProps) {
  const playheadRef = useRef<HTMLElement | null>(null);
  const statusRef = useRef<HTMLElement | null>(null);
  const selectedName = models.find((m) => m.modelId === selectedModelId)?.modelName ?? 'Tous les modèles';

  useEffect(() => {
    const el = playheadRef.current as any;
    if (!el) return;
    el.value = formatIso(playheadDate);
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const value = typeof detail === 'string' ? detail : detail?.value ?? el.value;
      if (value) onPlayheadDateChange(String(value));
    };
    el.addEventListener('valueChange', handler);
    return () => el.removeEventListener('valueChange', handler);
  }, [playheadDate, onPlayheadDateChange]);

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white px-6 py-4">
      <header className="shrink-0 pb-3">
        <h1 className="text-[28px] font-semibold leading-tight text-[#252a2e]">Planning 4D</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-[#6a6e79]">
          Planning de construction de chaque modèle : Gantt pleine largeur, import / export, avancement
          et références.
        </p>
      </header>

      <ScheduleTable
        models={models}
        selectedModelId={selectedModelId}
        expanded={modelsExpanded}
        onToggle={onToggleModels}
        onSelectModel={onSelectModel}
        onOpenIn3d={onOpenIn3d}
      />

      <div className="pt-3 text-[15px] font-semibold text-[#252a2e]">{selectedName}</div>
      <div className="shrink-0 overflow-x-auto">
        <modus-tabs ref={tabsRef} />
      </div>

      {(activeTab === 'gantt' || activeTab === 'progress') && (
        <div className="flex flex-wrap items-end gap-4 border-b border-[#e6e7ee] py-3">
          {activeTab === 'gantt' && (
            <modus-date-input ref={playheadRef} label="Curseur" value={formatIso(playheadDate)} />
          )}
          <modus-date-input ref={statusRef} label="Date de statut" value={statusDate} />
          <button
            type="button"
            className="inline-flex items-center gap-1 pb-1 text-[13px] font-medium text-[#0063a3] hover:underline"
            onClick={() => onOpenIn3d(selectedModelId ?? undefined)}
          >
            <ExternalLink size={14} />
            Ouvrir en 3D à cette date
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 pb-1 text-[13px] font-medium text-[#0063a3] hover:underline"
            onClick={onCopyLink}
          >
            <Copy size={14} />
            Copier le lien vers cette date
          </button>
        </div>
      )}

      <section className="min-h-0 flex-1 overflow-hidden pt-3">
        {activeTab === 'gantt' && (
          <div className="h-full overflow-hidden rounded border border-[#e6e7ee]">
            <GanttChart
              activities={activities}
              progress={progress}
              playheadDate={playheadDate}
              statusDate={statusDate}
              options={options}
              selectedActivityId={selectedActivityId}
              onSelectActivity={onSelectActivity}
              onPlayheadChange={onPlayheadChange}
              onCreateActivity={onCreateActivity}
              emptyHint="Aucune activité. Créez le planning depuis zéro ou importez un fichier 4D."
            />
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="h-full overflow-auto">
            <ProgressAnalytics activities={activities} progress={progress} statusDate={statusDate} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="h-full overflow-auto">
            <h3 className="mb-1 text-[16px] font-semibold">Import / export</h3>
            <p className="mb-3 text-[13px] text-[#6a6e79]">
              Le planning démarre vide. Importez un fichier 4D ou créez les activités une par une, puis
              assignez les objets 3D depuis le viewer.
            </p>
            <ul className="mb-4 list-disc pl-5 text-[13px] text-[#6a6e79]">
              <li>JSON Planning 4D (export natif)</li>
              <li>CSV (nom, dates, avancement, prédécesseurs)</li>
              <li>Microsoft Project XML (.xml)</li>
              <li>Primavera P6 XML (.xml)</li>
              <li>Primavera XER (.xer)</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <modus-button color="primary" onClick={() => fileRef.current?.click()}>
                Importer un planning
              </modus-button>
              <modus-button color="primary" button-style="outline" onClick={onCreateActivity}>
                Nouvelle activité
              </modus-button>
              <modus-button color="secondary" onClick={onLoadExample}>
                Charger un exemple
              </modus-button>
              <modus-button color="secondary" button-style="outline" onClick={onExportJson}>
                Exporter JSON
              </modus-button>
              <modus-button color="secondary" button-style="outline" onClick={onExportCsv}>
                Exporter CSV
              </modus-button>
            </div>
            <input
              ref={fileRef as React.Ref<HTMLInputElement>}
              type="file"
              accept=".json,.csv,.xml,.xer,.txt,application/json,text/csv,text/xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportFile(file);
                event.target.value = '';
              }}
            />
          </div>
        )}

        {activeTab === 'baselines' && (
          <div className="h-full overflow-auto text-[13px] text-[#6a6e79]">
            La comparaison des références est enregistrée avec le planning. Utilisez Avancement pour
            consulter l’écart par rapport à la date de statut.
          </div>
        )}
      </section>
    </div>
  );
}
