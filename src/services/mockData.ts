import {
  ActivityState,
  ActivityTask,
  IFCModelSchedule,
  MockIfcObject,
  ProgressRecord,
  ProgressStatus,
  SCurvePoint,
  STATUS_CONFIGS,
} from '../types/schedule';

export const STATUS_DATE = '2026-09-08';

export const MOCK_OBJECTS: MockIfcObject[] = [
  { id: 'obj-str-fou-01', name: 'Fondations RDC-A', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-fou-02', name: 'Fondations RDC-B', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-pot-01', name: 'Poteaux R+1', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-pot-02', name: 'Poteaux R+2', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-dal-01', name: 'Dalle R+1', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-dal-02', name: 'Dalle R+2', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-mur-01', name: 'Voiles noyau', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-str-esc-01', name: 'Escalier A', modelId: 'mdl-str-01', discipline: 'STR' },
  { id: 'obj-arc-fac-01', name: 'Façade Nord', modelId: 'mdl-arc-01', discipline: 'ARC' },
  { id: 'obj-arc-fac-02', name: 'Façade Sud', modelId: 'mdl-arc-01', discipline: 'ARC' },
  { id: 'obj-arc-clo-01', name: 'Cloisons R+1', modelId: 'mdl-arc-01', discipline: 'ARC' },
  { id: 'obj-arc-clo-02', name: 'Cloisons R+2', modelId: 'mdl-arc-01', discipline: 'ARC' },
  { id: 'obj-arc-rev-01', name: 'Revêtements sols', modelId: 'mdl-arc-01', discipline: 'ARC' },
  { id: 'obj-arc-plf-01', name: 'Plafonds R+1', modelId: 'mdl-arc-01', discipline: 'ARC' },
  { id: 'obj-mep-cvc-01', name: 'CTA + réseaux CVC', modelId: 'mdl-mep-01', discipline: 'MEP' },
  { id: 'obj-mep-cvc-02', name: 'Gaines étage', modelId: 'mdl-mep-01', discipline: 'MEP' },
  { id: 'obj-mep-plb-01', name: 'Colonnes EU/EP', modelId: 'mdl-mep-01', discipline: 'MEP' },
  { id: 'obj-mep-ele-01', name: 'TGBT + chemins de câbles', modelId: 'mdl-mep-01', discipline: 'MEP' },
];

export const MOCK_MODELS: IFCModelSchedule[] = [
  {
    modelId: 'mdl-str-01',
    modelName: 'STR-BAT-A-Structure.ifc',
    activitiesCount: 7,
    startDate: '2026-01-20',
    endDate: '2026-07-15',
    statusDate: STATUS_DATE,
    objectsCount: 8,
    linksCount: 14,
    storageState: 'Shared',
    lateCount: 1,
  },
  {
    modelId: 'mdl-arc-01',
    modelName: 'ARC-BAT-A-Architecture.ifc',
    activitiesCount: 6,
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    statusDate: STATUS_DATE,
    objectsCount: 6,
    linksCount: 9,
    storageState: 'Shared',
    lateCount: 2,
  },
  {
    modelId: 'mdl-mep-01',
    modelName: 'MEP-BAT-A-CVC-Elec.ifc',
    activitiesCount: 5,
    startDate: '2026-05-04',
    endDate: '2026-09-18',
    statusDate: STATUS_DATE,
    objectsCount: 4,
    linksCount: 7,
    storageState: 'Local',
    lateCount: 1,
  },
];

export const MOCK_ACTIVITIES: ActivityTask[] = [
  {
    id: 'act-01',
    name: 'Terrassement & fondations',
    startDate: '2026-01-20',
    endDate: '2026-02-28',
    actualStart: '2026-01-22',
    actualEnd: '2026-03-04',
    progressPercent: 100,
    assignedObjectIds: ['obj-str-fou-01', 'obj-str-fou-02'],
    modelId: 'mdl-str-01',
  },
  {
    id: 'act-02',
    name: 'Poteaux R+1 / R+2',
    startDate: '2026-03-02',
    endDate: '2026-04-10',
    actualStart: '2026-03-06',
    actualEnd: '2026-04-14',
    progressPercent: 100,
    assignedObjectIds: ['obj-str-pot-01', 'obj-str-pot-02'],
    modelId: 'mdl-str-01',
    predecessors: ['act-01'],
  },
  {
    id: 'act-03',
    name: 'Dalles R+1 / R+2',
    startDate: '2026-04-06',
    endDate: '2026-05-22',
    actualStart: '2026-04-10',
    actualEnd: '2026-05-28',
    progressPercent: 100,
    assignedObjectIds: ['obj-str-dal-01', 'obj-str-dal-02'],
    modelId: 'mdl-str-01',
    predecessors: ['act-02'],
  },
  {
    id: 'act-04',
    name: 'Voiles noyau & escalier',
    startDate: '2026-04-20',
    endDate: '2026-06-12',
    actualStart: '2026-04-24',
    progressPercent: 85,
    assignedObjectIds: ['obj-str-mur-01', 'obj-str-esc-01'],
    modelId: 'mdl-str-01',
    predecessors: ['act-02'],
  },
  {
    id: 'act-05',
    name: 'Coffrage / ferraillage R+3',
    startDate: '2026-06-01',
    endDate: '2026-07-15',
    actualStart: '2026-06-08',
    progressPercent: 62,
    assignedObjectIds: ['obj-str-dal-02'],
    modelId: 'mdl-str-01',
    predecessors: ['act-03'],
  },
  {
    id: 'act-06',
    name: 'Façades rideau Nord / Sud',
    startDate: '2026-05-18',
    endDate: '2026-07-31',
    actualStart: '2026-05-25',
    progressPercent: 70,
    assignedObjectIds: ['obj-arc-fac-01', 'obj-arc-fac-02'],
    modelId: 'mdl-arc-01',
    predecessors: ['act-03'],
  },
  {
    id: 'act-07',
    name: 'Cloisons R+1',
    startDate: '2026-06-15',
    endDate: '2026-07-24',
    actualStart: '2026-06-20',
    progressPercent: 55,
    assignedObjectIds: ['obj-arc-clo-01'],
    modelId: 'mdl-arc-01',
    predecessors: ['act-06'],
  },
  {
    id: 'act-08',
    name: 'Cloisons R+2',
    startDate: '2026-07-20',
    endDate: '2026-08-28',
    actualStart: '2026-08-04',
    progressPercent: 30,
    assignedObjectIds: ['obj-arc-clo-02'],
    modelId: 'mdl-arc-01',
    predecessors: ['act-07'],
  },
  {
    id: 'act-09',
    name: 'Revêtements de sols',
    startDate: '2026-08-10',
    endDate: '2026-09-18',
    progressPercent: 12,
    assignedObjectIds: ['obj-arc-rev-01'],
    modelId: 'mdl-arc-01',
    predecessors: ['act-08'],
  },
  {
    id: 'act-10',
    name: 'Plafonds techniques R+1',
    startDate: '2026-08-24',
    endDate: '2026-09-30',
    progressPercent: 0,
    assignedObjectIds: ['obj-arc-plf-01'],
    modelId: 'mdl-arc-01',
    predecessors: ['act-09'],
  },
  {
    id: 'act-11',
    name: 'CTA & réseaux principaux',
    startDate: '2026-05-04',
    endDate: '2026-06-26',
    actualStart: '2026-05-11',
    actualEnd: '2026-07-02',
    progressPercent: 100,
    assignedObjectIds: ['obj-mep-cvc-01'],
    modelId: 'mdl-mep-01',
    predecessors: ['act-03'],
  },
  {
    id: 'act-12',
    name: 'Gaines CVC étages',
    startDate: '2026-06-22',
    endDate: '2026-08-07',
    actualStart: '2026-07-01',
    progressPercent: 48,
    assignedObjectIds: ['obj-mep-cvc-02'],
    modelId: 'mdl-mep-01',
    predecessors: ['act-11'],
  },
  {
    id: 'act-13',
    name: 'Colonnes EU / EP',
    startDate: '2026-06-08',
    endDate: '2026-07-17',
    actualStart: '2026-06-15',
    progressPercent: 80,
    assignedObjectIds: ['obj-mep-plb-01'],
    modelId: 'mdl-mep-01',
    predecessors: ['act-11'],
  },
  {
    id: 'act-14',
    name: 'TGBT & chemins de câbles',
    startDate: '2026-07-13',
    endDate: '2026-09-04',
    actualStart: '2026-07-27',
    progressPercent: 35,
    assignedObjectIds: ['obj-mep-ele-01'],
    modelId: 'mdl-mep-01',
    predecessors: ['act-12'],
  },
  {
    id: 'act-15',
    name: 'Essais / mises en service',
    startDate: '2026-09-07',
    endDate: '2026-09-18',
    progressPercent: 0,
    assignedObjectIds: ['obj-mep-cvc-01', 'obj-mep-ele-01'],
    modelId: 'mdl-mep-01',
    predecessors: ['act-14'],
  },
  {
    id: 'act-16',
    name: 'Réception structure',
    startDate: '2026-07-06',
    endDate: '2026-07-15',
    actualStart: '2026-07-10',
    progressPercent: 90,
    assignedObjectIds: ['obj-str-mur-01'],
    modelId: 'mdl-str-01',
    predecessors: ['act-04'],
  },
  {
    id: 'act-17',
    name: 'Menuiseries extérieures',
    startDate: '2026-07-06',
    endDate: '2026-08-14',
    actualStart: '2026-07-20',
    progressPercent: 40,
    assignedObjectIds: ['obj-arc-fac-01', 'obj-arc-fac-02'],
    modelId: 'mdl-arc-01',
    predecessors: ['act-06'],
  },
  {
    id: 'act-18',
    name: 'Levage charpente locale',
    startDate: '2026-05-11',
    endDate: '2026-05-29',
    actualStart: '2026-05-12',
    actualEnd: '2026-06-03',
    progressPercent: 100,
    assignedObjectIds: ['obj-str-esc-01'],
    modelId: 'mdl-str-01',
    predecessors: ['act-03'],
  },
];

export const MOCK_PROGRESS: ProgressRecord[] = [
  { objectId: 'obj-str-fou-01', modelId: 'mdl-str-01', objectName: 'Fondations RDC-A', status: 'APPROVED', updatedAt: '2026-03-05', updatedBy: 'S. Martin' },
  { objectId: 'obj-str-fou-02', modelId: 'mdl-str-01', objectName: 'Fondations RDC-B', status: 'APPROVED', updatedAt: '2026-03-05', updatedBy: 'S. Martin' },
  { objectId: 'obj-str-pot-01', modelId: 'mdl-str-01', objectName: 'Poteaux R+1', status: 'APPROVED', updatedAt: '2026-04-15', updatedBy: 'L. Bernard' },
  { objectId: 'obj-str-pot-02', modelId: 'mdl-str-01', objectName: 'Poteaux R+2', status: 'INSTALLED', updatedAt: '2026-04-16', updatedBy: 'L. Bernard' },
  { objectId: 'obj-str-dal-01', modelId: 'mdl-str-01', objectName: 'Dalle R+1', status: 'APPROVED', updatedAt: '2026-05-29', updatedBy: 'L. Bernard' },
  { objectId: 'obj-str-dal-02', modelId: 'mdl-str-01', objectName: 'Dalle R+2', status: 'INSTALLED', updatedAt: '2026-06-20', updatedBy: 'L. Bernard' },
  { objectId: 'obj-str-mur-01', modelId: 'mdl-str-01', objectName: 'Voiles noyau', status: 'INSTALLED', updatedAt: '2026-08-12', updatedBy: 'A. Morel' },
  { objectId: 'obj-str-esc-01', modelId: 'mdl-str-01', objectName: 'Escalier A', status: 'DELIVERED', updatedAt: '2026-08-01', updatedBy: 'A. Morel', notes: 'Attente garde-corps' },
  { objectId: 'obj-arc-fac-01', modelId: 'mdl-arc-01', objectName: 'Façade Nord', status: 'INSTALLED', updatedAt: '2026-08-18', updatedBy: 'C. Dupont' },
  { objectId: 'obj-arc-fac-02', modelId: 'mdl-arc-01', objectName: 'Façade Sud', status: 'BLOCKED', updatedAt: '2026-09-02', updatedBy: 'C. Dupont', notes: 'Retard vitrage fournisseur' },
  { objectId: 'obj-arc-clo-01', modelId: 'mdl-arc-01', objectName: 'Cloisons R+1', status: 'DELIVERED', updatedAt: '2026-08-22', updatedBy: 'C. Dupont' },
  { objectId: 'obj-arc-clo-02', modelId: 'mdl-arc-01', objectName: 'Cloisons R+2', status: 'PROCUREMENT', updatedAt: '2026-08-28', updatedBy: 'C. Dupont' },
  { objectId: 'obj-arc-rev-01', modelId: 'mdl-arc-01', objectName: 'Revêtements sols', status: 'PROCUREMENT', updatedAt: '2026-09-01', updatedBy: 'C. Dupont' },
  { objectId: 'obj-arc-plf-01', modelId: 'mdl-arc-01', objectName: 'Plafonds R+1', status: 'NOT_STARTED', updatedAt: '2026-09-01', updatedBy: 'C. Dupont' },
  { objectId: 'obj-mep-cvc-01', modelId: 'mdl-mep-01', objectName: 'CTA + réseaux CVC', status: 'APPROVED', updatedAt: '2026-07-03', updatedBy: 'N. Petit' },
  { objectId: 'obj-mep-cvc-02', modelId: 'mdl-mep-01', objectName: 'Gaines étage', status: 'DELIVERED', updatedAt: '2026-08-19', updatedBy: 'N. Petit' },
  { objectId: 'obj-mep-plb-01', modelId: 'mdl-mep-01', objectName: 'Colonnes EU/EP', status: 'INSTALLED', updatedAt: '2026-08-05', updatedBy: 'N. Petit' },
  { objectId: 'obj-mep-ele-01', modelId: 'mdl-mep-01', objectName: 'TGBT + chemins de câbles', status: 'BLOCKED', updatedAt: '2026-09-04', updatedBy: 'N. Petit', notes: 'Réserve TGBT — câbles manquants' },
];

export function parseIso(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatFr(date: string | Date): string {
  const d = typeof date === 'string' ? parseIso(date) : date;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getProjectDateRange(activities: ActivityTask[]): { start: Date; end: Date } {
  if (activities.length === 0) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 90);
    return { start, end };
  }
  const starts = activities.map((a) => parseIso(a.startDate).getTime());
  const ends = activities.map((a) => parseIso(a.endDate).getTime());
  return { start: new Date(Math.min(...starts)), end: new Date(Math.max(...ends)) };
}

export function buildScheduleModels(
  activities: ActivityTask[],
  loadedModels: Array<{ id: string; name?: string }>,
  statusDate: string,
): IFCModelSchedule[] {
  const byModel = new Map<string, ActivityTask[]>();
  activities.forEach((activity) => {
    const key = activity.modelId ?? 'project';
    const list = byModel.get(key) ?? [];
    list.push(activity);
    byModel.set(key, list);
  });
  loadedModels.forEach((model) => {
    if (!byModel.has(model.id)) byModel.set(model.id, []);
  });
  if (byModel.size === 0) {
    const today = formatIso(new Date());
    return [
      {
        modelId: 'project',
        modelName: 'Planning du projet',
        activitiesCount: 0,
        startDate: today,
        endDate: today,
        statusDate,
        objectsCount: 0,
        linksCount: 0,
        storageState: 'Local',
      },
    ];
  }
  return [...byModel.entries()].map(([id, acts]) => {
    const loaded = loadedModels.find((model) => model.id === id);
    const range = acts.length ? getProjectDateRange(acts) : { start: new Date(), end: new Date() };
    return {
      modelId: id,
      modelName: loaded?.name ?? (id === 'project' ? 'Planning du projet' : id),
      activitiesCount: acts.length,
      startDate: formatIso(range.start),
      endDate: formatIso(range.end),
      statusDate,
      objectsCount: acts.reduce((sum, act) => sum + act.assignedObjectIds.length, 0),
      linksCount: acts.reduce((sum, act) => sum + (act.predecessors?.length ?? 0), 0),
      storageState: loaded ? 'Shared' : 'Local',
      lateCount: acts.filter((act) => isActivityLate(act, statusDate)).length || undefined,
    };
  });
}

export function dateToPercent(date: Date, start: Date, end: Date): number {
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, ((date.getTime() - start.getTime()) / span) * 100));
}

