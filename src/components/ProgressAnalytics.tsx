import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ACTIVITY_STATE_LABELS, ActivityState, ActivityTask, ProgressRecord } from '../types/schedule';
import {
  buildActivityCountCurve,
  computeProgressSnapshot,
  daysBetween,
  formatShort,
  getActivityState,
  isActivityLate,
} from '../services/mockData';

interface ProgressAnalyticsProps {
  activities: ActivityTask[];
  progress: ProgressRecord[];
  statusDate: string;
}

const STATE_COLOR: Record<string, string> = {
  Finished: '#16a34a',
  'In progress': '#16a34a',
  Behind: '#dc2626',
  Ahead: '#217cbb',
  'Not due': '#252a2e',
};

export default function ProgressAnalytics({
  activities,
  progress,
  statusDate,
}: ProgressAnalyticsProps) {
  const snap = computeProgressSnapshot(activities, progress, statusDate);
  const curve = buildActivityCountCurve(activities, statusDate).map((p) => ({
    ...p,
    label: formatShort(p.date),
  }));

  const kpis = [
    { label: 'Activités', value: snap.activities, tone: 'text-[#252a2e]' },
    { label: 'Terminées', value: snap.finished, tone: 'text-[#252a2e]' },
    { label: 'En cours', value: snap.inProgress, tone: 'text-[#217cbb]' },
    { label: 'En retard', value: snap.behind, tone: 'text-[#dc2626] font-bold' },
    { label: 'En avance', value: snap.ahead, tone: 'text-[#60a5fa]' },
    { label: 'Non échues', value: snap.notDue, tone: 'text-[#252a2e]' },
    { label: 'Éléments en retard', value: snap.lateElements, tone: 'text-[#c2410c] bg-[#fff7ed]' },
    { label: 'Terminées / échues', value: snap.finishedOfDue, tone: 'text-[#252a2e]' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded border border-[#e6e7ee] px-3 py-2 ${kpi.tone.includes('bg-') ? 'bg-[#fff7ed]' : 'bg-white'}`}>
            <div className="text-[11px] text-[#6a6e79]">{kpi.label}</div>
            <div className={`mt-1 text-[22px] leading-none ${kpi.tone}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded border border-[#e6e7ee] bg-white p-3">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={480} minHeight={240}>
            <LineChart data={curve} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#eeeef3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6a6e79' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6a6e79' }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <ReferenceLine
                x={formatShort(statusDate)}
                stroke="#ef4444"
                strokeDasharray="4 3"
              />
              <Line type="monotone" dataKey="planned" name="Planifié" stroke="#9ca3af" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actual" name="Réel" stroke="#217cbb" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto rounded border border-[#e6e7ee] bg-white">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="bg-[#fafafc] text-[11px] uppercase tracking-wide text-[#6a6e79]">
            <tr>
              <th className="px-3 py-2 font-semibold">Activité</th>
              <th className="px-3 py-2 font-semibold">État</th>
              <th className="px-3 py-2 font-semibold">Planifié</th>
              <th className="px-3 py-2 font-semibold">Réel</th>
              <th className="px-3 py-2 font-semibold">Écart</th>
              <th className="px-3 py-2 font-semibold">Retard</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const state = getActivityState(activity, statusDate);
              const actual = activity.actualEnd ?? (activity.progressPercent >= 100 ? activity.endDate : '');
              const variance = actual ? daysBetween(activity.endDate, actual) : null;
              const late = isActivityLate(activity, statusDate) ? activity.assignedObjectIds.length : 0;
              return (
                <tr key={activity.id} className="border-t border-[#eee]">
                  <td className="px-3 py-2">{activity.name}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: STATE_COLOR[state] }}>
                    {ACTIVITY_STATE_LABELS[state as ActivityState]}
                  </td>
                  <td className="px-3 py-2 text-[#6a6e79]">
                    {activity.startDate} → {activity.endDate}
                  </td>
                  <td className="px-3 py-2 text-[#6a6e79]">
                    {activity.actualStart ?? '—'} → {actual || '—'}
                    {activity.progressPercent < 100 ? ` · ${activity.progressPercent}%` : ''}
                  </td>
                  <td className="px-3 py-2">
                    {variance === null ? '—' : `${variance > 0 ? '+' : ''}${variance}`}
                  </td>
                  <td className="px-3 py-2">{late || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
