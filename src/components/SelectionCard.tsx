import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface SelectionCardProps {
  iconBg: string;
  icon: ReactNode;
  label: string;
  name: string;
  sub: string;
  onClick: () => void;
}

export function SelectionCard({ iconBg, icon, label, name, sub, onClick }: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-border bg-slate-50 p-4 text-left transition hover:border-primary hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{name}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
    </button>
  );
}
