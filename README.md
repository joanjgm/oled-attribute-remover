# OLED Attribute Remover

OLED Attribute Remover is a lightweight Chrome extension that brings back the classic grey dark
mode on sites that switched to a pure black OLED palette. It does this in two ways:

- **Attribute removal** - strips the `data-oled` attribute from pages you choose
- **Style overrides** - injects your own CSS on pages you choose, for sites that bake the OLED
  palette into their stylesheet instead of exposing an attribute

## Why both

`data-oled` used to be the switch that sites like chatgpt.com flipped to enable OLED dark mode, so
removing it was enough. chatgpt.com no longer emits that attribute: its dark theme is now defined
by CSS custom properties that are already black (`--main-surface-primary: #000`,
`--component-sidebar-bg: #000`, and friends). There is nothing left to remove, so the palette has
to be overridden instead.

A ready-made **ChatGPT legacy dark** preset ships with the extension and is enabled by default.

## Features

- Removes `data-oled` from matching pages as soon as they load, and keeps removing it if the page
  adds it back
- Injects per-site CSS at `document_start`, so there is no flash of the wrong palette
- Re-inserts the injected stylesheet if the page removes it
- Picks up setting changes without a reload of the extension
- Lets you manage both lists from the popup or the options page
- Stores everything in `chrome.storage.sync`

## How it works

The extension checks the current page URL against the entries you configure.

For **attribute removal** matches it:

1. Removes `data-oled` from the root element
2. Repeats the removal on `DOMContentLoaded` and `load`
3. Watches for later attribute changes and removes `data-oled` again if needed

For **style override** matches it appends a `<style>` element with your CSS and keeps it in the
document.

## Configuration

Site entries can be written in any of these forms, in both lists:

- `example.com`
- `*.example.com`
- `*://example.com/*`

A bare host also matches its subdomains.

The popup is optimized for quick add/remove/toggle actions. The options page is where you edit the
CSS of an override.

### Writing an override

Use `!important` on the declarations, and match the breadth of the selector the site uses. The
shipped ChatGPT preset is a good template:

```css
html.dark,
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

html.dark [data-composer-surface="true"] {
  background-color: #2f2f2f !important;
}
```

Two things are easy to get wrong here:

- The descendant part of the selector matters: chatgpt.com redefines these properties on *every*
  element under `html.dark`, so an override on the root alone gets shadowed further down the tree.
- Overriding a custom property is not always enough. The composer is painted by
  `.dark [data-composer-surface="true"] { background-color: var(--bg-primary) }`, which outranks
  the class that reads `--composer-surface-primary`, so it needs its own rule.

### Preset updates

Rules added from a preset remember the CSS they shipped with. When the extension updates, a preset
rule whose CSS is unchanged is refreshed automatically; once you edit it, it is yours and updates
leave it alone.

## Project structure

- `manifest.json` - Extension manifest
- `shared.js` - Pattern matching, defaults and presets shared by every context
- `background.js` - Default storage initialization
- `content.js` - Attribute removal and CSS injection
- `popup.html` / `popup.js` - Quick site management UI
- `options.html` / `options.js` - Full settings page, including the CSS editor
- `icons/` - Extension icons

## Installation

### Load unpacked in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select this project folder

## Notes

- The extension runs on all URLs, but it only acts on pages that match your saved entries.
- Defaults are seeded in `background.js` on install and on update. Clearing a list on purpose is
  respected: defaults are only restored if the key has never been written.
- If a site stops behaving as expected, check in DevTools whether it still uses `data-oled`, or
  which custom properties now drive its background.

## License

Add your preferred license before publishing if you want the project to be clearly reusable.