export function percentToDate(percent: number, start: Date, end: Date): Date {
  const span = end.getTime() - start.getTime();
  return new Date(start.getTime() + (span * percent) / 100);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
}

export function isActivityLate(activity: ActivityTask, statusDate = STATUS_DATE): boolean {
  if (activity.progressPercent >= 100) return false;
  return parseIso(activity.endDate).getTime() < parseIso(statusDate).getTime();
}

export function getActualProgressRange(activity: ActivityTask): { start: Date; end: Date } | null {
  const plannedStart = parseIso(activity.startDate);
  const plannedEnd = parseIso(activity.endDate);
  const actualStart = activity.actualStart ? parseIso(activity.actualStart) : plannedStart;
  if (activity.actualEnd) {
    return { start: actualStart, end: parseIso(activity.actualEnd) };
  }
  if (activity.progressPercent > 0) {
    const span = Math.max(0, plannedEnd.getTime() - plannedStart.getTime());
    return {
      start: actualStart,
      end: new Date(plannedStart.getTime() + (span * activity.progressPercent) / 100),
    };
  }
  return activity.actualStart ? { start: actualStart, end: actualStart } : null;
}

export function getDelayEnd(activity: ActivityTask, statusDate = STATUS_DATE): Date | null {
  const plannedEnd = parseIso(activity.endDate);
  if (activity.actualEnd) {
    const actual = parseIso(activity.actualEnd);
    return actual.getTime() > plannedEnd.getTime() ? actual : null;
  }
  if (activity.progressPercent < 100 && parseIso(statusDate).getTime() > plannedEnd.getTime()) {
    return parseIso(statusDate);
  }
  return null;
}

