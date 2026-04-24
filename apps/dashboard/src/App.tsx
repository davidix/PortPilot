import type { GroupedPorts, PortEntry, ScanResult } from "@portpilot/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectCard } from "./components/ProjectCard.js";
import { Filters, type FilterState } from "./components/Filters.js";
import { StatStrip } from "./components/StatStrip.js";
import { SkeletonGrid } from "./components/Skeleton.js";
import { EmptyState } from "./components/EmptyState.js";
import { Refresh } from "./components/Icon.js";
import { agentBaseUrl, fetchHealth, fetchScan } from "./lib/api.js";

function applyFilters(groups: GroupedPorts[], f: FilterState): GroupedPorts[] {
  const scoped = f.project === "all" ? groups : groups.filter((g) => g.key === f.project);
  const q = f.query.trim().toLowerCase();
  const matchEntry = (e: PortEntry): boolean => {
    if (f.source !== "all" && e.source !== f.source) return false;
    if (f.category !== "all" && e.category !== f.category) return false;
    if (f.framework !== "all" && e.framework !== f.framework) return false;
    if (!q) return true;
    const hay = [
      String(e.port),
      e.groupLabel,
      e.processName,
      e.command,
      e.localUrl,
      e.framework,
      e.docker?.containerName,
      e.docker?.image,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };
  return scoped
    .map((g) => ({ ...g, entries: g.entries.filter(matchEntry) }))
    .filter((g) => g.entries.length > 0);
}

function duplicatePorts(entries: PortEntry[]): number[] {
  const counts = new Map<number, number>();
  for (const e of entries) counts.set(e.port, (counts.get(e.port) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1).map(([p]) => p);
}

function formatScannedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

export default function App() {
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    project: "all",
    source: "all",
    category: "all",
    framework: "all",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await fetchHealth();
      setOnline(ok);
      if (!ok) throw new Error("PortPilot agent is not reachable.");
      const scan = await fetchScan();
      setData(scan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scan");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projectOptions = useMemo(() => {
    if (!data?.groups.length) return [];
    return [...data.groups]
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
      .map((g) => ({ key: g.key, label: g.label }));
  }, [data]);

  useEffect(() => {
    if (!data || filters.project === "all") return;
    if (!data.groups.some((g) => g.key === filters.project)) {
      setFilters((prev) => ({ ...prev, project: "all" }));
    }
  }, [data, filters.project]);

  const filtered = useMemo(() => (data ? applyFilters(data.groups, filters) : []), [data, filters]);
  const conflicts = useMemo(() => (data ? duplicatePorts(data.entries) : []), [data]);
  const filtersActive =
    filters.query.trim() !== "" ||
    filters.project !== "all" ||
    filters.source !== "all" ||
    filters.category !== "all" ||
    filters.framework !== "all";

  function resetFilters(): void {
    setFilters({ query: "", project: "all", source: "all", category: "all", framework: "all" });
  }

  const statusLabel = online === null ? "Connecting" : online ? "Online" : "Offline";
  const statusTone =
    online === null
      ? "bg-zinc-500/10 text-zinc-300 ring-zinc-400/20"
      : online
        ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/30"
        : "bg-rose-400/10 text-rose-200 ring-rose-400/30";

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 lg:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-sky-200/90 shadow-bezel">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" />
            </span>
            Local dev radar
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
            PortPilot
          </h1>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-zinc-400">
            Every port you’re actually using on this machine, grouped by project — host processes, Docker containers, and Compose stacks in one premium view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-ink-900/60 px-3 py-2 shadow-bezel">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 ${statusTone}`}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  online === null ? "bg-zinc-400" : online ? "bg-emerald-300" : "bg-rose-300"
                } ${online ? "animate-pulse" : ""}`}
              />
              {statusLabel}
            </span>
            <span className="font-mono text-[11px] text-zinc-400">{agentBaseUrl().replace(/^https?:\/\//, "")}</span>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="group inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-gradient-to-b from-sky-400 to-sky-500 py-2 pl-4 pr-2 text-sm font-medium text-slate-950 shadow-[0_18px_40px_-18px_rgba(56,189,248,0.7)] transition-all duration-300 ease-spring hover:from-sky-300 hover:to-sky-400 active:scale-[0.97] disabled:opacity-60"
          >
            {loading ? "Scanning…" : "Refresh scan"}
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/15 transition-transform duration-300 ease-spring ${
                loading ? "animate-spinSlow" : "group-hover:rotate-180"
              }`}
            >
              <Refresh size={14} />
            </span>
          </button>
        </div>
      </header>

      <StatStrip data={data} />

      <Filters value={filters} onChange={setFilters} projects={projectOptions} />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-100 shadow-bezel">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-xs text-rose-200/70">
            Start the agent with <span className="font-mono">pnpm run dev:agent</span>, then refresh.
          </p>
        </div>
      ) : null}

      {conflicts.length ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-950/20 p-4 text-sm text-amber-100 shadow-bezel">
          <p className="font-semibold">Possible conflicts</p>
          <p className="mt-1 text-amber-100/80">
            Multiple rows share the same port: <span className="font-mono">{conflicts.join(", ")}</span>. Verify bindings manually.
          </p>
        </div>
      ) : null}

      {data?.meta.errors.length ? (
        <div className="rounded-2xl border border-amber-400/15 bg-ink-900/60 p-4 text-sm text-amber-100/90 shadow-bezel">
          <p className="font-semibold text-amber-200">Scan notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-50/80">
            {data.meta.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <main className="flex flex-col gap-5">
        {loading && !data ? <SkeletonGrid /> : null}

        {!loading && filtered.length === 0 && data ? (
          filtersActive ? (
            <EmptyState
              title="Nothing matches those filters"
              description="Try a different project or clear the search to see everything PortPilot detected on this machine."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-100 transition-all duration-300 ease-spring hover:bg-white/[0.08]"
                >
                  Reset filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No listening ports detected"
              description="Spin up a dev server, start a Docker container, or open the docker daemon, then refresh."
              hint="Tip — try `pnpm dev` in another project"
            />
          )
        ) : null}

        {filtered.map((g, i) => (
          <ProjectCard key={g.key} group={g} index={i} />
        ))}
      </main>

      {data ? (
        <footer className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-4 text-[11px] text-zinc-500">
          <span className="font-mono">
            scanned at <span className="text-zinc-300">{formatScannedAt(data.meta.scannedAt)}</span>
          </span>
          <span>
            {filtered.reduce((acc, g) => acc + g.entries.length, 0)} of {data.entries.length} services shown
          </span>
        </footer>
      ) : null}
    </div>
  );
}
