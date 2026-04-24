import type { FrameworkGuess, ServiceCategory } from "@portpilot/shared";

/** Extract a normalized signal about how a group was inferred from its agent `groupKey`. */
export function decodeGroupKey(key: string): { kind: "compose" | "repo" | "package" | "cwd" | "docker" | "process"; detail?: string; label: string } {
  if (key.startsWith("compose:")) return { kind: "compose", detail: key.slice(8), label: "Compose" };
  if (key.startsWith("repo:")) return { kind: "repo", detail: key.slice(5), label: "Repo" };
  if (key.startsWith("pkg:")) return { kind: "package", detail: key.slice(4), label: "Package" };
  if (key.startsWith("cwd:")) return { kind: "cwd", detail: key.slice(4), label: "CWD" };
  if (key.startsWith("docker:")) return { kind: "docker", detail: key.slice(7), label: "Docker" };
  return { kind: "process", detail: key, label: "Process" };
}

/** Tinted utility classes for source pills and chips. */
export function sourceTone(source: "macos" | "docker"): string {
  return source === "docker"
    ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/25"
    : "bg-sky-400/10 text-sky-100 ring-1 ring-sky-400/25";
}

const CATEGORY_TONE: Record<ServiceCategory, string> = {
  frontend: "bg-fuchsia-400/10 text-fuchsia-200 ring-1 ring-fuchsia-400/25",
  backend: "bg-amber-400/10 text-amber-100 ring-1 ring-amber-400/25",
  database: "bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-400/25",
  cache: "bg-rose-400/10 text-rose-100 ring-1 ring-rose-400/25",
  proxy: "bg-cyan-400/10 text-cyan-100 ring-1 ring-cyan-400/25",
  tooling: "bg-violet-400/10 text-violet-100 ring-1 ring-violet-400/25",
  unknown: "bg-zinc-400/10 text-zinc-200 ring-1 ring-zinc-400/15",
};

export function categoryTone(c: ServiceCategory): string {
  return CATEGORY_TONE[c];
}

const FRAMEWORK_TONE: Record<FrameworkGuess, string> = {
  "Next.js": "text-zinc-100 bg-white/[0.06] ring-1 ring-white/10",
  React: "text-cyan-100 bg-cyan-400/10 ring-1 ring-cyan-400/20",
  Vite: "text-amber-100 bg-amber-400/10 ring-1 ring-amber-400/25",
  Vue: "text-emerald-100 bg-emerald-400/10 ring-1 ring-emerald-400/25",
  "Node.js": "text-emerald-100 bg-emerald-400/10 ring-1 ring-emerald-400/20",
  Express: "text-emerald-100 bg-emerald-400/10 ring-1 ring-emerald-400/20",
  NestJS: "text-rose-100 bg-rose-400/10 ring-1 ring-rose-400/25",
  Laravel: "text-rose-100 bg-rose-400/10 ring-1 ring-rose-400/25",
  Django: "text-emerald-100 bg-emerald-400/10 ring-1 ring-emerald-400/25",
  Flask: "text-zinc-100 bg-zinc-400/10 ring-1 ring-zinc-400/20",
  PostgreSQL: "text-sky-100 bg-sky-400/10 ring-1 ring-sky-400/25",
  MySQL: "text-sky-100 bg-sky-400/10 ring-1 ring-sky-400/25",
  Redis: "text-rose-100 bg-rose-400/10 ring-1 ring-rose-400/25",
  MongoDB: "text-emerald-100 bg-emerald-400/10 ring-1 ring-emerald-400/25",
  Nginx: "text-cyan-100 bg-cyan-400/10 ring-1 ring-cyan-400/25",
  Unknown: "text-zinc-300 bg-zinc-500/10 ring-1 ring-zinc-400/15",
};

export function frameworkTone(f: FrameworkGuess): string {
  return FRAMEWORK_TONE[f];
}
