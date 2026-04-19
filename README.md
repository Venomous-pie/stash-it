# 📌 Stash It v4.14

A lightweight browser extension that gives you a floating image tray on any page.
Drag images in, drag them back out. Your stash syncs instantly across every open tab
and persists across browser restarts.

> **Now available on the Firefox Add-ons store (AMO)!**
> 🦊 Search **Stash It** on [addons.mozilla.org](https://addons.mozilla.org) to install in one click.

---

## What's new in v4.14
- Version bump and consistency improvements.
- README and packaging updated to reflect current release.

## What's new in v4.12
- **Toolbar button** — pin Stash It to your toolbar for instant access. Click to open
  the tray at any time — no need to drag an image first.
- **No external fonts** — Google Fonts removed; fully self-contained per AMO policy.
  The tray now uses your system UI font, which looks great and loads instantly.
- **Ko-fi support link** — a one-time dismissible footer lets you support the developer.
  Clicking × permanently hides it. The extension works identically either way.
- **Bundled privacy policy** — `privacy_policy.html` included in the extension package.
- **Icons** — proper 48×96 px icons for the toolbar and AMO listing.
- **AMO-ready packaging** — Firefox `.xpi` structured correctly for store upload.

## What's new in v4.11
- **ID collision fix** — image IDs safely anchored above highest persisted ID.
- **Cross-tab mode sync fixed** — closing on one tab now correctly hides on all tabs.
- **Smooth close animation** — tray fades out before hiding instead of snapping away.
- **CORS error handling** — failed URL fetches show a clear toast, no broken thumbnail.
- **Storage quota warning** — toast warns when stash approaches ~8 MB browser limit.

## What's new in v4.4
- **X button no longer clears images** — closing just hides the tray; stash is preserved.
- **Clear All is the only way to wipe your stash.**

## What's new in v4.3
- No more flash on load — tray stays hidden until position/size/mode are loaded.
- Ghost drag fixed — custom drag ghost tracks cursor correctly across the full page.

## What's new in v4.2
- Auto-minimize on resize — drag to minimum size and it snaps to the minimized pill.

## What's new in v4.1
- Resize lag fixed. Version tracking added.

## What's new in v4
- Drag, sentinel reset, close/minimize reliability, and mode-on-load all fixed.

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
