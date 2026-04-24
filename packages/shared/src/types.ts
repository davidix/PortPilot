/** Where the listening socket was discovered */
export type PortSource = "macos" | "docker";

/** High-level bucket for filtering */
export type ServiceCategory =
  | "frontend"
  | "backend"
  | "database"
  | "cache"
  | "proxy"
  | "tooling"
  | "unknown";

export type FrameworkGuess =
  | "Next.js"
  | "React"
  | "Vite"
  | "Vue"
  | "Node.js"
  | "Express"
  | "NestJS"
  | "Laravel"
  | "Django"
  | "Flask"
  | "PostgreSQL"
  | "MySQL"
  | "Redis"
  | "MongoDB"
  | "Nginx"
  | "Unknown";

/** One listening endpoint (process or container port mapping) */
export interface PortEntry {
  port: number;
  protocol: "tcp" | "udp";
  pid?: number;
  processName?: string;
  command?: string;
  /** Best-effort cwd from OS (may be missing without permissions) */
  workingDirectory?: string;
  /** Nearest ancestor folder containing package.json */
  packageRoot?: string;
  framework: FrameworkGuess;
  category: ServiceCategory;
  source: PortSource;
  /** Human-readable group key (folder, compose project, etc.) */
  groupKey: string;
  /** Display label for the group */
  groupLabel: string;
  localUrl: string;
  /** Raw bind address from lsof / docker when known */
  bindAddress?: string;
  /** Docker-only fields */
  docker?: {
    containerId: string;
    containerName: string;
    image: string;
    composeProject?: string;
    publishPairs: string[];
  };
}

export interface GroupedPorts {
  key: string;
  label: string;
  entries: PortEntry[];
}

export interface ScanMeta {
  scannedAt: string;
  host: string;
  errors: string[];
}

export interface ScanResult {
  meta: ScanMeta;
  groups: GroupedPorts[];
  entries: PortEntry[];
}
