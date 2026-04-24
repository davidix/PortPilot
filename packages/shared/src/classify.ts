import type { FrameworkGuess, ServiceCategory } from "./types.js";

const LOWER = (s: string) => s.toLowerCase();

/**
 * Infer framework + category from process name, command line, and optional paths.
 * Heuristic only — many stacks look identical from the outside.
 */
export function classifyService(input: {
  processName: string;
  command?: string;
  cwd?: string;
  packageJsonName?: string;
  packageJsonScripts?: string;
}): { framework: FrameworkGuess; category: ServiceCategory } {
  const name = LOWER(input.processName || "");
  const cmd = LOWER(input.command || "");
  const scripts = LOWER(input.packageJsonScripts || "");
  const pkgName = LOWER(input.packageJsonName || "");
  const cwd = LOWER(input.cwd || "");

  const haystack = `${name} ${cmd} ${scripts} ${pkgName} ${cwd}`;

  // Databases & infra (check before generic "node")
  if (haystack.includes("postgres") || name === "postgres") {
    return { framework: "PostgreSQL", category: "database" };
  }
  if (haystack.includes("mysqld") || name === "mysqld" || haystack.includes("mariadbd")) {
    return { framework: "MySQL", category: "database" };
  }
  if (name.includes("mongod") || haystack.includes("mongod")) {
    return { framework: "MongoDB", category: "database" };
  }
  if (name.includes("redis-server") || haystack.includes("redis-server")) {
    return { framework: "Redis", category: "cache" };
  }
  if (name === "nginx" || haystack.includes("nginx:")) {
    return { framework: "Nginx", category: "proxy" };
  }

  // PHP / Python web
  if (haystack.includes("artisan") || haystack.includes("/vendor/laravel") || cmd.includes("laravel")) {
    return { framework: "Laravel", category: "backend" };
  }
  if (haystack.includes("manage.py runserver") || haystack.includes("django")) {
    return { framework: "Django", category: "backend" };
  }
  if (haystack.includes("flask") || cmd.includes("flask run")) {
    return { framework: "Flask", category: "backend" };
  }

  // Node frameworks
  if (scripts.includes("next") || cmd.includes("next dev") || cmd.includes("next start")) {
    return { framework: "Next.js", category: "frontend" };
  }
  if (scripts.includes("vite") || cmd.includes("vite") || cwd.includes("/.vite")) {
    return { framework: "Vite", category: "frontend" };
  }
  if (cmd.includes("vue-cli-service") || haystack.includes("@vue/cli")) {
    return { framework: "Vue", category: "frontend" };
  }
  if (cmd.includes("nest start") || cmd.includes("node dist/main") && haystack.includes("nest")) {
    return { framework: "NestJS", category: "backend" };
  }
  if (cmd.includes("express") || haystack.includes("express")) {
    return { framework: "Express", category: "backend" };
  }
  if (name === "node" || name === "nodejs" || cmd.includes("node ")) {
    if (scripts.includes("react-scripts") || haystack.includes("craco") || haystack.includes("webpack")) {
      return { framework: "React", category: "frontend" };
    }
    return { framework: "Node.js", category: "backend" };
  }

  // Browsers / dev servers sometimes show up with distinct names
  if (name.includes("chrome") || name.includes("firefox")) {
    return { framework: "Unknown", category: "tooling" };
  }

  return { framework: "Unknown", category: "unknown" };
}
