# OLED Attribute Remover

OLED Attribute Remover is a lightweight Chrome extension that removes the `data-oled` attribute from pages you choose. It is useful when a site uses that attribute to force an OLED-friendly theme and you want the browser to stop applying it on selected websites.

## Features

- Removes `data-oled` from matching pages as soon as they load
- Keeps removing the attribute if the page tries to add it back
- Lets you manage site rules from the popup or the options page
- Stores your site list in `chrome.storage.sync`

## How it works

The extension checks the current page URL against the sites you configure. If there is a match, it:

1. Removes `data-oled` from the root element
2. Repeats the removal on `DOMContentLoaded` and `load`
3. Watches for later attribute changes and removes `data-oled` again if needed

## Configuration

You can add sites in either of these forms:

- `example.com`
- `*.example.com`
- `*://example.com/*`

The popup is optimized for quick add/remove actions. The options page is better for editing a longer list in one place.

## Project structure

- `manifest.json` - Extension manifest
- `background.js` - Default storage initialization
- `content.js` - Attribute removal logic
- `popup.html` / `popup.js` - Quick site management UI
- `options.html` / `options.js` - Full settings page
- `icons/` - Extension icons

## Installation

### Load unpacked in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select this project folder

## Notes

- The extension runs on all URLs, but it only acts on pages that match your saved site rules.
- The default site list is initialized in `background.js`.
- If a site does not behave as expected, check whether the page uses `data-oled` on the root element or applies the attribute after load.

## License

Add your preferred license before publishing if you want the project to be clearly reusable.
