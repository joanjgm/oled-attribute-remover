"use strict";

// Shared between the content script, the popup and the options page.
// Loaded as a plain script, so everything lives on the global scope.

const DEFAULT_SITES = ["*://example.com/*"];

// chatgpt.com dropped the `data-oled` attribute: the pure black palette is now
// baked into the `.dark` token set, so the only way back to the legacy grey
// dark mode is to override the custom properties.
//
// The descendant part of the selector is not optional: chatgpt.com redefines
// these properties on every element under `html.dark`, so overriding them on
// the root alone is shadowed further down the tree. `:not(:where(.light, ...))`
// mirrors their own selector and keeps light-themed subtrees (popovers) intact.
const CHATGPT_LEGACY_DARK_CSS = `html.dark,
html.dark :not(:where(.light, .light *)) {
  --main-surface-primary: #212121 !important;
  --main-surface-secondary: #2f2f2f !important;
  --main-surface-tertiary: #424242 !important;
  --composer-surface-primary: #2f2f2f !important;
  --component-sidebar-bg: #171717 !important;
  --sidebar-surface-primary: #171717 !important;
  --bg-secondary-surface: #181818 !important;
  --bg-elevated-primary: #303030 !important;
  --bg-elevated-secondary: #212121 !important;
}

/* The composer does not read --composer-surface-primary: a higher specificity
   rule paints it from --bg-primary, which is the same #212121 as the page. */
html.dark [data-composer-surface="true"] {
  background-color: #2f2f2f !important;
}`;

// Earlier shipped versions of a preset. A stored rule still holding one of
// these is untouched by the user, so it can safely be upgraded in place.
const SUPERSEDED_PRESET_CSS = {
  "chatgpt-legacy-dark": [
    `html.dark,
html.dark :not(:where(.light, .light *)) {
  --main-surface-primary: #212121 !important;
  --component-sidebar-bg: #171717 !important;
  --sidebar-surface-primary: #171717 !important;
  --bg-secondary-surface: #181818 !important;
  --bg-elevated-primary: #303030 !important;
  --bg-elevated-secondary: #212121 !important;
}`
  ]
};

const STYLE_PRESETS = [
  {
    id: "chatgpt-legacy-dark",
    label: "ChatGPT legacy dark",
    pattern: "*://chatgpt.com/*",
    css: CHATGPT_LEGACY_DARK_CSS
  }
];

function ruleFromPreset(preset) {
  return {
    pattern: preset.pattern,
    css: preset.css,
    enabled: true,
    presetId: preset.id,
    // The CSS as shipped. Once it differs from `css` the user has edited the
    // rule and updates stop touching it.
    presetCss: preset.css
  };
}

const DEFAULT_STYLE_RULES = STYLE_PRESETS.map(ruleFromPreset);

// Brings unedited preset rules up to date, including rules saved before
// presets were tagged, which are recognised by their CSS alone.
function upgradePresetRules(styleRules) {
  return styleRules.map((rule) => {
    const preset =
      STYLE_PRESETS.find((candidate) => candidate.id === rule.presetId) ||
      STYLE_PRESETS.find((candidate) =>
        (SUPERSEDED_PRESET_CSS[candidate.id] || []).includes(rule.css.trim())
      );

    if (!preset) {
      return rule;
    }

    const shipped = rule.presetCss ?? rule.css;
    const edited = rule.css.trim() !== shipped.trim();
    if (edited) {
      return { ...rule, presetId: preset.id };
    }

    return { ...rule, css: preset.css, presetId: preset.id, presetCss: preset.css };
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePattern(rawEntry) {
  const entry = String(rawEntry ?? "").trim().toLowerCase();
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

function expandPattern(pattern) {
  const match = pattern.match(/^\*:\/\/([^/*]+)\/\*$/i);
  if (!match) {
    return [pattern];
  }

  const host = match[1];
  if (host.includes("*")) {
    return [pattern];
  }

  return [pattern, `*://*.${host}/*`];
}

function matchesPattern(url, pattern) {
  const regexSource = `^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`;
  return new RegExp(regexSource, "i").test(url);
}

// True when `url` matches the user entry, in any of its accepted forms.
function entryMatchesUrl(rawEntry, url) {
  const normalized = normalizePattern(rawEntry);
  if (!normalized) {
    return false;
  }

  return expandPattern(normalized).some((pattern) => matchesPattern(url, pattern));
}

function matchableUrl(location) {
  return `${location.protocol}//${location.host}${location.pathname}`;
}

function sanitizeSites(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry) => typeof entry === "string"))];
}

function sanitizeStyleRules(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => {
      const sanitized = {
        pattern: typeof rule.pattern === "string" ? rule.pattern : "",
        css: typeof rule.css === "string" ? rule.css : "",
        enabled: rule.enabled !== false
      };

      if (typeof rule.presetId === "string") {
        sanitized.presetId = rule.presetId;
      }
      if (typeof rule.presetCss === "string") {
        sanitized.presetCss = rule.presetCss;
      }

      return sanitized;
    })
    .filter((rule) => rule.pattern.trim() && rule.css.trim());
}
