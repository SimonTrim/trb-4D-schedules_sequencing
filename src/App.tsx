import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { importScheduleFile } from './services/scheduleImport';
import DemoChrome from './components/DemoChrome';
import ProjectDashboard from './components/ProjectDashboard';
import ViewerShell from './components/ViewerShell';
import ActivityDrawer from './components/ActivityDrawer';
import {
  getHostName,
  getLoadedModels,
  getViewerSelectionIds,
  hideObjects,
  initTrimbleApi,
  isViewerHost,
  isViewerObjectRef,
  openIn3dViewer,
  parseExtensionCommand,
  PROJECT_MENU_COMMAND,
  registerProjectMenu,
  resetObjectsColor,
  selectActivityObjects,
  setObjectsColor,
  showAllObjects,
  type WorkspaceApi,
} from './services/trimbleApi';
import {
  MOCK_ACTIVITIES,
  MOCK_OBJECTS,
  MOCK_PROGRESS,
  STATUS_DATE,
  buildScheduleModels,
  dateToPercent,
  formatIso,
  getProjectDateRange,
  parseIso,
  percentToDate,
  resolveActivityStatusAtDate,
  resolveObjectStatus,
} from './services/mockData';
import { addDependency, removeDependency } from './services/scheduleLinks';
import {
  ActivityTask,
  AppMode,
  DashboardTab,
  ProgressRecord,
  SequencingOptions,
  STATUS_CONFIGS,
} from './types/schedule';

const TABS = [
  { id: 'gantt', label: 'Gantt' },
  { id: 'progress', label: 'Avancement' },
  { id: 'import', label: 'Import / export' },
  { id: 'baselines', label: 'Références' },
];

const DEFAULT_OPTIONS: SequencingOptions = {
  displayGantt: true,
  statusColors: true,
  hideUnbuilt: true,
  dependencyLinks: true,
  actualProgress: false,
  lateElements: false,
  autoOrbit: false,
};

const STORAGE_KEY = 'tc-4d-schedule-v2';

function readModeFromUrl(): AppMode {
  return new URLSearchParams(window.location.search).get('mode') === 'viewer' ? 'viewer' : 'project';
}

