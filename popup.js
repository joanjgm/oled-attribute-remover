"use strict";

const siteInput = document.getElementById("siteInput");
const addButton = document.getElementById("addButton");
const sitesList = document.getElementById("sitesList");
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

function showStatus(message) {
  statusLabel.textContent = message;
  window.setTimeout(() => {
    if (statusLabel.textContent === message) {
      statusLabel.textContent = "";
    }
  }, 1300);
}

function saveSites(enabledSites, onDone) {
  const uniqueSites = [...new Set(enabledSites)];
  chrome.storage.sync.set({ enabledSites: uniqueSites }, onDone);
}

function renderSites(enabledSites) {
  sitesList.textContent = "";

  if (!enabledSites.length) {
    const empty = document.createElement("li");
    empty.textContent = "No sites configured.";
    sitesList.appendChild(empty);
    return;
  }

  for (const site of enabledSites) {
    const item = document.createElement("li");

    const siteValue = document.createElement("span");
    siteValue.className = "site";
    siteValue.textContent = site;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const filtered = enabledSites.filter((entry) => entry !== site);
      saveSites(filtered, () => {
        renderSites(filtered);
        showStatus("Site removed");
      });
    });

    item.appendChild(siteValue);
    item.appendChild(removeButton);
    sitesList.appendChild(item);
  }
}

function loadSites() {
  chrome.storage.sync.get({ enabledSites: [] }, ({ enabledSites }) => {
    renderSites(enabledSites.filter((entry) => typeof entry === "string"));
  });
}

function addSite() {
  const normalized = normalizePattern(siteInput.value);
  if (!normalized) {
    showStatus("Enter a valid site");
    return;
  }

  chrome.storage.sync.get({ enabledSites: [] }, ({ enabledSites }) => {
    const existing = enabledSites.filter((entry) => typeof entry === "string");
    if (existing.includes(normalized)) {
      showStatus("That site already exists");
      return;
    }

    const updated = [...existing, normalized];
    saveSites(updated, () => {
      siteInput.value = "";
      renderSites(updated);
      showStatus("Site added");
    });
  });
}

addButton.addEventListener("click", addSite);
siteInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addSite();
  }
});

document.addEventListener("DOMContentLoaded", loadSites);
