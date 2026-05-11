"use strict";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function applyOledRemoval() {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.removeAttribute("data-oled");
}

const currentUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

chrome.storage.sync.get({ enabledSites: [] }, ({ enabledSites }) => {
  const normalized = enabledSites
    .filter((entry) => typeof entry === "string")
    .map((entry) => normalizePattern(entry))
    .flatMap((pattern) => (pattern ? expandPattern(pattern) : []))
    .filter(Boolean);

  if (!normalized.some((pattern) => matchesPattern(currentUrl, pattern))) {
    return;
  }

  applyOledRemoval();
  document.addEventListener("DOMContentLoaded", applyOledRemoval, { once: true });
  window.addEventListener("load", applyOledRemoval, { once: true });

  const attrObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "data-oled") {
        applyOledRemoval();
      }
    }
  });

  if (document.documentElement) {
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-oled"]
    });
  }
});