export function resolveObjectStatus(
  objectId: string,
  records: ProgressRecord[],
): ProgressStatus {
  const rec = records.find((r) => r.objectId === objectId);
  return rec?.status ?? 'NOT_STARTED';
}

export function resolveActivityStatusAtDate(
  activity: ActivityTask,
  playhead: Date,
  records: ProgressRecord[],
): ProgressStatus {
  const start = parseIso(activity.actualStart ?? activity.startDate);
  const plannedEnd = parseIso(activity.endDate);

  if (playhead.getTime() < start.getTime()) return 'NOT_STARTED';

  const objectStatuses = activity.assignedObjectIds.map((id) => resolveObjectStatus(id, records));
  if (objectStatuses.includes('BLOCKED')) return 'BLOCKED';
  if (objectStatuses.every((s) => s === 'APPROVED') && activity.progressPercent >= 100) {
    return 'APPROVED';
  }

  if (activity.progressPercent >= 100 || activity.actualEnd) {
    return objectStatuses.includes('APPROVED') ? 'APPROVED' : 'INSTALLED';
  }

  if (playhead.getTime() > plannedEnd.getTime() && activity.progressPercent < 100) {
    return objectStatuses.includes('BLOCKED') ? 'BLOCKED' : 'INSTALLED';
  }

  if (activity.progressPercent >= 70) return 'INSTALLED';
  if (activity.progressPercent >= 35) return 'DELIVERED';
  if (activity.progressPercent > 0) return 'PROCUREMENT';
  return 'NOT_STARTED';
}

