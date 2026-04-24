import type { PortEntry } from "@portpilot/shared";
import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "./Icon.js";
import { categoryTone, frameworkTone, sourceTone } from "../lib/groupMeta.js";

interface Props {
  entry: PortEntry;
}

function shortenPath(p?: string, segments = 3): string | undefined {
  if (!p) return undefined;
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= segments) return p;
  return "…/" + parts.slice(-segments).join("/");
}

function shortenCommand(c?: string): string | undefined {
  if (!c) return undefined;
  return c.length > 96 ? `${c.slice(0, 93)}…` : c;
}

export function PortTile({ entry }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(entry.localUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const meta: string[] = [];
  if (entry.pid) meta.push(`pid ${entry.pid}`);
  if (entry.docker?.containerName) meta.push(entry.docker.containerName);
  if (entry.docker?.image) meta.push(entry.docker.image);
  const command = shortenCommand(entry.command);
  const path = shortenPath(entry.workingDirectory ?? entry.packageRoot);

  return (
    <div className="group relative grid grid-cols-1 gap-3 rounded-xl border border-transparent px-3 py-3 transition-all duration-300 ease-spring hover:border-white/[0.06] hover:bg-white/[0.025] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4">
      <div className="flex items-center gap-3">
        <span className="tabular w-[88px] rounded-lg bg-ink-950/60 px-3 py-1.5 text-center font-mono text-base font-semibold text-sky-200 ring-1 ring-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          :{entry.port}
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 sm:inline">
          {entry.protocol}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${frameworkTone(entry.framework)}`}>
            {entry.framework}
          </span>
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${categoryTone(entry.category)}`}>
            {entry.category}
          </span>
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${sourceTone(entry.source)}`}>
            {entry.source === "macos" ? "host" : "docker"}
          </span>
          {entry.processName ? (
            <span className="truncate font-mono text-[11px] text-zinc-400">{entry.processName}</span>
          ) : null}
        </div>
        {(command || path || meta.length > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
            {meta.length > 0 ? <span className="font-mono text-zinc-500">{meta.join(" · ")}</span> : null}
            {command ? <span className="truncate font-mono text-zinc-500" title={entry.command}>{command}</span> : null}
            {path ? <span className="truncate font-mono text-zinc-600" title={entry.workingDirectory ?? entry.packageRoot}>{path}</span> : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <a
          href={entry.localUrl}
          target="_blank"
          rel="noreferrer"
          className="group/btn inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-3.5 pr-1.5 text-xs font-medium text-zinc-100 transition-all duration-300 ease-spring hover:border-sky-300/40 hover:bg-white/[0.07] hover:text-white active:scale-[0.97]"
        >
          <span className="tabular font-mono text-[11px] text-sky-200/90">{entry.localUrl.replace(/^https?:\/\//, "")}</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-sky-200 transition-transform duration-300 ease-spring group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 group-hover/btn:bg-sky-400/20">
            <ArrowUpRight size={13} />
          </span>
        </a>
        <button
          type="button"
          onClick={() => void copyUrl()}
          aria-label={copied ? "Copied" : "Copy URL"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 ease-spring hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.95]"
        >
          {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
