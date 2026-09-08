import { ActivityTask, ProgressRecord, SequencingOptions, STATUS_CONFIGS } from '../types/schedule';
import { MockIfcObject } from '../types/schedule';
import GanttChart from './GanttChart';
import SequencingPanel from './SequencingPanel';
import ActivityDrawer from './ActivityDrawer';

interface VisibleObject extends MockIfcObject {
  status: keyof typeof STATUS_CONFIGS;
  hidden: boolean;
}

interface ViewerShellProps {
  embedded: boolean;
  activities: ActivityTask[];
  progress: ProgressRecord[];
  visibleObjects: VisibleObject[];
  playheadPercent: number;
  playheadDate: Date;
  rangeStart: Date;
  rangeEnd: Date;
  statusDate: string;
  isPlaying: boolean;
  speed: string;
  options: SequencingOptions;
  selectedActivity: ActivityTask | null;
  panel: 'sequencing' | 'activities';
  linkedCount: number;
  onPlayheadChange: (percent: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: string) => void;
  onStatusDateChange: (value: string) => void;
  onOptionsChange: (next: SequencingOptions) => void;
  onOpenActivities: () => void;
  onCloseActivities: () => void;
  onSelectActivity: (activity: ActivityTask) => void;
  onCreateActivity: () => void;
  onDeleteActivity: (id: string) => void;
  onSaveActivity: (next: ActivityTask) => void;
  onAssignSelection: (activityId: string) => void;
}

export default function ViewerShell({
  embedded,
  activities,
  progress,
  visibleObjects,
  playheadPercent,
  playheadDate,
  rangeStart,
  rangeEnd,
  statusDate,
  isPlaying,
  speed,
  options,
  selectedActivity,
  panel,
  linkedCount,
  onPlayheadChange,
  onTogglePlay,
  onSpeedChange,
  onStatusDateChange,
  onOptionsChange,
  onOpenActivities,
  onCloseActivities,
  onSelectActivity,
  onCreateActivity,
  onDeleteActivity,
  onSaveActivity,
  onAssignSelection,
}: ViewerShellProps) {
  const sidePanel = panel === 'sequencing' ? (
    <SequencingPanel
      playheadPercent={playheadPercent}
      playheadDate={playheadDate}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      statusDate={statusDate}
      isPlaying={isPlaying}
      speed={speed}
      activityCount={activities.length}
      options={options}
      fullWidth={embedded}
      linkedCount={embedded ? linkedCount : undefined}
      onPlayheadChange={onPlayheadChange}
      onTogglePlay={onTogglePlay}
      onSpeedChange={onSpeedChange}
      onStatusDateChange={onStatusDateChange}
      onOptionsChange={onOptionsChange}
      onOpenActivities={onOpenActivities}
    />
  ) : (
    <ActivityDrawer
      activities={activities}
      activity={selectedActivity}
      open
      onClose={onCloseActivities}
      onCreate={onCreateActivity}
      onEdit={onSelectActivity}
      onDelete={onDeleteActivity}
      onSave={onSaveActivity}
      onAssignSelection={onAssignSelection}
    />
  );

  const gantt = options.displayGantt ? (
    <div className={`${embedded ? 'h-[38%] min-h-[200px]' : 'h-[260px]'} shrink-0 border-t border-[#d0d1db] bg-white`}>
      <GanttChart
        activities={activities}
        progress={progress}
        playheadDate={playheadDate}
        statusDate={statusDate}
        options={options}
        selectedActivityId={selectedActivity?.id ?? null}
        compact
        onSelectActivity={onSelectActivity}
        onPlayheadChange={onPlayheadChange}
      />
    </div>
  ) : null;

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="min-h-0 flex-1">{sidePanel}</div>
        {gantt}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[#2b3036]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div className="viewer-grid grid h-full grid-cols-4 gap-3 p-6">
            {visibleObjects.map((obj) => (
              <button
                key={obj.id}
                type="button"
                className="rounded-md border border-white/10 p-3 text-left text-white"
                style={{
                  backgroundColor: options.statusColors
                    ? STATUS_CONFIGS[obj.status].colorHex
                    : '#4b5563',
                  opacity: obj.hidden ? 0.12 : STATUS_CONFIGS[obj.status].rgba.a,
                }}
                onClick={() => {
                  const act = activities.find((a) => a.assignedObjectIds.includes(obj.id));
                  if (act) onSelectActivity(act);
                }}
              >
                <div className="text-[11px] font-semibold">{obj.name}</div>
                <div className="text-[10px] text-white/80">{STATUS_CONFIGS[obj.status].labelFr}</div>
              </button>
            ))}
          </div>
        </div>
        {gantt}
      </div>
      {sidePanel}
    </div>
  );
}
