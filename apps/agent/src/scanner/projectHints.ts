import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface PackageHints {
  packageRoot?: string;
  name?: string;
  scriptsBlob?: string;
}

/**
 * Walk upward from startDir to find the nearest package.json.
 */
export function nearestPackageJson(startDir: string | undefined): PackageHints {
  if (!startDir) return {};
  let dir = startDir;
  for (let i = 0; i < 64; i++) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf8");
        const pkg = JSON.parse(raw) as { name?: string; scripts?: Record<string, string> };
        const scriptsBlob = pkg.scripts ? Object.entries(pkg.scripts).map(([k, v]) => `${k}:${v}`).join(" ") : "";
        return {
          packageRoot: dir,
          name: typeof pkg.name === "string" ? pkg.name : undefined,
          scriptsBlob,
        };
      } catch {
        return { packageRoot: dir };
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {};
}
