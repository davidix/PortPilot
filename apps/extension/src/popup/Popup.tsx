import type { GroupedPorts, PortEntry, ScanResult } from "@portpilot/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Apple,
  ArrowUpRight,
  Check,
  Chevron,
  Copy,
  Cube,
  ExternalLink,
  Folder,
  Layers,
  Pulse,
  Refresh,
  Search,
  Sparkle,
} from "./icons.js";

const AGENT = "http://127.0.0.1:7878";
const DASHBOARD = "http://localhost:5173";

type SourceFilter = "all" | "macos" | "docker";

interface GroupKindMeta {
  kind: "compose" | "repo" | "package" | "cwd" | "docker" | "process";
  label: string;
  detail?: string;
}

function decodeGroupKey(key: string): GroupKindMeta {
  if (key.startsWith("compose:")) return { kind: "compose", label: "Compose", detail: key.slice(8) };
  if (key.startsWith("repo:")) return { kind: "repo", label: "Repo", detail: key.slice(5) };
  if (key.startsWith("pkg:")) return { kind: "package", label: "Package", detail: key.slice(4) };
  if (key.startsWith("cwd:")) return { kind: "cwd", label: "CWD", detail: key.slice(4) };
  if (key.startsWith("docker:")) return { kind: "docker", label: "Docker", detail: key.slice(7) };
  return { kind: "process", label: "Process", detail: key };
}

function shortenPath(p?: string, segments = 3): string | undefined {
  if (!p) return undefined;
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= segments) return p;
  return "…/" + parts.slice(-segments).join("/");
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function applyFilters(groups: GroupedPorts[], query: string, source: SourceFilter): GroupedPorts[] {
  const q = query.trim().toLowerCase();
  return groups
    .map((g) => ({
      ...g,
      entries: g.entries.filter((e) => {
        if (source !== "all" && e.source !== source) return false;
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
      }),
    }))
    .filter((g) => g.entries.length > 0);
}

function GroupKindBadge({ meta }: { meta: GroupKindMeta }) {
  const Icon =
    meta.kind === "compose" || meta.kind === "docker"
      ? Cube
      : meta.kind === "repo"
        ? Layers
        : Folder;
  return (
    <span className={`group-kind kind-${meta.kind}`}>
      <Icon size={10} />
      {meta.label}
    </span>
  );
}

