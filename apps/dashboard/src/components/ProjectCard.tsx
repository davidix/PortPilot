import type { GroupedPorts } from "@portpilot/shared";
import { Cube, Folder, Layers } from "./Icon.js";
import { PortTile } from "./PortRow.js";
import { decodeGroupKey } from "../lib/groupMeta.js";

interface Props {
  group: GroupedPorts;
  index: number;
}

const KIND_TONE: Record<ReturnType<typeof decodeGroupKey>["kind"], string> = {
  compose: "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/25",
  repo: "bg-sky-400/10 text-sky-100 ring-1 ring-sky-400/25",
  package: "bg-fuchsia-400/10 text-fuchsia-100 ring-1 ring-fuchsia-400/25",
  cwd: "bg-zinc-400/10 text-zinc-200 ring-1 ring-zinc-400/15",
  docker: "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/25",
  process: "bg-zinc-400/10 text-zinc-200 ring-1 ring-zinc-400/15",
};

function shortenPath(p?: string): string | undefined {
  if (!p) return undefined;
  if (!p.startsWith("/")) return p;
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 4) return p;
  return "…/" + parts.slice(-4).join("/");
}

export function ProjectCard({ group, index }: Props) {
  const meta = decodeGroupKey(group.key);
  const sourceMix = (() => {
    const docker = group.entries.filter((e) => e.source === "docker").length;
    const host = group.entries.length - docker;
    return { docker, host };
  })();

  return (
    <section
      className="overflow-hidden rounded-3xl border border-white/5 bg-ink-900/60 p-1.5 shadow-bezel backdrop-blur-xl animate-riseIn"
      style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
    >
      <div className="rounded-[1.35rem] border border-white/[0.04] bg-ink-800/40">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.05] px-5 py-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${KIND_TONE[meta.kind]}`}>
                {meta.kind === "compose" || meta.kind === "docker" ? <Cube size={11} /> : meta.kind === "repo" ? <Layers size={11} /> : <Folder size={11} />}
                {meta.label}
              </span>
              <h2 className="truncate text-lg font-semibold tracking-tight text-white">{group.label}</h2>
            </div>
            {meta.detail ? (
              <p className="truncate font-mono text-[11px] text-zinc-500" title={meta.detail}>
                {shortenPath(meta.detail)}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-ink-950/40 px-3 py-1 text-[11px] font-medium text-zinc-300">
              <span className="tabular text-white">{group.entries.length}</span>
              <span className="text-zinc-500">{group.entries.length === 1 ? "service" : "services"}</span>
            </span>
            {sourceMix.docker > 0 ? (
              <span className="hidden items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200 sm:inline-flex">
                {sourceMix.docker} docker
              </span>
            ) : null}
            {sourceMix.host > 0 ? (
              <span className="hidden items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-200 sm:inline-flex">
                {sourceMix.host} host
              </span>
            ) : null}
          </div>
        </header>
        <div className="flex flex-col divide-y divide-white/[0.04] px-2 py-1.5">
          {group.entries.map((e, idx) => (
            <PortTile key={`${e.port}-${e.source}-${e.groupKey}-${idx}`} entry={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
