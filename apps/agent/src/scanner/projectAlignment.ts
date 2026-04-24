import type { PortEntry } from "@portpilot/shared";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DockerContainerInfo } from "./docker.js";

function normalizePath(p: string): string {
  const s = p.replace(/\\/g, "/").replace(/\/+$/, "");
  return s || "/";
}

/**
 * Collect Compose project → distinct working directories from running containers.
 * Labels like `com.docker.compose.project.working_dir` map host processes under that tree to the same card as containers.
 */
function composeProjectRoots(containers: DockerContainerInfo[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of containers) {
    if (!c.composeProject || !c.composeWorkingDir) continue;
    const dir = normalizePath(c.composeWorkingDir);
    let set = map.get(c.composeProject);
    if (!set) {
      set = new Set();
      map.set(c.composeProject, set);
    }
    set.add(dir);
  }
  return map;
}

/**
 * When a macOS listener's cwd or nearest `package.json` folder sits under a Compose
 * working directory (or the compose project name appears as a path segment),
 * merge it into the same `compose:<project>` group as Docker services for that stack.
 *
 * Longest directory prefix wins so nested compose layouts resolve to the innermost match.
 */
export function alignMacosGroupsWithComposeProjects(entries: PortEntry[], containers: DockerContainerInfo[]): void {
  const projectRoots = composeProjectRoots(containers);
  if (projectRoots.size === 0) return;

  function longestPrefixHit(paths: (string | undefined)[]): { project: string; rootLen: number } | null {
    let best: { project: string; rootLen: number } | null = null;
    for (const raw of paths) {
      if (!raw) continue;
      const norm = normalizePath(raw);
      for (const [project, roots] of projectRoots) {
        for (const root of roots) {
          if (norm === root || norm.startsWith(`${root}/`)) {
            const len = root.length;
            if (!best || len > best.rootLen) best = { project, rootLen: len };
          }
        }
      }
    }
    return best;
  }

  /** If labels omit working_dir, still tie `.../lead-dist-platform/frontend` → project `lead-dist-platform`. */
  function segmentHit(paths: (string | undefined)[]): { project: string } | null {
    const projects = [...projectRoots.keys()];
    for (const raw of paths) {
      if (!raw) continue;
      const segments = normalizePath(raw).split("/").filter(Boolean);
      const hits = projects.filter((p) => segments.includes(p));
      if (hits.length === 0) continue;
      if (hits.length === 1) return { project: hits[0]! };
      hits.sort((a, b) => b.length - a.length);
      return { project: hits[0]! };
    }
    return null;
  }

  for (const e of entries) {
    if (e.source !== "macos") continue;
    const paths = [e.packageRoot, e.workingDirectory];
    const prefix = longestPrefixHit(paths);
    if (prefix) {
      e.groupKey = `compose:${prefix.project}`;
      e.groupLabel = prefix.project;
      continue;
    }
    const seg = segmentHit(paths);
    if (seg) {
      e.groupKey = `compose:${seg.project}`;
      e.groupLabel = seg.project;
    }
  }
}

const repoRootCache = new Map<string, string | undefined>();

/**
 * Walk upward from a path until a `docker-compose.yml` / `compose.yaml` is found, and group there.
 * Merges sibling packages (e.g. `frontend` + `backend`) into one card when Docker isn't running but the repo layout matches Compose.
 */
function repoRootContainingComposeFile(startPath: string): string | undefined {
  const norm = normalizePath(startPath);
  if (repoRootCache.has(norm)) return repoRootCache.get(norm);
  let dir = norm;
  let found: string | undefined;
  for (let i = 0; i < 16; i++) {
    if (existsSync(join(dir, "docker-compose.yml")) || existsSync(join(dir, "compose.yaml"))) {
      found = dir;
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  repoRootCache.set(norm, found);
  return found;
}

/**
 * Collapse `pkg:` / `cwd:` macOS groups that live under the same Compose-style repo root.
 * Runs after {@link alignMacosGroupsWithComposeProjects} so compose-backed stacks stay on `compose:*` keys.
 */
export function alignMacosGroupsToLocalComposeFileRoot(entries: PortEntry[]): void {
  repoRootCache.clear();
  for (const e of entries) {
    if (e.source !== "macos") continue;
    if (e.groupKey.startsWith("compose:")) continue;
    const start = e.packageRoot ?? e.workingDirectory;
    if (!start) continue;
    const root = repoRootContainingComposeFile(start);
    if (!root) continue;
    const label = root.split("/").filter(Boolean).pop() ?? root;
    e.groupKey = `repo:${root}`;
    e.groupLabel = label;
  }
}

/**
 * If macOS rows landed on `repo:*` but the path matches a live Compose working directory (or basename matches the
 * compose project id), normalize to `compose:*` so Docker + host listeners share one card.
 */
export function coalesceRepoGroupsWithComposeLabels(entries: PortEntry[], containers: DockerContainerInfo[]): void {
  const projectRoots = composeProjectRoots(containers);
  if (projectRoots.size === 0) return;

  for (const e of entries) {
    if (!e.groupKey.startsWith("repo:")) continue;
    const norm = normalizePath(e.groupKey.slice("repo:".length));

    let hit: string | null = null;
    for (const [project, dirs] of projectRoots) {
      for (const d of dirs) {
        const dn = normalizePath(d);
        if (norm === dn || norm.startsWith(`${dn}/`)) {
          hit = project;
          break;
        }
      }
      if (hit) break;
    }
    if (hit) {
      e.groupKey = `compose:${hit}`;
      e.groupLabel = hit;
      continue;
    }

    const base = norm.split("/").filter(Boolean).pop();
    if (base && projectRoots.has(base)) {
      e.groupKey = `compose:${base}`;
      e.groupLabel = base;
    }
  }
}
