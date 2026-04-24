const AGENT = "http://127.0.0.1:7878";

async function refreshBadge(): Promise<void> {
  try {
    const res = await fetch(`${AGENT}/api/scan`, { cache: "no-store" });
    if (!res.ok) throw new Error("bad status");
    const data = (await res.json()) as { entries?: unknown[] };
    const n = Array.isArray(data.entries) ? data.entries.length : 0;
    await chrome.action.setBadgeBackgroundColor({ color: "#0ea5e9" });
    await chrome.action.setBadgeText({ text: n > 0 ? String(n) : "" });
    await chrome.storage.local.set({ lastBadgeCount: n, lastOnline: true });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ color: "#f43f5e" });
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.storage.local.set({ lastOnline: false });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("portpilot-refresh", { periodInMinutes: 0.5 });
  void refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("portpilot-refresh", { periodInMinutes: 0.5 });
  void refreshBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "portpilot-refresh") void refreshBadge();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "REFRESH_BADGE") {
    void refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