function loadStoredActivities(): ActivityTask[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.activities) ? parsed.activities : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [api, setApi] = useState<WorkspaceApi | null>(null);
  const [mode, setMode] = useState<AppMode>(readModeFromUrl);
  const [embedded, setEmbedded] = useState(false);
  const [loadedModels, setLoadedModels] = useState<Array<{ id: string; name?: string }>>([]);
  const [activities, setActivities] = useState<ActivityTask[]>(() => loadStoredActivities() ?? []);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>('project');
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('gantt');
  const [options, setOptions] = useState<SequencingOptions>(DEFAULT_OPTIONS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('1');
  const [statusDate, setStatusDate] = useState(STATUS_DATE);
  const [drawerActivity, setDrawerActivity] = useState<ActivityTask | null>(null);
  const [viewerPanel, setViewerPanel] = useState<'sequencing' | 'activities'>('sequencing');
  const [linkMode, setLinkMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modelEpoch, setModelEpoch] = useState(0);
  const tabsRef = useRef<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const models = useMemo(
    () => buildScheduleModels(activities, loadedModels, statusDate),
    [activities, loadedModels, statusDate],
  );

  const range = useMemo(() => getProjectDateRange(activities), [activities]);
  const [playheadPercent, setPlayheadPercent] = useState(() =>
    dateToPercent(parseIso(STATUS_DATE), range.start, range.end),
  );
  const playheadDate = useMemo(
    () => percentToDate(playheadPercent, range.start, range.end),
    [playheadPercent, range],
  );

  const filteredActivities = useMemo(
    () =>
      selectedModelId && !embedded
        ? activities.filter((activity) => (activity.modelId ?? 'project') === selectedModelId)
        : activities,
    [activities, selectedModelId, embedded],
  );

  const filteredProgress = useMemo(
    () => (selectedModelId && !embedded ? progress.filter((p) => p.modelId === selectedModelId) : progress),
    [progress, selectedModelId, embedded],
  );

  const visibleObjects = useMemo(() => {
    const modelObjects = selectedModelId
      ? MOCK_OBJECTS.filter((o) => o.modelId === selectedModelId)
      : MOCK_OBJECTS;
    return modelObjects.map((obj) => {
      const owner = activities.find((a) => a.assignedObjectIds.includes(obj.id));
      const status = owner
        ? resolveActivityStatusAtDate(owner, playheadDate, progress)
        : resolveObjectStatus(obj.id, progress);
      const hidden = options.hideUnbuilt && status === 'NOT_STARTED';
      return { ...obj, status, hidden };
    });
  }, [activities, playheadDate, progress, selectedModelId, options.hideUnbuilt]);

  const linkedCount = useMemo(
    () =>
      activities.reduce(
        (sum, activity) => sum + activity.assignedObjectIds.filter(isViewerObjectRef).length,
        0,
      ),
    [activities],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const applyMode = useCallback((next: AppMode) => {
    setMode(next);
    const url = new URL(window.location.href);
    if (next === 'viewer') url.searchParams.set('mode', 'viewer');
    else url.searchParams.delete('mode');
    window.history.replaceState({}, '', url);
  }, []);

  const bindLoadedObjects = useCallback(async (workspace: WorkspaceApi) => {
    const loaded = await getLoadedModels(workspace);
    setLoadedModels(
      loaded.map((model) => ({
        id: String((model as { id?: string }).id ?? ''),
        name: (model as { name?: string }).name,
      })).filter((model) => model.id),
    );
    return loaded.length;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities }));
    } catch {
      /* ignore quota */
    }
  }, [activities]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setApi(null);
    }, 8000);

    initTrimbleApi((event, data) => {
      if (event === 'viewer.modelLoaded') {
        setModelEpoch((value) => value + 1);
      }
      if (event === 'extension.command') {
        const command = parseExtensionCommand(data);
        if (command === PROJECT_MENU_COMMAND) applyMode('project');
      }
    }).then(async (workspace) => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setApi(workspace);
      const inIframe = window.self !== window.top;
      setEmbedded(inIframe);
      const host = await getHostName(workspace);
      if (isViewerHost(host)) applyMode('viewer');
      else if (host === 'project') applyMode('project');
      if (workspace && !isViewerHost(host)) {
        await registerProjectMenu(workspace);
      }
      if (workspace && (isViewerHost(host) || inIframe)) {
        const count = await bindLoadedObjects(workspace);
        if (count > 0) showToast(`${count} modèle(s) chargé(s) — assignez une sélection à une activité`);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [applyMode, bindLoadedObjects, showToast]);

  useEffect(() => {
    if (!api || modelEpoch === 0) return;
    bindLoadedObjects(api).then((count) => {
      if (count > 0) showToast(`${count} modèle(s) chargé(s) — assignez une sélection à une activité`);
    });
  }, [api, modelEpoch, bindLoadedObjects, showToast]);

  useEffect(() => {
    if (!isPlaying) return;
    const spanDays = Math.max(1, (range.end.getTime() - range.start.getTime()) / 86_400_000);
    const step = (Number(speed) / spanDays) * 100;
    const timer = window.setInterval(() => {
      setPlayheadPercent((prev) => (prev >= 100 ? 0 : Math.min(100, prev + step)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, range]);

  useEffect(() => {
    if (mode !== 'project') return;
    const el = tabsRef.current as any;
    if (!el) return;
    el.size = 'medium';
    el.tabs = TABS.map((tab) => ({ ...tab, active: tab.id === activeTab }));

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const id = typeof detail === 'string' ? detail : detail?.id ?? TABS[detail]?.id;
      if (id === 'gantt' || id === 'progress' || id === 'import' || id === 'baselines') {
        setActiveTab(id);
      }
    };
    el.addEventListener('tabChange', handler);
    return () => el.removeEventListener('tabChange', handler);
  }, [mode, activeTab]);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const targets = embedded ? activities : filteredActivities;
      const groups = new Map<string, string[]>();
      const hiddenIds: string[] = [];

      targets.forEach((activity) => {
        const refs = activity.assignedObjectIds.filter(isViewerObjectRef);
        if (refs.length === 0) return;
        const status = resolveActivityStatusAtDate(activity, playheadDate, progress);
        if (options.hideUnbuilt && status === 'NOT_STARTED') {
          hiddenIds.push(...refs);
          return;
        }
        const list = groups.get(status) ?? [];
        list.push(...refs);
        groups.set(status, list);
      });

      await showAllObjects(api);
      if (cancelled) return;

      if (options.hideUnbuilt) {
        await hideObjects(api, hiddenIds);
      }

      if (!options.statusColors) {
        await resetObjectsColor(api);
        return;
      }

      for (const [status, ids] of groups) {
        if (cancelled) return;
        await setObjectsColor(api, ids, STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS].rgba);
      }
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, embedded, activities, filteredActivities, playheadDate, progress, options.hideUnbuilt, options.statusColors]);

  const exportJson = () => {
    const payload = { models, activities, progress, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '4d-schedules-export.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export JSON généré');
  };

  const exportCsv = () => {
    const header = 'id,name,startDate,endDate,progressPercent,modelId';
    const rows = activities.map((a) =>
      [a.id, `"${a.name}"`, a.startDate, a.endDate, a.progressPercent, a.modelId ?? ''].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '4d-activities.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV généré');
  };

  const importFile = async (file: File) => {
    try {
      const result = await importScheduleFile(file);
      setActivities(result.activities);
      setProgress([]);
      setDrawerActivity(result.activities[0] ?? null);
      setActiveTab('gantt');
      showToast(`${result.activities.length} activités importées (${result.format})`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Import impossible');
    }
  };

  const createActivity = () => {
    const created: ActivityTask = {
      id: `act-${Date.now()}`,
      name: 'Nouvelle activité',
      startDate: formatIso(playheadDate),
      endDate: formatIso(playheadDate),
      progressPercent: 0,
      assignedObjectIds: [],
      modelId: selectedModelId && selectedModelId !== 'project' ? selectedModelId : undefined,
      type: 'Construct',
    };
    setActivities((prev) => [...prev, created]);
    setDrawerActivity(created);
    if (mode === 'viewer') setViewerPanel('activities');
  };

  const loadExample = () => {
    setActivities(MOCK_ACTIVITIES);
    setProgress(MOCK_PROGRESS);
    setSelectedModelId(MOCK_ACTIVITIES[0]?.modelId ?? 'project');
    showToast('Exemple de planning chargé');
  };

  const openIn3d = async (modelId?: string) => {
    const navigated = await openIn3dViewer(api, modelId);
    if (!navigated) applyMode('viewer');
    showToast('Ouverture du viewer 3D à la date du curseur');
  };

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('playhead', formatIso(playheadDate));
    url.searchParams.set('status', statusDate);
    await navigator.clipboard.writeText(url.toString());
    showToast('Lien copié');
  };

  const openActivity = (activity: ActivityTask) => {
    setDrawerActivity(activity);
    if (mode === 'viewer') {
      setViewerPanel('activities');
      if (api) selectActivityObjects(api, activity.assignedObjectIds.filter(isViewerObjectRef));
    }
  };

  const changeActivity = (next: ActivityTask) => {
    setActivities((prev) => prev.map((item) => (item.id === next.id ? next : item)));
    setDrawerActivity((current) => (current?.id === next.id ? next : current));
  };

  const linkActivities = (fromId: string, toId: string) => {
    setActivities((prev) => {
      const next = addDependency(prev, fromId, toId);
      if (next === prev) {
        showToast('Liaison impossible (cycle ou déjà existante)');
        return prev;
      }
      showToast('Liaison Fin → Début ajoutée');
      return next;
    });
  };

  const unlinkActivities = (fromId: string, toId: string) => {
    setActivities((prev) => removeDependency(prev, fromId, toId));
    showToast('Liaison supprimée');
  };

  const deleteActivity = (id: string) => {
    setActivities((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          predecessors: (item.predecessors ?? []).filter((predId) => predId !== id),
        })),
    );
    if (drawerActivity?.id === id) setDrawerActivity(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <DemoChrome
        mode={mode}
        embedded={embedded}
        connected={Boolean(api)}
        onModeChange={applyMode}
      />

      <main className="min-h-0 flex-1 overflow-hidden">
        {mode === 'project' ? (
          <div className="flex h-full min-h-0">
            <div className="min-h-0 min-w-0 flex-1">
              <ProjectDashboard
            models={models}
            selectedModelId={selectedModelId}
            modelsExpanded={modelsExpanded}
            activeTab={activeTab}
            tabsRef={tabsRef}
            activities={filteredActivities}
            progress={filteredProgress}
            playheadDate={playheadDate}
            statusDate={statusDate}
            options={{ ...options, actualProgress: true, lateElements: true, dependencyLinks: true }}
            selectedActivityId={drawerActivity?.id ?? null}
            fileRef={fileRef}
            onToggleModels={() => setModelsExpanded((v) => !v)}
            onSelectModel={(id) => {
              setSelectedModelId(id);
              setActiveTab('gantt');
            }}
            onOpenIn3d={openIn3d}
            onPlayheadDateChange={(iso) => {
              setPlayheadPercent(dateToPercent(parseIso(iso), range.start, range.end));
            }}
            onStatusDateChange={setStatusDate}
            onSelectActivity={openActivity}
            onPlayheadChange={setPlayheadPercent}
            onCopyLink={copyLink}
            onExportJson={exportJson}
            onExportCsv={exportCsv}
            onImportFile={importFile}
            onCreateActivity={createActivity}
            onLoadExample={loadExample}
            linkMode={linkMode}
            onToggleLinkMode={() => setLinkMode((value) => !value)}
            onChangeActivity={changeActivity}
            onLinkActivities={linkActivities}
            onUnlinkActivities={unlinkActivities}
          />
            </div>
            <ActivityDrawer
              activities={activities}
              activity={drawerActivity}
              open={Boolean(drawerActivity)}
              onClose={() => setDrawerActivity(null)}
              onCreate={createActivity}
              onEdit={openActivity}
              onDelete={deleteActivity}
              onSave={(next) => {
                changeActivity(next);
                showToast('Activité enregistrée');
              }}
              onLink={linkActivities}
              onUnlink={unlinkActivities}
              onAssignSelection={async (activityId) => {
                const fallback = api
                  ? await getViewerSelectionIds(api)
                  : visibleObjects.filter((o) => !o.hidden).slice(0, 2).map((o) => o.id);
                setActivities((prev) =>
                  prev.map((item) => (item.id === activityId ? { ...item, assignedObjectIds: fallback } : item)),
                );
                showToast(
                  fallback.length
                    ? `${fallback.length} objets assignés`
                    : 'Aucune sélection. Ouvrez le viewer 3D, sélectionnez des objets, puis réessayez.',
                );
              }}
            />
          </div>
        ) : (
          <ViewerShell
            embedded={embedded}
            activities={filteredActivities}
            progress={filteredProgress}
            visibleObjects={visibleObjects}
            playheadPercent={playheadPercent}
            playheadDate={playheadDate}
            rangeStart={range.start}
            rangeEnd={range.end}
            statusDate={statusDate}
            isPlaying={isPlaying}
            speed={speed}
            options={options}
            selectedActivity={drawerActivity}
            panel={viewerPanel}
            linkedCount={linkedCount}
            onPlayheadChange={setPlayheadPercent}
            onTogglePlay={() => setIsPlaying((v) => !v)}
            onSpeedChange={setSpeed}
            onStatusDateChange={setStatusDate}
            onOptionsChange={setOptions}
            onOpenActivities={() => setViewerPanel('activities')}
            onCloseActivities={() => setViewerPanel('sequencing')}
            onSelectActivity={openActivity}
            onCreateActivity={createActivity}
            onDeleteActivity={deleteActivity}
            onSaveActivity={(next) => {
              changeActivity(next);
              showToast('Activité enregistrée');
            }}
            linkMode={linkMode}
            onToggleLinkMode={() => setLinkMode((value) => !value)}
            onChangeActivity={changeActivity}
            onLinkActivities={linkActivities}
            onUnlinkActivities={unlinkActivities}
            onAssignSelection={async (activityId) => {
              const fallback = api
                ? await getViewerSelectionIds(api)
                : visibleObjects.filter((o) => !o.hidden).slice(0, 2).map((o) => o.id);
              setActivities((prev) =>
                prev.map((a) => (a.id === activityId ? { ...a, assignedObjectIds: fallback } : a)),
              );
              showToast(fallback.length ? `${fallback.length} objets assignés` : 'Aucune sélection dans le viewer');
            }}
          />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <modus-toast show type="success">
            {toast}
          </modus-toast>
        </div>
      )}
    </div>
  );
}
