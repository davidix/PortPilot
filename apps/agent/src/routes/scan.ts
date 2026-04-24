import type { PortEntry, ScanResult } from "@portpilot/shared";
import type { FastifyInstance } from "fastify";
import {
  buildLocalUrl,
  classifyDockerImage,
  classifyHostProcess,
  clearProcessCaches,
  dockerGroupKey,
  hostGroupFromHints,
} from "../scanner/classifier.js";
import { scanDockerContainers } from "../scanner/docker.js";
import { groupPortEntries } from "../scanner/grouping.js";
import {
  alignMacosGroupsToLocalComposeFileRoot,
  alignMacosGroupsWithComposeProjects,
  coalesceRepoGroupsWithComposeLabels,
} from "../scanner/projectAlignment.js";
import { scanListeningPortsWithLsof } from "../scanner/ports.js";

function portDedupeKey(protocol: "tcp" | "udp", port: number): string {
  return `${protocol}:${port}`;
}

export async function runFullScan(): Promise<ScanResult> {
  const errors: string[] = [];
  clearProcessCaches();

  const [{ containers, error: dockerError }, { rows, error: lsofError }] = await Promise.all([
    scanDockerContainers(),
    scanListeningPortsWithLsof(),
  ]);

  if (dockerError) errors.push(dockerError);
  if (lsofError) errors.push(lsofError);

  const entries: PortEntry[] = [];
  const claimedHostPorts = new Map<string, PortEntry>();

  // 1) Docker published ports (preferred source of truth for host port mapping)
  for (const c of containers) {
    const { key, label } = dockerGroupKey(c);
    const { framework, category } = classifyDockerImage(c.image);
    for (const p of c.ports) {
      if (p.protocol !== "tcp") continue; // MVP: focus on TCP for URLs
      const bind = p.hostIp === "0.0.0.0" || p.hostIp === "::" ? "0.0.0.0" : p.hostIp;
      const localUrl = buildLocalUrl(p.hostPort, bind);
      const entry: PortEntry = {
        port: p.hostPort,
        protocol: "tcp",
        framework,
        category,
        source: "docker",
        groupKey: key,
        groupLabel: label,
        localUrl,
        bindAddress: bind,
        processName: c.name || c.image,
        command: c.image,
        workingDirectory: c.composeWorkingDir,
        packageRoot: c.composeWorkingDir,
        docker: {
          containerId: c.id,
          containerName: c.name,
          image: c.image,
          composeProject: c.composeProject,
          publishPairs: [`${p.hostPort}->${p.containerPort}/${p.protocol}`],
        },
      };
      entries.push(entry);
      claimedHostPorts.set(portDedupeKey("tcp", p.hostPort), entry);
    }
  }

  // 2) Host processes via lsof — skip TCP ports already attributed to Docker mappings
  for (const row of rows) {
    const k = portDedupeKey("tcp", row.port);
    if (claimedHostPorts.has(k)) continue;

    const meta = await classifyHostProcess({ pid: row.pid, processName: row.command });
    const { key, label } = hostGroupFromHints({
      cwd: meta.cwd,
      packageRoot: meta.packageRoot,
      command: meta.command,
      processName: row.command,
    });

    const entry: PortEntry = {
      port: row.port,
      protocol: "tcp",
      pid: row.pid,
      processName: row.command,
      command: meta.command,
      workingDirectory: meta.cwd,
      packageRoot: meta.packageRoot,
      framework: meta.framework,
      category: meta.category,
      source: "macos",
      groupKey: key,
      groupLabel: label,
      localUrl: buildLocalUrl(row.port, row.bind),
      bindAddress: row.bind,
    };
    entries.push(entry);
  }

  // Merge host processes into the same card as sibling Docker Compose services when paths line up.
  alignMacosGroupsWithComposeProjects(entries, containers);
  // When Docker is unavailable, still merge sibling packages under the same repo compose file root.
  alignMacosGroupsToLocalComposeFileRoot(entries);
  coalesceRepoGroupsWithComposeLabels(entries, containers);

  entries.sort((a, b) => a.port - b.port || a.groupLabel.localeCompare(b.groupLabel));

  return {
    meta: {
      scannedAt: new Date().toISOString(),
      host: "127.0.0.1",
      errors,
    },
    groups: groupPortEntries(entries),
    entries,
  };
}

export function registerScanRoutes(app: FastifyInstance): void {
  app.get("/api/scan", async () => runFullScan());
}
