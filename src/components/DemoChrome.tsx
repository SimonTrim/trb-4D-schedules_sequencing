interface DemoChromeProps {
  mode: 'project' | 'viewer';
  embedded: boolean;
  connected: boolean;
  onModeChange: (mode: 'project' | 'viewer') => void;
}

export default function DemoChrome({ mode, embedded, connected, onModeChange }: DemoChromeProps) {
  if (embedded) return null;

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#d0d1db] bg-[#f8f8fb] px-3 text-[12px] text-[#6a6e79]">
      <span>
        Local preview — Trimble Connect chrome (sidebar / top bar / 3D viewer) is provided by the host.
        {connected ? ' Workspace API connected.' : ' Demo data.'}
      </span>
      <div className="flex overflow-hidden rounded border border-[#d0d1db]">
        <button
          type="button"
          className={`px-2 py-1 ${mode === 'project' ? 'bg-[#0063a3] text-white' : 'bg-white'}`}
          onClick={() => onModeChange('project')}
        >
          4D schedules
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${mode === 'viewer' ? 'bg-[#0063a3] text-white' : 'bg-white'}`}
          onClick={() => onModeChange('viewer')}
        >
          4D sequencing
        </button>
      </div>
    </div>
  );
}
