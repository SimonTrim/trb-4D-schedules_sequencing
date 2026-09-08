import * as WorkspaceAPI from 'trimble-connect-workspace-api';
import { ColorRGBA } from '../types/schedule';

export type WorkspaceApi = Awaited<ReturnType<typeof WorkspaceAPI.connect>>;

export type ViewerEventHandler = (event: string, data: unknown) => void;

const REF_SEP = ':';

export function encodeObjectRef(modelId: string, runtimeId: number): string {
  return `${modelId}${REF_SEP}${runtimeId}`;
}

export function isViewerObjectRef(id: string): boolean {
  const sep = id.lastIndexOf(REF_SEP);
  return sep > 0 && !Number.isNaN(Number(id.slice(sep + 1)));
}

export function parseObjectRef(id: string): { modelId: string; runtimeId: number } | null {
  const sep = id.lastIndexOf(REF_SEP);
  if (sep <= 0) return null;
  const modelId = id.slice(0, sep);
  const runtimeId = Number(id.slice(sep + 1));
  if (!modelId || Number.isNaN(runtimeId)) return null;
  return { modelId, runtimeId };
}

function toSelector(ids: string[]) {
  const byModel = new Map<string, number[]>();
  ids.forEach((id) => {
    const parsed = parseObjectRef(id);
    if (!parsed) return;
    const list = byModel.get(parsed.modelId) ?? [];
    list.push(parsed.runtimeId);
    byModel.set(parsed.modelId, list);
  });
  return {
    modelObjectIds: [...byModel.entries()].map(([modelId, objectRuntimeIds]) => ({
      modelId,
      objectRuntimeIds,
    })),
  };
}

function toViewerColor(color: ColorRGBA) {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a <= 1 ? Math.round(color.a * 255) : Math.round(color.a),
  };
}

export async function initTrimbleApi(onEvent?: ViewerEventHandler): Promise<WorkspaceApi | null> {
  try {
    if (typeof window === 'undefined' || window.self === window.top) {
      console.warn('API Workspace non disponible (Exécution locale / Mode Demo Mock)');
      return null;
    }
    const api = await WorkspaceAPI.connect(
      window.parent,
      (event: string, data: unknown) => onEvent?.(event, data),
      30000,
    );
    console.log('Connecté avec succès à Trimble Connect Workspace API');
    return api;
  } catch (error) {
    console.warn('API Workspace non disponible (Exécution locale / Mode Demo Mock)');
    return null;
  }
}

export async function setObjectsColor(
  workspaceApi: WorkspaceApi | null,
  ids: string[],
  color: ColorRGBA,
) {
  if (!workspaceApi || ids.length === 0) return;
  const selector = toSelector(ids);
  if (selector.modelObjectIds.length === 0) return;
  try {
    await workspaceApi.viewer.setObjectState(selector, { color: toViewerColor(color) });
  } catch (err) {
    console.error('Erreur lors de la mise à jour des couleurs :', err);
  }
}

export async function resetObjectsColor(workspaceApi: WorkspaceApi | null) {
  if (!workspaceApi) return;
  try {
    await workspaceApi.viewer.setObjectState(undefined, { color: 'reset' });
  } catch (err) {
    console.error('Erreur lors de la réinitialisation des couleurs :', err);
  }
}

export async function hideObjects(workspaceApi: WorkspaceApi | null, ids: string[]) {
  if (!workspaceApi || ids.length === 0) return;
  const selector = toSelector(ids);
  if (selector.modelObjectIds.length === 0) return;
  try {
    await workspaceApi.viewer.setObjectState(selector, { visible: false });
  } catch (err) {
    console.error('Erreur lors du masquage des objets :', err);
  }
}

export async function showAllObjects(workspaceApi: WorkspaceApi | null) {
  if (!workspaceApi) return;
  try {
    await workspaceApi.viewer.setObjectState(undefined, { visible: true });
  } catch (err) {
    console.error('Erreur lors du réaffichage des objets :', err);
  }
}

export async function resetObjectVisibility(workspaceApi: WorkspaceApi | null) {
  if (!workspaceApi) return;
  try {
    await workspaceApi.viewer.setObjectState(undefined, { visible: 'reset' });
  } catch (err) {
    console.error('Erreur reset visibilité :', err);
  }
}

export async function getHostName(workspaceApi: WorkspaceApi | null): Promise<string | null> {
  if (!workspaceApi) return null;
  try {
    const host = await workspaceApi.extension.getHost();
    if (typeof host === 'string') return host;
    return host?.name ?? null;
  } catch {
    return null;
  }
}

export async function openIn3dViewer(
  workspaceApi: WorkspaceApi | null,
  modelId?: string,
) {
  if (!workspaceApi) return false;
  try {
    const project = await workspaceApi.project?.getCurrentProject?.();
    await workspaceApi.extension.goTo('3dviewer', {
      projectId: project?.id,
      modelId,
    });
    return true;
  } catch (err) {
    console.error('Navigation viewer 3D impossible :', err);
    return false;
  }
}

export async function getLoadedModels(workspaceApi: WorkspaceApi | null) {
  if (!workspaceApi) return [];
  try {
    return await workspaceApi.viewer.getModels('loaded');
  } catch (err) {
    console.error('getModels(loaded) failed:', err);
    return [];
  }
}

export async function listLoadedObjectRefs(workspaceApi: WorkspaceApi | null): Promise<string[]> {
  if (!workspaceApi) return [];
  try {
    const groups = await workspaceApi.viewer.getObjects();
    return groups.flatMap((group) =>
      (group.objects ?? []).map((object) => encodeObjectRef(group.modelId, object.id)),
    );
  } catch (err) {
    console.error('getObjects failed:', err);
    return [];
  }
}

export async function getViewerSelectionIds(workspaceApi: WorkspaceApi | null): Promise<string[]> {
  if (!workspaceApi) return [];
  try {
    const selection = await workspaceApi.viewer.getSelection();
    if (!Array.isArray(selection)) return [];
    return selection.flatMap((item) =>
      (item.objectRuntimeIds ?? []).map((runtimeId) => encodeObjectRef(item.modelId, runtimeId)),
    );
  } catch {
    return [];
  }
}

export async function selectActivityObjects(
  workspaceApi: WorkspaceApi | null,
  ids: string[],
) {
  if (!workspaceApi || ids.length === 0) return;
  const selector = toSelector(ids);
  if (selector.modelObjectIds.length === 0) return;
  try {
    await workspaceApi.viewer.setSelection(selector, 'set');
    await workspaceApi.viewer.setCamera(selector);
  } catch (err) {
    console.error('Sélection viewer impossible :', err);
  }
}

export function distributeObjectRefs(refs: string[], bucketCount: number): string[][] {
  if (bucketCount <= 0) return [];
  const buckets: string[][] = Array.from({ length: bucketCount }, () => []);
  refs.forEach((ref, index) => {
    buckets[index % bucketCount].push(ref);
  });
  return buckets;
}

export function selectionFromEvent(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const modelId = 'modelId' in item ? String((item as { modelId: unknown }).modelId) : '';
    const runtimeIds = 'objectRuntimeIds' in item
      ? ((item as { objectRuntimeIds?: unknown }).objectRuntimeIds ?? [])
      : [];
    if (!modelId || !Array.isArray(runtimeIds)) return [];
    return runtimeIds.map((id) => encodeObjectRef(modelId, Number(id)));
  });
}
