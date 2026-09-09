import { ActivityTask } from '../types/schedule';

export function wouldCreateCycle(activities: ActivityTask[], fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const preds = new Map(activities.map((activity) => [activity.id, activity.predecessors ?? []]));
  const stack = [fromId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop() as string;
    if (id === toId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(preds.get(id) ?? []));
  }
  return false;
}

export function addDependency(activities: ActivityTask[], fromId: string, toId: string): ActivityTask[] {
  if (wouldCreateCycle(activities, fromId, toId)) return activities;
  return activities.map((activity) => {
    if (activity.id !== toId) return activity;
    if (activity.predecessors?.includes(fromId)) return activity;
    return { ...activity, predecessors: [...(activity.predecessors ?? []), fromId] };
  });
}

export function removeDependency(activities: ActivityTask[], fromId: string, toId: string): ActivityTask[] {
  return activities.map((activity) => {
    if (activity.id !== toId) return activity;
    return { ...activity, predecessors: (activity.predecessors ?? []).filter((id) => id !== fromId) };
  });
}

export function successorsOf(activities: ActivityTask[], activityId: string): ActivityTask[] {
  return activities.filter((activity) => activity.predecessors?.includes(activityId));
}

export function predecessorsOf(activities: ActivityTask[], activityId: string): ActivityTask[] {
  const current = activities.find((activity) => activity.id === activityId);
  if (!current?.predecessors?.length) return [];
  return activities.filter((activity) => current.predecessors?.includes(activity.id));
}
