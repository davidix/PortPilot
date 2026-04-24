import type { GroupedPorts, PortEntry } from "@portpilot/shared";

/**
 * Group entries by `groupKey`, preserving stable sort by label then port.
 */
export function groupPortEntries(entries: PortEntry[]): GroupedPorts[] {
  const map = new Map<string, { label: string; items: PortEntry[] }>();
  for (const e of entries) {
    const bucket = map.get(e.groupKey) ?? { label: e.groupLabel, items: [] };
    bucket.items.push(e);
    map.set(e.groupKey, bucket);
  }
  const groups: GroupedPorts[] = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: v.label,
      entries: v.items.sort((x, y) => x.port - y.port || x.localUrl.localeCompare(y.localUrl)),
    }));
  return groups;
}
