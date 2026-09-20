"use strict";

// Pattern helpers and presets come from shared.js.

const siteInput = document.getElementById("siteInput");
const addButton = document.getElementById("addButton");
const sitesList = document.getElementById("sitesList");
const rulesList = document.getElementById("rulesList");
const presetButton = document.getElementById("presetButton");
const optionsButton = document.getElementById("optionsButton");
const statusLabel = document.getElementById("status");

function showStatus(message) {
  statusLabel.textContent = message;
  window.setTimeout(() => {
    if (statusLabel.textContent === message) {
      statusLabel.textContent = "";
    }
  }, 1300);
}

function appendEmptyItem(list, message) {
  const empty = document.createElement("li");
  empty.textContent = message;
  list.appendChild(empty);
}

function saveSites(enabledSites, onDone) {
  chrome.storage.sync.set({ enabledSites: [...new Set(enabledSites)] }, onDone);
}

function saveRules(styleRules, onDone) {
  chrome.storage.sync.set({ styleRules }, onDone);
}

function renderSites(enabledSites) {
  sitesList.textContent = "";

  if (!enabledSites.length) {
    appendEmptyItem(sitesList, "No sites configured.");
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

function renderRules(styleRules) {
  rulesList.textContent = "";

  if (!styleRules.length) {
    appendEmptyItem(rulesList, "No style overrides.");
    return;
  }

  styleRules.forEach((rule, index) => {
    const item = document.createElement("li");

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = rule.enabled;
    toggle.title = "Enable or disable this override";
    toggle.addEventListener("change", () => {
      const updated = styleRules.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, enabled: toggle.checked } : entry
      );
      saveRules(updated, () => {
        renderRules(updated);
        showStatus(toggle.checked ? "Override enabled" : "Override disabled");
      });
    });

    const patternValue = document.createElement("span");
    patternValue.className = rule.enabled ? "site" : "site disabled";
    patternValue.textContent = rule.pattern;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const updated = styleRules.filter((_, entryIndex) => entryIndex !== index);
      saveRules(updated, () => {
        renderRules(updated);
        showStatus("Override removed");
        refreshPresetButton(updated);
      });
    });

    item.appendChild(toggle);
    item.appendChild(patternValue);
    item.appendChild(removeButton);
    rulesList.appendChild(item);
  });
}

// Offers a one-click preset when the active tab matches one we ship and the
// user has no rule for it yet.
function refreshPresetButton(styleRules) {
  presetButton.hidden = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabUrl = tabs[0] && tabs[0].url;
    if (!tabUrl) {
      return;
    }

    let matchable;
    try {
      matchable = matchableUrl(new URL(tabUrl));
    } catch (error) {
      return;
    }

    const preset = STYLE_PRESETS.find(
      (candidate) =>
        entryMatchesUrl(candidate.pattern, matchable) &&
        !styleRules.some((rule) => rule.pattern === candidate.pattern)
    );

    if (!preset) {
      return;
    }

    presetButton.textContent = `Add "${preset.label}" preset`;
    presetButton.hidden = false;
    presetButton.onclick = () => {
      const updated = [...styleRules, ruleFromPreset(preset)];
      saveRules(updated, () => {
        renderRules(updated);
        refreshPresetButton(updated);
        showStatus("Preset added - reload the page");
      });
    };
  });
}

function load() {
  // `null` means the key has never been written, so the defaults still apply.
  chrome.storage.sync.get({ enabledSites: [], styleRules: null }, (stored) => {
    const sites = sanitizeSites(stored.enabledSites);
    const rules = sanitizeStyleRules(
      stored.styleRules === null ? DEFAULT_STYLE_RULES : stored.styleRules
    );
    renderSites(sites);
    renderRules(rules);
    refreshPresetButton(rules);
  });
}

function addSite() {
  const normalized = normalizePattern(siteInput.value);
  if (!normalized) {
    showStatus("Enter a valid site");
    return;
  }

  chrome.storage.sync.get({ enabledSites: [] }, (stored) => {
    const existing = sanitizeSites(stored.enabledSites);
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
optionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

document.addEventListener("DOMContentLoaded", load);
