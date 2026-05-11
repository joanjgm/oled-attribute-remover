"use strict";

const sitesField = document.getElementById("sites");
const saveButton = document.getElementById("save");
const statusLabel = document.getElementById("status");

function normalizePattern(rawEntry) {
  const entry = rawEntry.trim().toLowerCase();
  if (!entry) {
    return null;
  }

  if (entry.includes("://")) {
    if (entry.includes("*")) {
      return entry;
    }
    return `${entry.replace(/\/+$/, "")}/*`;
  }

  const host = entry.replace(/^\*\./, "*.");
  return `*://${host}/*`;
}

function loadSites() {
  chrome.storage.sync.get({ enabledSites: [] }, ({ enabledSites }) => {
    sitesField.value = enabledSites.join("\n");
  });
}

function saveSites() {
  const lines = sitesField.value
    .split(/\r?\n/)
    .map((line) => normalizePattern(line))
    .filter(Boolean);

  const uniqueSites = [...new Set(lines)];
  chrome.storage.sync.set({ enabledSites: uniqueSites }, () => {
    statusLabel.textContent = "Saved";
    setTimeout(() => {
      statusLabel.textContent = "";
    }, 1200);
  });
}

saveButton.addEventListener("click", saveSites);
document.addEventListener("DOMContentLoaded", loadSites);