export function buildSCurveData(activities: ActivityTask[]): SCurvePoint[] {
  if (activities.length === 0) return [];
  const { start, end } = getProjectDateRange(activities);
  const points: SCurvePoint[] = [];
  const cursor = new Date(start);
  const statusDate = parseIso(STATUS_DATE);
  const total = activities.length;

  while (cursor.getTime() <= end.getTime()) {
    const planned = activities.filter((a) => parseIso(a.endDate).getTime() <= cursor.getTime()).length;
    const actual = activities.filter((a) => {
      if (!a.actualEnd) {
        return a.progressPercent >= 100 && parseIso(a.endDate).getTime() <= cursor.getTime();
      }
      return parseIso(a.actualEnd).getTime() <= cursor.getTime();
    }).length;

    const inProgressWeight = activities.reduce((sum, a) => {
      if (a.actualEnd) return sum;
      const aStart = parseIso(a.actualStart ?? a.startDate);
      if (cursor.getTime() < aStart.getTime() || cursor.getTime() > statusDate.getTime()) return sum;
      return sum + a.progressPercent / 100;
    }, 0);

    points.push({
      date: formatIso(cursor),
      planned: Math.round((planned / total) * 100),
      actual: cursor.getTime() > statusDate.getTime()
        ? Number.NaN
        : Math.round(((actual + inProgressWeight * 0.35) / total) * 100),
    });

    cursor.setDate(cursor.getDate() + 14);
  }

  return points;
}

