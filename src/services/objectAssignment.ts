import {
  ActivityTask,
  ProgressRecord,
  ProgressStatus,
} from '../types/schedule';
import { parseObjectRef } from './trimbleApi';
import { formatIso, resolveObjectStatus } from './mockData';

const STATUS_WEIGHT: Record<ProgressStatus, number> = {
  NOT_STARTED: 0,
  PROCUREMENT: 25,
  DELIVERED: 50,
  INSTALLED: 75,
  APPROVED: 100,
  BLOCKED: 0,
};

export function assignObjectsToActivity(
  activities: ActivityTask[],
  activityId: string,
  objectIds: string[],
  mode: 'add' | 'replace' = 'add',
): ActivityTask[] {
  const unique = [...new Set(objectIds.filter(Boolean))];
  if (unique.length === 0) return activities;

  return activities.map((activity) => {
    if (activity.id === activityId) {
      const assigned =
        mode === 'replace'
          ? unique
          : [...new Set([...activity.assignedObjectIds, ...unique])];
      return { ...activity, assignedObjectIds: assigned };
    }
    return {
      ...activity,
      assignedObjectIds: activity.assignedObjectIds.filter((id) => !unique.includes(id)),
    };
  });
}

export function removeObjectsFromActivity(
  activities: ActivityTask[],
  activityId: string,
  objectIds: string[],
): ActivityTask[] {
  const remove = new Set(objectIds);
  return activities.map((activity) =>
    activity.id === activityId
      ? {
          ...activity,
          assignedObjectIds: activity.assignedObjectIds.filter((id) => !remove.has(id)),
        }
      : activity,
  );
}

export function findActivityForObject(activities: ActivityTask[], objectId: string): ActivityTask | null {
  return activities.find((activity) => activity.assignedObjectIds.includes(objectId)) ?? null;
}

export function applyObjectStatus(
  progress: ProgressRecord[],
  objectIds: string[],
  status: ProgressStatus,
  updatedBy = 'Conducteur de travaux',
): ProgressRecord[] {
  const next = [...progress];
  const updatedAt = new Date().toISOString();

  objectIds.forEach((objectId) => {
    const parsed = parseObjectRef(objectId);
    const modelId = parsed?.modelId ?? objectId.split(':')[0] ?? 'unknown';
    const index = next.findIndex((record) => record.objectId === objectId);
    const record: ProgressRecord = {
      objectId,
      modelId,
      status,
      updatedAt,
      updatedBy,
    };
    if (index >= 0) next[index] = { ...next[index], ...record };
    else next.push(record);
  });

  return next;
}

export function deriveActivityProgress(activity: ActivityTask, progress: ProgressRecord[]): number {
  const refs = activity.assignedObjectIds;
  if (refs.length === 0) return activity.progressPercent;
  const total = refs.reduce((sum, id) => sum + STATUS_WEIGHT[resolveObjectStatus(id, progress)], 0);
  return Math.round(total / refs.length);
}

export function syncActivitiesProgress(
  activities: ActivityTask[],
  progress: ProgressRecord[],
  touchedObjectIds: string[],
): ActivityTask[] {
  const touched = new Set(touchedObjectIds);
  return activities.map((activity) => {
    const affects = activity.assignedObjectIds.some((id) => touched.has(id));
    if (!affects) return activity;
    const progressPercent = deriveActivityProgress(activity, progress);
    return {
      ...activity,
      progressPercent,
      actualEnd: progressPercent >= 100 ? activity.actualEnd ?? formatIso(new Date()) : activity.actualEnd,
    };
  });
}
