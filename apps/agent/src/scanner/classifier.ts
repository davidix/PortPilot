import { classifyService } from "@portpilot/shared";
import type { FrameworkGuess, ServiceCategory } from "@portpilot/shared";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { nearestPackageJson } from "./projectHints.js";

const execFileAsync = promisify(execFile);

const cwdCache = new Map<number, string | undefined>();

export async function resolveProcessCwd(pid: number): Promise<string | undefined> {
  if (cwdCache.has(pid)) return cwdCache.get(pid);
  try {
    const { stdout } = await execFileAsync("lsof", ["-a", `-p`, String(pid), "-d", "cwd", "-Fn"], {
      maxBuffer: 1024 * 1024,
    });
    let cwd: string | undefined;
    for (const line of stdout.split("\n")) {
      if (line.startsWith("n")) {
        cwd = line.slice(1);
        break;
      }
    }
    cwdCache.set(pid, cwd);
    return cwd;
  } catch {
    cwdCache.set(pid, undefined);
    return undefined;
  }
}

const cmdCache = new Map<number, string | undefined>();

export async function resolveProcessCommand(pid: number): Promise<string | undefined> {
  if (cmdCache.has(pid)) return cmdCache.get(pid);
  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "args="], { maxBuffer: 1024 * 1024 });
    const cmd = stdout.trim() || undefined;
    cmdCache.set(pid, cmd);
    return cmd;
  } catch {
    cmdCache.set(pid, undefined);
    return undefined;
  }
}

export function clearProcessCaches(): void {
  cwdCache.clear();
  cmdCache.clear();
}

export async function classifyHostProcess(input: {
  pid: number;
  processName: string;
}): Promise<{ framework: FrameworkGuess; category: ServiceCategory; cwd?: string; command?: string; packageRoot?: string; pkgName?: string; scriptsBlob?: string }> {
  const [cwd, command] = await Promise.all([resolveProcessCwd(input.pid), resolveProcessCommand(input.pid)]);
  const hints = nearestPackageJson(cwd);
  const { framework, category } = classifyService({
    processName: input.processName,
    command,
    cwd,
    packageJsonName: hints.name,
    packageJsonScripts: hints.scriptsBlob,
  });
  return {
    framework,
    category,
    cwd,
    command,
    packageRoot: hints.packageRoot,
    pkgName: hints.name,
    scriptsBlob: hints.scriptsBlob,
  };
}

/** Build group key/label for a host process row */
export function hostGroupFromHints(input: { cwd?: string; packageRoot?: string; command?: string; processName: string }): {
  key: string;
  label: string;
} {
  if (input.packageRoot) {
    const label = input.packageRoot.split("/").filter(Boolean).pop() ?? input.packageRoot;
    return { key: `pkg:${input.packageRoot}`, label };
  }
  if (input.cwd) {
    const label = input.cwd.split("/").filter(Boolean).pop() ?? input.cwd;
    return { key: `cwd:${input.cwd}`, label };
  }
  return { key: `proc:${input.processName}`, label: input.processName };
}

export function buildLocalUrl(port: number, bind?: string): string {
  if (bind && (bind === "::" || bind === "0.0.0.0" || bind === "*")) return `http://localhost:${port}`;
  if (bind === "127.0.0.1" || bind === "::1" || bind === "localhost") return `http://127.0.0.1:${port}`;
  if (bind && bind.includes(":")) return `http://[${bind}]:${port}`; // ipv6 literal
  return `http://localhost:${port}`;
}

export function dockerGroupKey(c: { composeProject?: string; name: string; image: string }): { key: string; label: string } {
  if (c.composeProject) return { key: `compose:${c.composeProject}`, label: c.composeProject };
  const prefix = c.name.split(/[-_]/)[0] ?? c.name;
  return { key: `docker:${prefix}:${c.image}`, label: c.name };
}

/** Heuristic framework label for common DB/cache images */
export function classifyDockerImage(image: string): { framework: FrameworkGuess; category: ServiceCategory } {
  const i = image.toLowerCase();
  if (i.includes("postgres")) return { framework: "PostgreSQL", category: "database" };
  if (i.includes("mysql") || i.includes("mariadb")) return { framework: "MySQL", category: "database" };
  if (i.includes("mongo")) return { framework: "MongoDB", category: "database" };
  if (i.includes("redis")) return { framework: "Redis", category: "cache" };
  if (i.includes("nginx")) return { framework: "Nginx", category: "proxy" };
  return { framework: "Unknown", category: "unknown" };
}
