import type { ScanResult } from "@portpilot/shared";

const base = import.meta.env.VITE_AGENT_URL ?? "http://127.0.0.1:7878";

export async function fetchScan(): Promise<ScanResult> {
  const res = await fetch(`${base}/api/scan`);
  if (!res.ok) throw new Error(`Scan failed (${res.status})`);
  return (await res.json()) as ScanResult;
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

export function agentBaseUrl(): string {
  return base;
}
