"use strict";

// Pattern helpers and defaults come from shared.js, injected before this file.

const STYLE_ELEMENT_ID = "oled-attribute-remover-style";

let styleElement = null;
let styleObserver = null;
let currentCss = "";
let attributeRemovalStarted = false;

const currentUrl = matchableUrl(window.location);

function applyOledRemoval() {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.removeAttribute("data-oled");
}

function startAttributeRemoval() {
  if (attributeRemovalStarted) {
    return;
  }
  attributeRemovalStarted = true;

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
}

// Keeps the stylesheet in the document even if the page wipes its container.
function watchStyleElement() {
  const parent = styleElement && styleElement.parentNode;
  if (!parent) {
    return;
  }

  if (styleObserver) {
    styleObserver.disconnect();
  }

  styleObserver = new MutationObserver(() => {
    if (currentCss && styleElement && !styleElement.isConnected) {
      mountStyleElement();
    }
  });
  styleObserver.observe(parent, { childList: true });
}

function mountStyleElement() {
  const host = document.head || document.documentElement;
  if (!host) {
    return;
  }

  // Re-appending also moves the element to the end of the head, so page
  // stylesheets loaded later do not win on source order alone.
  host.appendChild(styleElement);
  watchStyleElement();
}

function applyCss(css) {
  currentCss = css;

  if (!css) {
    if (styleObserver) {
      styleObserver.disconnect();
      styleObserver = null;
    }
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
    return;
  }

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = STYLE_ELEMENT_ID;
    styleElement.setAttribute("type", "text/css");
  }

  styleElement.textContent = css;

  if (!styleElement.isConnected) {
    mountStyleElement();
  }
}

function cssForUrl(styleRules) {
  return styleRules
    .filter((rule) => rule.enabled && entryMatchesUrl(rule.pattern, currentUrl))
    .map((rule) => rule.css)
    .join("\n\n");
}

function applyStored({ enabledSites, styleRules }) {
  if (sanitizeSites(enabledSites).some((entry) => entryMatchesUrl(entry, currentUrl))) {
    startAttributeRemoval();
  }

  applyCss(cssForUrl(sanitizeStyleRules(styleRules)));
}

// `null` means the key has never been written; an empty array means the user
// deliberately removed every rule, so defaults must not come back.
chrome.storage.sync.get({ enabledSites: [], styleRules: null }, (stored) => {
  applyStored({
    enabledSites: stored.enabledSites,
    styleRules: stored.styleRules === null ? DEFAULT_STYLE_RULES : stored.styleRules
  });

  // Once the head exists, move the stylesheet into it.
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      if (currentCss && document.head && styleElement && styleElement.parentNode !== document.head) {
        mountStyleElement();
      }
    },
    { once: true }
  );
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (!changes.enabledSites && !changes.styleRules) {
    return;
  }

  chrome.storage.sync.get({ enabledSites: [], styleRules: [] }, applyStored);
});