export function statusHex(status: ProgressStatus): string {
  return STATUS_CONFIGS[status].colorHex;
}

export function computeKpis(activities: ActivityTask[], records: ProgressRecord[]) {
  const total = activities.length;
  const done = activities.filter((a) => a.progressPercent >= 100).length;
  const late = activities.filter((a) => isActivityLate(a)).length;
  const blocked = records.filter((r) => r.status === 'BLOCKED').length;
  const avg = total === 0 ? 0 : Math.round(activities.reduce((s, a) => s + a.progressPercent, 0) / total);
  return { total, done, late, blocked, avg };
}

export function formatShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseIso(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function getActivityState(activity: ActivityTask, statusDate = STATUS_DATE): ActivityState {
  const status = parseIso(statusDate).getTime();
  const start = parseIso(activity.startDate).getTime();
  const end = parseIso(activity.endDate).getTime();
  if (activity.progressPercent >= 100) {
    if (activity.actualEnd && parseIso(activity.actualEnd).getTime() < end) return 'Ahead';
    return 'Finished';
  }
  if (status < start) return 'Not due';
  if (status > end) return 'Behind';
  if (activity.progressPercent > 0) return 'In progress';
  return 'In progress';
}

export function computeProgressSnapshot(
  activities: ActivityTask[],
  records: ProgressRecord[],
  statusDate = STATUS_DATE,
) {
  const states = activities.map((a) => getActivityState(a, statusDate));
  const due = activities.filter((a) => parseIso(a.endDate).getTime() <= parseIso(statusDate).getTime());
  const finishedDue = due.filter((a) => a.progressPercent >= 100).length;
  return {
    activities: activities.length,
    finished: states.filter((s) => s === 'Finished').length,
    inProgress: states.filter((s) => s === 'In progress').length,
    behind: states.filter((s) => s === 'Behind').length,
    ahead: states.filter((s) => s === 'Ahead').length,
    notDue: states.filter((s) => s === 'Not due').length,
    lateElements: records.filter((r) => r.status === 'BLOCKED').length
      + activities.filter((a) => isActivityLate(a, statusDate)).reduce((n, a) => n + a.assignedObjectIds.length, 0),
    finishedOfDue: `${finishedDue}/${due.length}`,
  };
}

export function buildActivityCountCurve(activities: ActivityTask[], statusDate = STATUS_DATE) {
  if (activities.length === 0) return [];
  const { start, end } = getProjectDateRange(activities);
  const points: Array<{ date: string; planned: number; actual: number | null }> = [];
  const cursor = new Date(start);
  const status = parseIso(statusDate);

  while (cursor.getTime() <= end.getTime()) {
    const planned = activities.filter((a) => parseIso(a.endDate).getTime() <= cursor.getTime()).length;
    const actual = activities.filter((a) => {
      if (a.actualEnd) return parseIso(a.actualEnd).getTime() <= cursor.getTime();
      return a.progressPercent >= 100 && parseIso(a.endDate).getTime() <= cursor.getTime();
    }).length;
    points.push({
      date: formatIso(cursor),
      planned,
      actual: cursor.getTime() > status.getTime() ? null : actual,
    });
    cursor.setDate(cursor.getDate() + 14);
  }
  return points;
}

export const UNSCHEDULED_MODEL_COUNT = 180;
