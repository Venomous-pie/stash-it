<div align="center">

# 📌 Stash It

[![Version](https://img.shields.io/badge/version-4.14-blue.svg)](#)
[![Platform](https://img.shields.io/badge/platform-Firefox%20%7C%20Chrome%20%7C%20Edge%20%7C%20Brave-blueviolet.svg)](#)
[![License](https://img.shields.io/badge/license-Proprietary-green.svg)](#)

</div>

A lightweight browser extension that gives you a floating image tray on any page.
Drag images in, drag them back out. Your stash syncs instantly across every open tab
and persists across browser restarts.

> **Now available on the Firefox Add-ons store (AMO)!**
> 🦊 Search **Stash It** on [addons.mozilla.org](https://addons.mozilla.org) to install in one click.

---

## Install

### Firefox (recommended — available on AMO)
Install directly from the store:
👉 [addons.mozilla.org](https://addons.mozilla.org) — search **Stash It**

Or sideload for development:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `firefox/manifest.json`

**Tip:** After installing, right-click the Stash It icon in the toolbar and choose
**Pin to Toolbar** so you can open the tray with one click from any page.

### Chrome / Edge / Brave
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `chrome` folder

---

## Usage

| Action | How |
|---|---|
| Open tray | Click the 📌 toolbar button (if pinned), or drag any image onto the page |
| Stash an image | Drag any image from a page → drop onto the tray |
| Peek at an image | Hover a thumbnail → click 🔍 |
| Navigate in peek | Arrow keys or ← → buttons |
| Drag an image out | Drag a thumbnail to any image-accepting input |
| Minimize | Click `—` in the titlebar |
| Expand | Click the minimized pill, or click the toolbar button |
| Close | Click `×` → confirm |
| Move tray | Drag the titlebar |
| Resize tray | Drag any edge or corner |
| Clear all | Click **Clear** → confirm |

---

## Notes

- **Your stash persists** across page loads and browser restarts via `chrome.storage.local`.
- **Syncs across tabs** — stash an image on one tab and it appears on all others instantly.
- **Closing the tray does not delete your images.** It reappears the next time you drag
  an image onto any page, or when you click the toolbar button.
- **Storage limit** — base64 images are stored locally. A warning toast appears when
  your stash approaches 8 MB. If issues occur, use **Clear All** to reset.
- Built with a Shadow DOM so styles never conflict with any page's own CSS.
- No external resources — fully self-contained, no network requests except image fetches
  you explicitly initiate.

---

## Privacy

Stash It collects no personal data. Everything stays on your device.
See `privacy_policy.html` for the full policy.

---

## Support the developer

If Stash It saves you time, consider buying a coffee:
👉 [ko-fi.com/kanameshizu](https://ko-fi.com/kanameshizu)

---

## File structure

```
stash-it/
├── firefox/
│   ├── manifest.json        — MV2 manifest
│   ├── background.js        — background script: storage fan-out + toolbar toggle
│   ├── content.js           — full tray UI injected into every page
│   ├── icon48.png           — toolbar / listing icon
│   ├── icon96.png           — high-DPI icon
│   └── privacy_policy.html  — bundled privacy policy
└── README.md
```

## License
© 2026 dedicatoriaDev. All rights reserved. See `LICENSE` for details.

---

📝 **See [CHANGELOG.md](CHANGELOG.md) for full version history.**
