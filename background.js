"use strict";

importScripts("shared.js");

// Seeds defaults and brings unedited preset rules up to date. Runs on install
// and on every service worker start, since reloading an unpacked extension
// does not reliably fire `onInstalled`. It only writes when something changed.
async function initializeStorage() {
  const { enabledSites, styleRules } = await chrome.storage.sync.get([
    "enabledSites",
    "styleRules"
  ]);

  const updates = {};

  if (!Array.isArray(enabledSites)) {
    updates.enabledSites = DEFAULT_SITES;
  }

  if (!Array.isArray(styleRules)) {
    updates.styleRules = DEFAULT_STYLE_RULES;
  } else {
    const upgraded = upgradePresetRules(sanitizeStyleRules(styleRules));
    if (JSON.stringify(upgraded) !== JSON.stringify(styleRules)) {
      updates.styleRules = upgraded;
    }
  }

  if (Object.keys(updates).length) {
    await chrome.storage.sync.set(updates);
  }
}

chrome.runtime.onInstalled.addListener(initializeStorage);
chrome.runtime.onStartup.addListener(initializeStorage);

initializeStorage();
