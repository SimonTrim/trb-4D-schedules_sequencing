import { ActivityTask } from '../types/schedule';
import { formatIso } from './mockData';

export interface ImportResult {
  activities: ActivityTask[];
  format: string;
}

function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return formatIso(parsed);
}

function activity(partial: Partial<ActivityTask> & { name: string; startDate: string; endDate: string }): ActivityTask {
  return {
    id: partial.id ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name,
    startDate: partial.startDate,
    endDate: partial.endDate,
    actualStart: partial.actualStart,
    actualEnd: partial.actualEnd,
    progressPercent: Number.isFinite(partial.progressPercent) ? Number(partial.progressPercent) : 0,
    assignedObjectIds: partial.assignedObjectIds ?? [],
    modelId: partial.modelId,
    predecessors: partial.predecessors,
    type: partial.type ?? 'Construct',
  };
}

function parseNativeJson(text: string): ActivityTask[] | null {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.activities)
      ? parsed.activities
      : Array.isArray(parsed.tasks)
        ? parsed.tasks
        : null;
  if (!list) return null;
  return list
    .filter((item: unknown) => item && typeof item === 'object')
    .map((item: Record<string, unknown>, index: number) => {
      const start = toIso(String(item.startDate ?? item.start ?? item.Start ?? '')) ?? formatIso(new Date());
      const end = toIso(String(item.endDate ?? item.end ?? item.Finish ?? item.finish ?? '')) ?? start;
      return activity({
        id: String(item.id ?? item.ID ?? `imported-${index + 1}`),
        name: String(item.name ?? item.Name ?? item.taskName ?? `Activité ${index + 1}`),
        startDate: start,
        endDate: end,
        actualStart: toIso(String(item.actualStart ?? '')),
        actualEnd: toIso(String(item.actualEnd ?? '')),
        progressPercent: Number(item.progressPercent ?? item.percentComplete ?? item.PercentComplete ?? 0),
        assignedObjectIds: Array.isArray(item.assignedObjectIds) ? item.assignedObjectIds.map(String) : [],
        modelId: item.modelId ? String(item.modelId) : undefined,
        predecessors: Array.isArray(item.predecessors)
          ? item.predecessors.map(String)
          : typeof item.predecessors === 'string'
            ? item.predecessors.split(/[;,:]/).map((id) => id.trim()).filter(Boolean)
            : undefined,
        type: item.type === 'Demolish' || item.type === 'Temporary' ? item.type : 'Construct',
      });
    });
}

function parseCsv(text: string): ActivityTask[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[;,]/).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const nameI = idx(['name', 'nom', 'task', 'activité', 'activite', 'task_name']);
  const startI = idx(['startdate', 'start', 'début', 'debut', 'start_date']);
  const endI = idx(['enddate', 'end', 'finish', 'fin', 'end_date', 'finish_date']);
  const progressI = idx(['progresspercent', 'progress', 'avancement', '%', 'percentcomplete']);
  const predI = idx(['predecessors', 'predecessor', 'prédécesseurs', 'predecesseurs']);
  const idI = idx(['id', 'uid', 'taskid']);

  return lines.slice(1).map((line, index) => {
    const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    const start = toIso(cols[startI] ?? '') ?? formatIso(new Date());
    const end = toIso(cols[endI] ?? '') ?? start;
    const predecessors = cols[predI]
      ? cols[predI].split(/[;:]/).map((id) => id.trim()).filter(Boolean)
      : undefined;
    return activity({
      id: cols[idI] || `csv-${index + 1}`,
      name: cols[nameI] || `Activité ${index + 1}`,
      startDate: start,
      endDate: end,
      progressPercent: Number(cols[progressI] ?? 0),
      predecessors,
    });
  });
}

function textContent(node: Element | null, fallback = ''): string {
  return node?.textContent?.trim() ?? fallback;
}

