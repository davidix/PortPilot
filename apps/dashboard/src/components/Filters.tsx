import type { FrameworkGuess, PortSource, ServiceCategory } from "@portpilot/shared";
import { Apple, Cube, Layers, Search } from "./Icon.js";

export interface FilterState {
  query: string;
  /** `groupKey` from scan, or `"all"` */
  project: "all" | string;
  source: PortSource | "all";
  category: ServiceCategory | "all";
  framework: FrameworkGuess | "all";
}

export interface ProjectOption {
  key: string;
  label: string;
}

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Distinct projects from the latest scan (sorted by label). */
  projects: ProjectOption[];
}

const SELECT_BASE =
  "w-full appearance-none rounded-xl border border-white/[0.07] bg-ink-800/70 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all duration-300 ease-spring focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30";

const LABEL_BASE = "flex flex-col gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500";

const SOURCE_OPTIONS: { id: PortSource | "all"; label: string; icon?: React.ReactNode }[] = [
  { id: "all", label: "All", icon: <Layers size={14} /> },
  { id: "macos", label: "Host", icon: <Apple size={14} /> },
  { id: "docker", label: "Docker", icon: <Cube size={14} /> },
];

export function Filters({ value, onChange, projects }: Props) {
  return (
    <section className="rounded-3xl border border-white/5 bg-ink-900/60 p-1.5 shadow-bezel backdrop-blur-xl">
      <div className="flex flex-col gap-4 rounded-[1.35rem] border border-white/[0.04] bg-ink-800/40 p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <label className={`${LABEL_BASE} lg:col-span-7`}>
            Search
            <span className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={value.query}
                onChange={(e) => onChange({ ...value, query: e.target.value })}
                placeholder="Port, label, command, container, URL…"
                className="w-full rounded-xl border border-white/[0.07] bg-ink-800/70 py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 outline-none transition-all duration-300 ease-spring placeholder:text-zinc-600 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
              />
            </span>
          </label>

          <div className={`${LABEL_BASE} lg:col-span-5`}>
            Source
            <div
              role="group"
              aria-label="Source filter"
              className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-ink-800/70 p-1 text-sm"
            >
              {SOURCE_OPTIONS.map((opt) => {
                const active = value.source === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...value, source: opt.id })}
                    aria-pressed={active}
                    className={`group relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-300 ease-spring ${
                      active
                        ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100"
                    }`}
                  >
                    <span className={active ? "text-sky-300" : "text-zinc-500 group-hover:text-zinc-300"}>{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <label className={`${LABEL_BASE} lg:col-span-4`}>
            Project
            <select
              value={value.project}
              onChange={(e) => onChange({ ...value, project: e.target.value as FilterState["project"] })}
              className={SELECT_BASE}
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.key} value={p.key} title={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className={`${LABEL_BASE} lg:col-span-4`}>
            Category
            <select
              value={value.category}
              onChange={(e) => onChange({ ...value, category: e.target.value as FilterState["category"] })}
              className={SELECT_BASE}
            >
              <option value="all">All categories</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="database">Database</option>
              <option value="cache">Cache</option>
              <option value="proxy">Proxy</option>
              <option value="tooling">Tooling</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <label className={`${LABEL_BASE} lg:col-span-4`}>
            Framework
            <select
              value={value.framework}
              onChange={(e) => onChange({ ...value, framework: e.target.value as FilterState["framework"] })}
              className={SELECT_BASE}
            >
              <option value="all">All frameworks</option>
              <option>Next.js</option>
              <option>React</option>
              <option>Vite</option>
              <option>Vue</option>
              <option>Node.js</option>
              <option>Express</option>
              <option>NestJS</option>
              <option>Laravel</option>
              <option>Django</option>
              <option>Flask</option>
              <option>PostgreSQL</option>
              <option>MySQL</option>
              <option>Redis</option>
              <option>MongoDB</option>
              <option>Nginx</option>
              <option>Unknown</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
