export type ProgressStatus =
  | 'NOT_STARTED'
  | 'PROCUREMENT'
  | 'DELIVERED'
  | 'INSTALLED'
  | 'APPROVED'
  | 'BLOCKED';

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface StatusConfig {
  code: ProgressStatus;
  labelFr: string;
  colorHex: string;
  rgba: ColorRGBA;
}

export const STATUS_CONFIGS: Record<ProgressStatus, StatusConfig> = {
  NOT_STARTED: { code: 'NOT_STARTED', labelFr: 'Non Commencé', colorHex: '#9CA3AF', rgba: { r: 156, g: 163, b: 175, a: 0.3 } },
  PROCUREMENT: { code: 'PROCUREMENT', labelFr: 'Commandé / Appro', colorHex: '#3B82F6', rgba: { r: 59, g: 130, b: 246, a: 0.8 } },
  DELIVERED: { code: 'DELIVERED', labelFr: 'Livré sur Chantier', colorHex: '#EAB308', rgba: { r: 234, g: 179, b: 8, a: 0.8 } },
  INSTALLED: { code: 'INSTALLED', labelFr: 'Posé / Exécuté', colorHex: '#F97316', rgba: { r: 249, g: 115, b: 22, a: 0.9 } },
  APPROVED: { code: 'APPROVED', labelFr: 'Validé / Réceptionné', colorHex: '#22C55E', rgba: { r: 34, g: 197, b: 94, a: 0.9 } },
  BLOCKED: { code: 'BLOCKED', labelFr: 'Bloqué / Problème', colorHex: '#EF4444', rgba: { r: 239, g: 68, b: 68, a: 1.0 } },
};

export interface ProgressRecord {
  objectId: string;
  modelId: string;
  objectName?: string;
  status: ProgressStatus;
  updatedAt: string;
  updatedBy: string;
  notes?: string;
}

export interface LinkRoute {
  stubOut?: number;
  stubIn?: number;
  midT?: number;
}

export interface ActivityTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  actualStart?: string;
  actualEnd?: string;
  progressPercent: number;
  assignedObjectIds: string[];
  modelId?: string;
  predecessors?: string[];
  linkRoutes?: Record<string, LinkRoute>;
  type?: 'Construct' | 'Demolish' | 'Temporary';
}

export interface IFCModelSchedule {
  modelId: string;
  modelName: string;
  activitiesCount: number;
  startDate: string;
  endDate: string;
  statusDate: string;
  objectsCount: number;
  linksCount: number;
  storageState: 'Shared' | 'Local';
  lateCount?: number;
}

export type DashboardTab = 'gantt' | 'progress' | 'import' | 'baselines';

export interface SequencingOptions {
  displayGantt: boolean;
  statusColors: boolean;
  hideUnbuilt: boolean;
  dependencyLinks: boolean;
  actualProgress: boolean;
  lateElements: boolean;
  autoOrbit: boolean;
}

export type ActivityState = 'Finished' | 'In progress' | 'Behind' | 'Ahead' | 'Not due';

export const ACTIVITY_STATE_LABELS: Record<ActivityState, string> = {
  Finished: 'Terminée',
  'In progress': 'En cours',
  Behind: 'En retard',
  Ahead: 'En avance',
  'Not due': 'Non échue',
};

export const ACTIVITY_TYPE_LABELS: Record<NonNullable<ActivityTask['type']>, string> = {
  Construct: 'Construction',
  Demolish: 'Démolition',
  Temporary: 'Temporaire',
};

export const STORAGE_STATE_LABELS: Record<IFCModelSchedule['storageState'], string> = {
  Shared: 'Partagé',
  Local: 'Local',
};

export type AppMode = 'project' | 'viewer';

export interface SCurvePoint {
  date: string;
  planned: number;
  actual: number;
}

export interface MockIfcObject {
  id: string;
  name: string;
  modelId: string;
  discipline: 'STR' | 'ARC' | 'MEP';
}
