import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface LsofListenRow {
  pid: number;
  command: string;
  bind?: string;
  port: number;
}

/**
 * Parse `lsof -F pcn` lines for TCP listeners (-iTCP -sTCP:LISTEN applied via argv).
 * Each `n` field uses forms like `*:3000`, `127.0.0.1:3000`, `[::]:8080`.
 */
export function parseLsofFields(stdout: string): LsofListenRow[] {
  let pid: number | undefined;
  let command: string | undefined;
  const rows: LsofListenRow[] = [];

  const flushPort = (nField: string) => {
    if (pid === undefined || !command) return;
    const parsed = parseNField(nField);
    if (!parsed) return;
    rows.push({ pid, command, bind: parsed.bind, port: parsed.port });
  };

  for (const line of stdout.split("\n")) {
    if (!line) continue;
    const kind = line[0];
    const value = line.slice(1);
    if (kind === "p") {
      pid = Number.parseInt(value, 10);
      if (Number.isNaN(pid)) pid = undefined;
    } else if (kind === "c") {
      command = value;
    } else if (kind === "n") {
      flushPort(value);
    }
  }

  return dedupeRows(rows);
}

function parseNField(n: string): { bind?: string; port: number } | null {
  // Examples: *:3000, 127.0.0.1:3000, [::]:8080, [fe80::1]:53
  if (n.includes("->")) return null;
  const lastColon = n.lastIndexOf(":");
  if (lastColon === -1) return null;
  const hostPart = n.slice(0, lastColon);
  const portPart = n.slice(lastColon + 1);
  const port = Number.parseInt(portPart, 10);
  if (Number.isNaN(port) || port <= 0) return null;

  let bind: string | undefined;
  if (hostPart === "*" || hostPart === "") bind = "0.0.0.0";
  else if (hostPart === "[::]") bind = "::";
  else bind = hostPart.replace(/^\[|\]$/g, "");

  return { bind, port };
}

function rowKey(r: LsofListenRow): string {
  return `${r.pid}:${r.bind ?? "*"}:${r.port}`;
}

function dedupeRows(rows: LsofListenRow[]): LsofListenRow[] {
  const map = new Map<string, LsofListenRow>();
  for (const r of rows) map.set(rowKey(r), r);
  return [...map.values()];
}

export async function scanListeningPortsWithLsof(): Promise<{
  rows: LsofListenRow[];
  error?: string;
}> {
  try {
    const { stdout } = await execFileAsync("lsof", [
      "-nP",
      "-iTCP",
      "-sTCP:LISTEN",
      "-F",
      "pcn",
    ]);
    return { rows: parseLsofFields(stdout) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], error: `lsof failed: ${message}` };
  }
}
