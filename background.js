const DEFAULT_SITES = ["*://example.com/*"];

chrome.runtime.onInstalled.addListener(async () => {
  const { enabledSites } = await chrome.storage.sync.get("enabledSites");

  if (!Array.isArray(enabledSites)) {
    await chrome.storage.sync.set({ enabledSites: DEFAULT_SITES });
  }
});
