import { Box, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  projectName?: string;
}

export default function Header({ connected, projectName }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between bg-trimble-navy px-4 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-white/10">
          <Box size={18} strokeWidth={2} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-wide">Trimble Connect</div>
          <div className="text-[11px] text-white/70">Planning 4D &amp; suivi d’avancement</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[12px]">
        {projectName && (
          <span className="hidden max-w-[240px] truncate text-white/80 sm:inline">
            {projectName}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${
            connected ? 'bg-emerald-500/20 text-emerald-100' : 'bg-white/10 text-white/80'
          }`}
        >
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? 'Workspace API' : 'Mode démo'}
        </span>
      </div>
    </header>
  );
}