function PortTile({ entry }: { entry: PortEntry }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(entry.localUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      // ignore
    }
  }

  function open(): void {
    chrome.tabs?.create
      ? chrome.tabs.create({ url: entry.localUrl })
      : window.open(entry.localUrl, "_blank", "noopener,noreferrer");
  }

  const sub = [
    entry.processName,
    entry.docker?.containerName,
    shortenPath(entry.workingDirectory ?? entry.packageRoot),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="tile">
      <span className="port-chip" title={`${entry.localUrl}`}>:{entry.port}</span>
      <div className="tile-meta">
        <div className="chips">
          <span className="chip chip-framework">{entry.framework}</span>
          <span className="chip chip-cat">{entry.category}</span>
          <span className={`chip ${entry.source === "docker" ? "chip-source-docker" : "chip-source-host"}`}>
            {entry.source === "docker" ? "docker" : "host"}
          </span>
        </div>
        {sub ? (
          <span className="tile-sub" title={entry.workingDirectory ?? entry.packageRoot}>
            {sub}
          </span>
        ) : null}
      </div>
      <div className="tile-actions">
        <button type="button" className="btn-open" onClick={open} title="Open in new tab">
          Open
          <span className="arrow">
            <ArrowUpRight size={11} />
          </span>
        </button>
        <button
          type="button"
          className={`btn-copy ${copied ? "copied" : ""}`}
          onClick={() => void copy()}
          title={copied ? "Copied" : "Copy URL"}
          aria-label={copied ? "Copied" : "Copy URL"}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

function ProjectGroup({ group, defaultOpen }: { group: GroupedPorts; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = decodeGroupKey(group.key);
  const svcLabel = group.entries.length === 1 ? "service" : "services";
  return (
    <section
      className={`group rise ${open ? "open" : ""}`}
      data-kind={meta.kind}
      aria-label={`${group.label}, ${group.entries.length} ${svcLabel}`}
    >
      <button
        type="button"
        className="group-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="group-head-body">
          <div className="group-head-row">
            <GroupKindBadge meta={meta} />
            <span className="count-pill">
              <span className="n">{group.entries.length}</span> {svcLabel}
            </span>
          </div>
          <span className="group-title" title={meta.detail ?? group.key}>
            {group.label}
          </span>
        </div>
        <span className="chevron" aria-hidden>
          <Chevron size={14} />
        </span>
      </button>
      {open ? (
        <div className="tiles">
          {group.entries.map((e, idx) => (
            <PortTile key={`${e.port}-${e.source}-${idx}`} entry={e} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatStrip({ data }: { data: ScanResult | null }) {
  const stats = useMemo(() => {
    if (!data) {
      return [
        { label: "Services", value: "—", tone: "stat-tone-sky" },
        { label: "Projects", value: "—", tone: "stat-tone-fuchsia" },
        { label: "Docker", value: "—", tone: "stat-tone-emerald" },
        { label: "Host", value: "—", tone: "stat-tone-amber" },
      ];
    }
    const docker = data.entries.filter((e) => e.source === "docker").length;
    const host = data.entries.length - docker;
    return [
      { label: "Services", value: data.entries.length, tone: "stat-tone-sky" },
      { label: "Projects", value: data.groups.length, tone: "stat-tone-fuchsia" },
      { label: "Docker", value: docker, tone: "stat-tone-emerald" },
      { label: "Host", value: host, tone: "stat-tone-amber" },
    ];
  }, [data]);
  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.label} className={`stat ${s.tone}`}>
          <span className="stat-label">{s.label}</span>
          <span className="stat-value tabular">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Popup() {
  const [data, setData] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${AGENT}/api/scan`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ScanResult;
      setData(json);
      chrome.runtime?.sendMessage?.({ type: "REFRESH_BADGE" });
    } catch {
      setData(null);
      setError("PortPilot agent is offline.");
      chrome.runtime?.sendMessage?.({ type: "REFRESH_BADGE" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => (data ? applyFilters(data.groups, query, source) : []), [data, query, source]);
  const visibleCount = filtered.reduce((acc, g) => acc + g.entries.length, 0);
  const isOnline = !error && !loading && data !== null;
  const isFiltering = query.trim() !== "" || source !== "all";

  function openDashboard(): void {
    if (chrome.tabs?.create) chrome.tabs.create({ url: DASHBOARD });
    else window.open(DASHBOARD, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app">
      <div className="brand-row">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Pulse size={14} />
          </div>
          <div className="brand-text">
            <span className="brand-eyebrow">Local dev radar</span>
            <span className="brand-title">PortPilot</span>
          </div>
        </div>
        <button
          type="button"
          className={`icon-btn ${loading ? "spinning" : ""}`}
          onClick={() => void load()}
          aria-label="Refresh scan"
          title="Refresh scan"
        >
          <Refresh size={14} />
        </button>
      </div>

      <div className="status-row">
        <span
          className={`status-pill ${
            loading ? "status-loading" : isOnline ? "status-online" : "status-offline"
          }`}
        >
          <span className="dot" />
          {loading ? "Scanning" : isOnline ? "Online" : "Offline"}
        </span>
        <span className="status-host">{AGENT.replace(/^https?:\/\//, "")}</span>
      </div>

      <StatStrip data={data} />

      <div className="controls">
        <label className="search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search port, project, image…"
            autoFocus
          />
        </label>
        <div className="segment" role="group" aria-label="Filter by source">
          <button
            type="button"
            aria-pressed={source === "all"}
            onClick={() => setSource("all")}
          >
            <Layers className="seg-icon" size={12} /> All
          </button>
          <button
            type="button"
            aria-pressed={source === "macos"}
            onClick={() => setSource("macos")}
          >
            <Apple className="seg-icon" size={12} /> Host
          </button>
          <button
            type="button"
            aria-pressed={source === "docker"}
            onClick={() => setSource("docker")}
          >
            <Cube className="seg-icon" size={12} /> Docker
          </button>
        </div>
      </div>

      {error ? (
        <div className="banner banner-error">
          <div className="banner-title">{error}</div>
          <div className="banner-hint">Start the agent: pnpm run dev:agent</div>
        </div>
      ) : null}

      <div className="groups-shell">
        {!loading && data && filtered.length > 0 ? (
          <header className="groups-shell-header">
            <span className="groups-shell-title">Projects</span>
            <span className="groups-shell-meta tabular">
              {filtered.length} {filtered.length === 1 ? "group" : "groups"} · {visibleCount}{" "}
              {visibleCount === 1 ? "service" : "services"}
            </span>
          </header>
        ) : null}
        <div
          className="groups"
          role="region"
          aria-label={
            !loading && data && filtered.length > 0 ? "Project groups and ports" : "Scan results"
          }
        >
          {loading && !data
            ? [0, 1, 2].map((i) => <div key={i} className="skeleton-row" />)
            : null}

          {!loading && data && filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">
                <Sparkle size={16} />
              </span>
              <h3>{isFiltering ? "Nothing matches that search" : "No listening services"}</h3>
              <p>
                {isFiltering
                  ? "Clear the search or switch source to see everything PortPilot detected."
                  : "Start a dev server or Docker container, then refresh."}
              </p>
            </div>
          ) : null}

          {filtered.map((g) => (
            <ProjectGroup key={g.key} group={g} defaultOpen={filtered.length <= 3 || isFiltering} />
          ))}
        </div>
      </div>

      <div className="footer">
        <span className="scanned">
          {data ? `scanned ${formatTime(data.meta.scannedAt)} · ${visibleCount}/${data.entries.length}` : "—"}
        </span>
        <a href="#" onClick={(e) => { e.preventDefault(); openDashboard(); }}>
          Open dashboard
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
