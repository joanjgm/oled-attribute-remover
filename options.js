"use strict";

// Pattern helpers and presets come from shared.js.

const sitesField = document.getElementById("sites");
const rulesContainer = document.getElementById("rules");
const addRuleButton = document.getElementById("addRule");
const presetButtons = document.getElementById("presetButtons");
const saveButton = document.getElementById("save");
const statusLabel = document.getElementById("status");

// Working copy; only written to storage on save.
let draftRules = [];

function showStatus(message) {
  statusLabel.textContent = message;
  setTimeout(() => {
    if (statusLabel.textContent === message) {
      statusLabel.textContent = "";
    }
  }, 1600);
}

function renderRules() {
  rulesContainer.textContent = "";

  if (!draftRules.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No style overrides yet.";
    rulesContainer.appendChild(empty);
    return;
  }

  draftRules.forEach((rule, index) => {
    const card = document.createElement("div");
    card.className = "rule";

    const header = document.createElement("div");
    header.className = "rule-header";

    const patternInput = document.createElement("input");
    patternInput.type = "text";
    patternInput.value = rule.pattern;
    patternInput.placeholder = "example.com or *://example.com/*";
    patternInput.addEventListener("input", () => {
      draftRules[index].pattern = patternInput.value;
    });

    const toggleLabel = document.createElement("label");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = rule.enabled;
    toggle.addEventListener("change", () => {
      draftRules[index].enabled = toggle.checked;
    });
    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(document.createTextNode(" Enabled"));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      draftRules.splice(index, 1);
      renderRules();
    });

    header.appendChild(patternInput);
    header.appendChild(toggleLabel);
    header.appendChild(removeButton);

    const cssField = document.createElement("textarea");
    cssField.value = rule.css;
    cssField.spellcheck = false;
    cssField.placeholder =
      "html.dark,\nhtml.dark :not(:where(.light, .light *)) {\n  --main-surface-primary: #212121 !important;\n}";
    cssField.addEventListener("input", () => {
      draftRules[index].css = cssField.value;
    });

    card.appendChild(header);
    card.appendChild(cssField);
    rulesContainer.appendChild(card);
  });
}

function renderPresetButtons() {
  presetButtons.textContent = "";

  for (const preset of STYLE_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Add "${preset.label}"`;
    button.addEventListener("click", () => {
      draftRules.push(ruleFromPreset(preset));
      renderRules();
    });
    presetButtons.appendChild(button);
  }
}

function load() {
  // `null` means the key has never been written, so the defaults still apply.
  chrome.storage.sync.get({ enabledSites: [], styleRules: null }, (stored) => {
    sitesField.value = sanitizeSites(stored.enabledSites).join("\n");
    draftRules = sanitizeStyleRules(
      stored.styleRules === null ? DEFAULT_STYLE_RULES : stored.styleRules
    );
    renderRules();
    renderPresetButtons();
  });
}

function save() {
  const enabledSites = [
    ...new Set(
      sitesField.value
        .split(/\r?\n/)
        .map((line) => normalizePattern(line))
        .filter(Boolean)
    )
  ];

  // Spreading keeps the preset bookkeeping, so an edited preset is left alone
  // by future updates while an untouched one still gets them.
  const styleRules = draftRules
    .map((rule) => ({
      ...rule,
      pattern: normalizePattern(rule.pattern) || "",
      css: rule.css.trim(),
      enabled: rule.enabled !== false
    }))
    .filter((rule) => rule.pattern && rule.css);

  const dropped = draftRules.length - styleRules.length;

  chrome.storage.sync.set({ enabledSites, styleRules }, () => {
    sitesField.value = enabledSites.join("\n");
    draftRules = styleRules;
    renderRules();
    showStatus(dropped > 0 ? `Saved (${dropped} incomplete override discarded)` : "Saved");
  });
}

addRuleButton.addEventListener("click", () => {
  draftRules.push({ pattern: "", css: "", enabled: true });
  renderRules();
});
saveButton.addEventListener("click", save);

document.addEventListener("DOMContentLoaded", load);
