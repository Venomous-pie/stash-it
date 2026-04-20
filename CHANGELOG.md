# Changelog

All notable changes to Stash It are documented in this file.

## [4.14]

- Version bump and consistency improvements.
- README and packaging updated to reflect current release.

## [4.12]

- **Toolbar button** — pin Stash It to your toolbar for instant access. Click to open
  the tray at any time — no need to drag an image first.
- **No external fonts** — Google Fonts removed; fully self-contained per AMO policy.
  The tray now uses your system UI font, which looks great and loads instantly.
- **Ko-fi support link** — a one-time dismissible footer lets you support the developer.
  Clicking × permanently hides it. The extension works identically either way.
- **Bundled privacy policy** — `privacy_policy.html` included in the extension package.
- **Icons** — proper 48×96 px icons for the toolbar and AMO listing.
- **AMO-ready packaging** — Firefox `.xpi` structured correctly for store upload.

## [4.11]

- **ID collision fix** — image IDs safely anchored above highest persisted ID.
- **Cross-tab mode sync fixed** — closing on one tab now correctly hides on all tabs.
- **Smooth close animation** — tray fades out before hiding instead of snapping away.
- **CORS error handling** — failed URL fetches show a clear toast, no broken thumbnail.
- **Storage quota warning** — toast warns when stash approaches ~8 MB browser limit.

## [4.4]

- **X button no longer clears images** — closing just hides the tray; stash is preserved.
- **Clear All is the only way to wipe your stash.**

## [4.3]

- No more flash on load — tray stays hidden until position/size/mode are loaded.
- Ghost drag fixed — custom drag ghost tracks cursor correctly across the full page.

## [4.2]

- Auto-minimize on resize — drag to minimum size and it snaps to the minimized pill.

## [4.1]

- Resize lag fixed. Version tracking added.

## [4.0]

- Drag, sentinel reset, close/minimize reliability, and mode-on-load all fixed.