function parseMsProjectXml(xml: Document): ActivityTask[] {
  const tasks = [...xml.querySelectorAll('Task')].filter((task) => textContent(task.querySelector('Name')));
  const byUid = new Map<string, string>();
  tasks.forEach((task, index) => {
    const uid = textContent(task.querySelector('UID')) || String(index + 1);
    byUid.set(uid, textContent(task.querySelector('ID')) || `msp-${uid}`);
  });
  return tasks
    .filter((task) => textContent(task.querySelector('Summary')) !== '1')
    .map((task, index) => {
      const uid = textContent(task.querySelector('UID')) || String(index + 1);
      const start = toIso(textContent(task.querySelector('Start'))) ?? formatIso(new Date());
      const end = toIso(textContent(task.querySelector('Finish'))) ?? start;
      const preds = [...task.querySelectorAll('PredecessorLink > PredecessorUID')]
        .map((node) => byUid.get(textContent(node)) ?? textContent(node))
        .filter(Boolean);
      return activity({
        id: byUid.get(uid) ?? `msp-${uid}`,
        name: textContent(task.querySelector('Name'), `Tâche ${index + 1}`),
        startDate: start,
        endDate: end,
        progressPercent: Number(textContent(task.querySelector('PercentComplete')) || 0),
        predecessors: preds.length ? preds : undefined,
      });
    });
}

function parsePrimaveraXml(xml: Document): ActivityTask[] {
  const nodes = [
    ...xml.querySelectorAll('Activity'),
    ...xml.querySelectorAll('APIBusinessObjects > Activity'),
  ];
  if (nodes.length === 0) return [];
  return nodes.map((node, index) => {
    const start =
      toIso(textContent(node.querySelector('StartDate'))) ??
      toIso(textContent(node.querySelector('PlannedStartDate'))) ??
      formatIso(new Date());
    const end =
      toIso(textContent(node.querySelector('FinishDate'))) ??
      toIso(textContent(node.querySelector('PlannedFinishDate'))) ??
      start;
    return activity({
      id: textContent(node.querySelector('Id')) || textContent(node.querySelector('ObjectId')) || `p6-${index + 1}`,
      name: textContent(node.querySelector('Name'), `Activité ${index + 1}`),
      startDate: start,
      endDate: end,
      progressPercent: Number(textContent(node.querySelector('PercentComplete')) || 0),
    });
  });
}

function parseXer(text: string): ActivityTask[] {
  const lines = text.split(/\r?\n/);
  const tasks: ActivityTask[] = [];
  let inTask = false;
  let fields: string[] = [];
  for (const line of lines) {
    if (line.startsWith('%T') && line.includes('TASK')) {
      inTask = true;
      fields = [];
      continue;
    }
    if (line.startsWith('%T') && inTask) break;
    if (!inTask) continue;
    if (line.startsWith('%F')) {
      fields = line.slice(2).trim().split('\t');
      continue;
    }
    if (!line.startsWith('%R') || fields.length === 0) continue;
    const cols = line.slice(2).trim().split('\t');
    const get = (name: string) => cols[fields.indexOf(name)] ?? '';
    const start = toIso(get('target_start_date') || get('early_start_date')) ?? formatIso(new Date());
    const end = toIso(get('target_end_date') || get('early_end_date')) ?? start;
    tasks.push(
      activity({
        id: get('task_code') || get('task_id') || `xer-${tasks.length + 1}`,
        name: get('task_name') || `Activité ${tasks.length + 1}`,
        startDate: start,
        endDate: end,
        progressPercent: Number(get('phys_complete_pct') || 0),
      }),
    );
  }
  return tasks;
}

export async function importScheduleFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const activities = parseCsv(text);
    if (activities.length) return { activities, format: 'CSV' };
  }

  if (name.endsWith('.xer') || text.includes('%T\tTASK') || text.includes('%T TASK')) {
    const activities = parseXer(text);
    if (activities.length) return { activities, format: 'Primavera XER' };
  }

  if (name.endsWith('.xml') || text.trimStart().startsWith('<')) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const p6 = parsePrimaveraXml(xml);
    if (p6.length) return { activities: p6, format: 'Primavera P6 XML' };
    const msp = parseMsProjectXml(xml);
    if (msp.length) return { activities: msp, format: 'Microsoft Project XML' };
  }

  if (name.endsWith('.json') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
    const activities = parseNativeJson(text);
    if (activities?.length) return { activities, format: 'JSON 4D' };
  }

  throw new Error('Format non reconnu. Utilisez JSON, CSV, MS Project XML, Primavera XML ou XER.');
}
