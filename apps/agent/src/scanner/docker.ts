import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface DockerPortBinding {
  hostIp: string;
  hostPort: number;
  containerPort: number;
  protocol: string;
}

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  composeProject?: string;
  composeWorkingDir?: string;
  ports: DockerPortBinding[];
}

interface InspectPortEntry {
  HostIp?: string;
  HostPort?: string;
}

function parseInspectArray(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const data = JSON.parse(trimmed) as unknown;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Map docker NetworkSettings.Ports to host bindings (non-empty HostPort only).
 */
function bindingsFromPorts(
  portsObj: Record<string, InspectPortEntry[] | null> | undefined,
): DockerPortBinding[] {
  if (!portsObj) return [];
  const out: DockerPortBinding[] = [];
  for (const [containerKey, entries] of Object.entries(portsObj)) {
    if (!entries?.length) continue;
    const protoMatch = containerKey.match(/^(\d+)\/(tcp|udp)$/i);
    const containerPort = protoMatch ? Number.parseInt(protoMatch[1], 10) : NaN;
    const protocol = (protoMatch?.[2] ?? "tcp").toLowerCase();
    if (Number.isNaN(containerPort)) continue;
    for (const e of entries) {
      const hp = e.HostPort ? Number.parseInt(e.HostPort, 10) : NaN;
      if (Number.isNaN(hp)) continue;
      out.push({
        hostIp: e.HostIp === "" || e.HostIp === "::" ? "0.0.0.0" : e.HostIp ?? "0.0.0.0",
        hostPort: hp,
        containerPort,
        protocol,
      });
    }
  }
  return dedupeBindings(out);
}

function dedupeBindings(b: DockerPortBinding[]): DockerPortBinding[] {
  // Same host port may appear for IPv4 and IPv6 listeners — collapse to one row for the dashboard.
  const key = (x: DockerPortBinding) => `${x.hostPort}/${x.protocol}`;
  const m = new Map<string, DockerPortBinding>();
  for (const x of b) {
    if (!m.has(key(x))) m.set(key(x), x);
  }
  return [...m.values()];
}

function containerFromInspect(obj: Record<string, unknown>): DockerContainerInfo | null {
  const id = typeof obj.Id === "string" ? obj.Id : "";
  if (!id) return null;
  const nameRaw = Array.isArray(obj.Names) && typeof obj.Names[0] === "string" ? obj.Names[0] : "";
  const name = nameRaw.replace(/^\//, "");
  const config =
    typeof obj.Config === "object" && obj.Config !== null ? (obj.Config as { Image?: string; Labels?: Record<string, string> }) : undefined;
  const image = config?.Image ?? (typeof obj.Image === "string" ? obj.Image : "unknown");
  const labels = config?.Labels;

  const ns = typeof obj.NetworkSettings === "object" && obj.NetworkSettings !== null ? (obj.NetworkSettings as Record<string, unknown>) : {};
  const portsObj = ns.Ports as Record<string, InspectPortEntry[] | null> | undefined;

  const composeProject = labels?.["com.docker.compose.project"];
  const composeWorkingDir = labels?.["com.docker.compose.project.working_dir"];

  return {
    id,
    name,
    image,
    composeProject: composeProject || undefined,
    composeWorkingDir: composeWorkingDir || undefined,
    ports: bindingsFromPorts(portsObj),
  };
}

/**
 * Lists running containers with published ports via `docker inspect` (no shell, argv only).
 */
export async function scanDockerContainers(): Promise<{
  containers: DockerContainerInfo[];
  error?: string;
}> {
  try {
    const { stdout: idOut } = await execFileAsync("docker", ["ps", "-q"], { maxBuffer: 10 * 1024 * 1024 });
    const ids = idOut
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return { containers: [] };

    const { stdout } = await execFileAsync("docker", ["inspect", ...ids], { maxBuffer: 20 * 1024 * 1024 });
    const arr = parseInspectArray(stdout);
    const containers: DockerContainerInfo[] = [];
    for (const item of arr) {
      if (typeof item !== "object" || item === null) continue;
      const c = containerFromInspect(item as Record<string, unknown>);
      if (c) containers.push(c);
    }
    return { containers };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/Cannot connect to the Docker daemon/i.test(message)) {
      return { containers: [], error: "Docker is not running or not reachable." };
    }
    if (/command not found|No such file or directory/i.test(message)) {
      return { containers: [], error: "Docker CLI not installed or not on PATH." };
    }
    return { containers: [], error: `Docker scan failed: ${message}` };
  }
}
