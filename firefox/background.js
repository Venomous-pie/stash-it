// Stash It v4.12 — Firefox background script
//
// Firefox supports the chrome.* namespace via its WebExtensions compatibility
// layer, so no browser.* calls are needed here.
//
// Two responsibilities:
//   1. Fan out storage changes to all open tabs so the stash stays in sync.
//   2. Handle toolbar button clicks — toggle the tray on the active tab.

// ── Storage fan-out ──────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'STASH_UPDATED', changes }).catch(() => {});
    }
  });
});

// ── Toolbar button → toggle tray ─────────────────────────────────────────────
chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, { type: 'TOOLBAR_TOGGLE' }).catch(() => {});
});
