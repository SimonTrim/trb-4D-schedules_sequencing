import {
  ActivityTask,
  BaselineVarianceRow,
  ProgressRecord,
  ProgressStatus,
  ScheduleBaseline,
  StatusHeatmapCell,
  STATUS_CONFIGS,
} from '../types/schedule';
import { daysBetween, parseIso, resolveActivityStatusAtDate, resolveObjectStatus } from './mockData';

export function captureBaseline(
  activities: ActivityTask[],
  statusDate: string,
  name?: string,
): ScheduleBaseline {
  const stamp = new Date().toISOString();
  return {
    id: `bl-${Date.now()}`,
    name: name?.trim() || `Référence ${new Date().toLocaleDateString('fr-FR')}`,
    capturedAt: stamp,
    statusDate,
    activities: activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      startDate: activity.startDate,
      endDate: activity.endDate,
      progressPercent: activity.progressPercent,
    })),
  };
}

export function compareBaseline(
  baseline: ScheduleBaseline,
  activities: ActivityTask[],
): BaselineVarianceRow[] {
  const currentById = new Map(activities.map((activity) => [activity.id, activity]));
  const rows: BaselineVarianceRow[] = [];

  baseline.activities.forEach((snapshot) => {
    const current = currentById.get(snapshot.id);
    if (!current) return;
    rows.push({
      id: snapshot.id,
      name: snapshot.name,
      baselineStart: snapshot.startDate,
      baselineEnd: snapshot.endDate,
      currentStart: current.startDate,
      currentEnd: current.endDate,
      startDeltaDays: daysBetween(snapshot.startDate, current.startDate),
      endDeltaDays: daysBetween(snapshot.endDate, current.endDate),
      progressDelta: current.progressPercent - snapshot.progressPercent,
    });
  });

  return rows.sort((a, b) => Math.abs(b.endDeltaDays) - Math.abs(a.endDeltaDays));
}

export function buildStatusHeatmap(
  activities: ActivityTask[],
  progress: ProgressRecord[],
  statusDate: string,
): StatusHeatmapCell[] {
  const statusDateObj = parseIso(statusDate);
  const counts = new Map<ProgressStatus, number>();
  (Object.keys(STATUS_CONFIGS) as ProgressStatus[]).forEach((status) => counts.set(status, 0));

  const seen = new Set<string>();
  activities.forEach((activity) => {
    activity.assignedObjectIds.forEach((objectId) => {
      if (seen.has(objectId)) return;
      seen.add(objectId);
      const status = activity.assignedObjectIds.includes(objectId)
        ? resolveActivityStatusAtDate(activity, statusDateObj, progress)
        : resolveObjectStatus(objectId, progress);
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
  });

  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return (Object.keys(STATUS_CONFIGS) as ProgressStatus[]).map((status) => {
    const count = counts.get(status) ?? 0;
    return {
      status,
      label: STATUS_CONFIGS[status].labelFr,
      colorHex: STATUS_CONFIGS[status].colorHex,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}
