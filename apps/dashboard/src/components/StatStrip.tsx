import type { ScanResult } from "@portpilot/shared";
import { Apple, Cube, Layers, Pulse } from "./Icon.js";

interface Props {
  data: ScanResult | null;
}

interface Stat {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  tone: string;
}

function compute(data: ScanResult | null): Stat[] {
  if (!data) {
    return [
      { label: "Services", value: "—", icon: <Pulse size={16} />, tone: "text-sky-200" },
      { label: "Projects", value: "—", icon: <Layers size={16} />, tone: "text-fuchsia-200" },
      { label: "Docker", value: "—", icon: <Cube size={16} />, tone: "text-emerald-200" },
      { label: "Host", value: "—", icon: <Apple size={16} />, tone: "text-amber-200" },
    ];
  }
  const docker = data.entries.filter((e) => e.source === "docker").length;
  const host = data.entries.filter((e) => e.source === "macos").length;
  const frameworks = new Set(data.entries.map((e) => e.framework)).size;
  return [
    { label: "Services", value: data.entries.length, sub: `${frameworks} stacks`, icon: <Pulse size={16} />, tone: "text-sky-200" },
    { label: "Projects", value: data.groups.length, icon: <Layers size={16} />, tone: "text-fuchsia-200" },
    { label: "Docker", value: docker, icon: <Cube size={16} />, tone: "text-emerald-200" },
    { label: "Host", value: host, icon: <Apple size={16} />, tone: "text-amber-200" },
  ];
}

export function StatStrip({ data }: Props) {
  const stats = compute(data);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <article
          key={s.label}
          className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/70 p-4 shadow-bezel transition-all duration-500 ease-spring hover:border-white/10 hover:bg-ink-800/70"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">{s.label}</span>
            <span className={`opacity-70 transition-opacity duration-500 ease-spring group-hover:opacity-100 ${s.tone}`}>
              {s.icon}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tabular text-3xl font-semibold tracking-tight text-white">{s.value}</span>
            {s.sub ? <span className="text-xs text-zinc-500">{s.sub}</span> : null}
          </div>
          <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/[0.025] blur-2xl transition-opacity duration-700 ease-gentle group-hover:bg-white/[0.05]" />
        </article>
      ))}
    </div>
  );
}
