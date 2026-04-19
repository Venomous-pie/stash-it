(() => {
  if (document.getElementById('__stash-host__')) return;

  const VERSION = '4.12';

  // ── Storage keys ─────────────────────────────────────────────────────────
  const KEY_IMAGES  = 'stash_images';
  const KEY_POS     = 'stash_pos';
  const KEY_SIZE    = 'stash_size';
  const KEY_MODE    = 'stash_mode';    // 'open' | 'minimized' | 'closed'
  const KEY_KOFI    = 'stash_kofi_dismissed'; // true once user dismisses footer
  const KEY_KOFI_SNOOZE = 'stash_kofi_snooze'; // timestamp (ms) of last "maybe next time"

  // ── Shadow DOM host ─────────────────────────────────────────────────────
  // Using Shadow DOM ensures our CSS never conflicts with the page's CSS,
  // and the page's CSS never breaks our resize handles or layout.
  const host = document.createElement('div');
  host.id = '__stash-host__';
  host.style.cssText = `
    position: fixed !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    top: 0; left: 0;
    width: 0; height: 0;
    overflow: visible !important;
    visibility: hidden !important;
  `;
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // ── Styles (inside shadow DOM — fully isolated) ─────────────────────────
  // No external font imports — fully self-contained per AMO policy.
  // Using system-ui for body text and a tighter tracked style for headings.
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Tray wrapper — absolutely positioned from (0,0) ── */
    #tray-root {
      position: fixed;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      pointer-events: none;
      top: 0; left: 0;
    }

    /* sentinel removed — document-level dragenter/dragleave handles tray show/hide */

    /* ── TRAY ── */
    #tray {
      pointer-events: all;
      position: absolute;
      display: flex;
      flex-direction: column;
      background: rgba(10,10,15,0.93);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 18px;
      box-shadow:
        0 0 0 0.5px rgba(255,255,255,0.04) inset,
        0 32px 80px rgba(0,0,0,0.7),
        0 4px 16px rgba(0,0,0,0.3);
      overflow: hidden;
      transition:
        opacity .24s cubic-bezier(.4,0,.2,1),
        transform .24s cubic-bezier(.4,0,.2,1),
        border-color .18s,
        box-shadow .18s,
        width .18s cubic-bezier(.4,0,.2,1),
        height .18s cubic-bezier(.4,0,.2,1),
        border-radius .18s;
      opacity: 0;
      transform: scale(.93) translateY(10px);
    }
    #tray.visible {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    #tray.tray-dragging {
      opacity: .9;
      box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 48px 100px rgba(0,0,0,0.8);
      transition: none;
    }
    #tray.tray-resizing {
      transition: none !important;
    }
    #tray.drag-over {
      border-color: rgba(99,179,237,.55);
      box-shadow:
        0 0 0 0.5px rgba(255,255,255,0.04) inset,
        0 32px 80px rgba(0,0,0,0.7),
        0 0 0 3px rgba(99,179,237,.2);
    }

    /* ── MINIMIZED pill ── */
    #tray.minimized {
      width: auto !important;
      height: auto !important;
      border-radius: 999px !important;
      overflow: hidden;
    }
    #tray.minimized #bar { border-bottom: none; padding: 10px 14px; cursor: pointer; }
    #tray.minimized #body { display: none; }
    #tray.minimized #kofi-footer { display: none; }
    #tray.minimized #kofi-thankyou { display: none; }
    #tray.minimized #resize-all { display: none; }
    #tray.minimized .bar-right { display: none; }
    #tray.minimized #title-text { display: none; }
    #tray.minimized #mini-icon { display: flex !important; }
    #tray.minimized #count { display: none !important; }

    /* ── BAR ── */
    #bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 11px 8px;
      gap: 6px;
      cursor: grab;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255,255,255,0.055);
      user-select: none;
    }
    #bar:active { cursor: grabbing; }

    .bar-left {
      display: flex; align-items: center; gap: 7px; min-width: 0;
    }
    .bar-right {
      display: flex; align-items: center; gap: 3px; flex-shrink: 0;
    }

    #mini-icon {
      display: none;
      align-items: center;
      gap: 6px;
      color: rgba(255,255,255,0.5);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    #mini-icon svg { opacity: .6; }

    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(99,179,237,.8); flex-shrink: 0;
    }
    #title-text {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px; font-weight: 700;
      letter-spacing: .05em; text-transform: uppercase;
      color: rgba(255,255,255,0.4);
      white-space: nowrap;
    }
    #count {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 10px; font-weight: 700;
      background: rgba(99,179,237,.15);
      color: rgba(99,179,237,.9);
      border-radius: 20px;
      padding: 1px 7px;
      display: none;
    }
    #count.on { display: inline-block; }

    .bar-btn {
      background: none; border: none; outline: none;
      cursor: pointer; padding: 4px 5px; border-radius: 7px;
      color: rgba(255,255,255,0.28);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px; font-weight: 500;
      transition: background .13s, color .13s;
      display: flex; align-items: center; gap: 3px;
      white-space: nowrap; flex-shrink: 0;
    }
    .bar-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,.7); }
    .bar-btn.danger:hover { background: rgba(220,50,50,.12); color: rgba(255,100,100,.85); }
    .bar-btn svg { pointer-events: none; flex-shrink: 0; }

    /* ── BODY ── */
    #body {
      flex: 1;
      overflow-y: auto; overflow-x: hidden;
      padding: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.08) transparent;
      min-height: 0;
    }
    #body::-webkit-scrollbar { width: 3px; }
    #body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    /* ── HINT ── */
    #hint {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 8px; padding: 22px 14px;
      border: 1.5px dashed rgba(255,255,255,0.10);
      border-radius: 12px;
      color: rgba(255,255,255,0.2);
      font-size: 11.5px; font-weight: 500;
      text-align: center; line-height: 1.5;
      pointer-events: none;
      transition: border-color .2s, color .2s;
    }
    #tray.drag-over #hint { border-color: rgba(99,179,237,.38); color: rgba(99,179,237,.7); }
    #hint.hidden { display: none; }

    /* ── GRID ── */
    #grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
      gap: 7px;
    }

    /* ── THUMB ── */
    .thumb {
      position: relative;
      aspect-ratio: 1;
      border-radius: 10px;
      cursor: grab;
      flex-shrink: 0;
    }
    .thumb:active { cursor: grabbing; }
    .thumb img {
      width: 100%; height: 100%;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.09);
      display: block;
      pointer-events: none;
      transition: filter .15s, transform .15s, box-shadow .15s;
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      -webkit-user-drag: none; user-select: none;
    }
    .thumb:hover img {
      filter: brightness(1.08);
      transform: scale(1.06);
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    }
    .thumb.out-dragging img {
      filter: brightness(.4) blur(1px);
      transform: scale(.92);
    }

    /* remove btn */
    .thumb-x {
      position: absolute; top: -6px; right: -6px;
      width: 18px; height: 18px;
      background: rgba(18,18,24,0.97);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; opacity: 0;
      transition: opacity .13s, background .13s;
      z-index: 5;
    }
    .thumb:hover .thumb-x { opacity: 1; }
    .thumb-x:hover { background: rgba(200,40,40,0.9) !important; }
    .thumb-x svg { pointer-events: none; }

    /* ── PEEK overlay ── */
    .thumb-peek {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .15s, background .15s;
      cursor: zoom-in; z-index: 4;
    }
    .thumb:hover .thumb-peek { opacity: 1; background: rgba(0,0,0,0.28); }
    .thumb-peek svg { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.7)); pointer-events: none; }

    /* ── LIGHTBOX ── */
    #lightbox {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.88);
      display: none; align-items: center; justify-content: center;
      z-index: 2147483646;
      opacity: 0; pointer-events: none;
      transition: opacity .2s;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      cursor: zoom-out;
    }
    #lightbox.open { display: flex; opacity: 1; pointer-events: all; }
    #lightbox img {
      max-width: 88vw; max-height: 88vh;
      border-radius: 12px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.8);
      border: 1px solid rgba(255,255,255,0.12);
      object-fit: contain;
      transform: scale(.94);
      transition: transform .22s cubic-bezier(.4,0,.2,1);
      pointer-events: none;
    }
    #lightbox.open img { transform: scale(1); }
    #lightbox-close {
      position: absolute; top: 18px; right: 20px;
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 18px;
      transition: background .15s, color .15s;
    }
    #lightbox-close:hover { background: rgba(255,255,255,0.18); color: #fff; }
    #lightbox-label {
      position: absolute; bottom: 22px; left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.4);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px; font-weight: 500;
      background: rgba(0,0,0,0.4);
      padding: 5px 14px; border-radius: 999px;
      white-space: nowrap; pointer-events: none;
    }
    #lightbox-nav {
      position: absolute; bottom: 60px; left: 50%;
      transform: translateX(-50%);
      display: flex; gap: 8px; pointer-events: all;
    }
    .lbnav {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: rgba(255,255,255,0.7);
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px;
      transition: background .13s;
    }
    .lbnav:hover { background: rgba(255,255,255,0.18); color: #fff; }

    /* ── CONFIRM DIALOG ── */
    #confirm {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      display: none; align-items: center; justify-content: center;
      z-index: 2147483647;
      opacity: 0; pointer-events: none;
      transition: opacity .18s;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    #confirm.open { display: flex; opacity: 1; pointer-events: all; }
    #confirm-box {
      background: rgba(14,14,20,0.97);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 24px 28px 20px;
      max-width: 300px; width: 90%;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0,0,0,0.7);
      transform: scale(.95);
      transition: transform .18s cubic-bezier(.4,0,.2,1);
    }
    #confirm.open #confirm-box { transform: scale(1); }
    #confirm-title {
      font-family: system-ui, -apple-system, sans-serif; font-size: 15px; font-weight: 700;
      color: rgba(255,255,255,0.85); margin-bottom: 6px;
    }
    #confirm-msg {
      font-family: system-ui, -apple-system, sans-serif; font-size: 12.5px;
      color: rgba(255,255,255,0.38); line-height: 1.55; margin-bottom: 20px;
    }
    .confirm-actions { display: flex; gap: 8px; justify-content: center; }
    .confirm-btn {
      border: none; outline: none; cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 500;
      padding: 8px 20px; border-radius: 10px;
      transition: opacity .13s, transform .13s;
    }
    .confirm-btn:hover { opacity: .85; }
    .confirm-btn.cancel {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.55);
    }
    .confirm-btn.yes {
      background: rgba(220,50,50,0.85);
      color: #fff;
    }

    /* ── RESIZE HANDLES (all 8 directions) ── */
    .rh {
      position: absolute; pointer-events: all; z-index: 20;
    }
    /* edges */
    .rh-n  { top: -4px;    left: 12px;  right: 12px; height: 8px;  cursor: n-resize; }
    .rh-s  { bottom: -4px; left: 12px;  right: 12px; height: 8px;  cursor: s-resize; }
    .rh-w  { left: -4px;   top: 12px;   bottom: 12px; width: 8px;  cursor: w-resize; }
    .rh-e  { right: -4px;  top: 12px;   bottom: 12px; width: 8px;  cursor: e-resize; }
    /* corners */
    .rh-nw { top: -4px;    left: -4px;  width: 16px; height: 16px; cursor: nw-resize; }
    .rh-ne { top: -4px;    right: -4px; width: 16px; height: 16px; cursor: ne-resize; }
    .rh-sw { bottom: -4px; left: -4px;  width: 16px; height: 16px; cursor: sw-resize; }
    .rh-se { bottom: -4px; right: -4px; width: 16px; height: 16px; cursor: se-resize; }

    /* corner grip dots (visual only on se) */
    .rh-se::after {
      content: '';
      position: absolute; bottom: 5px; right: 5px;
      width: 8px; height: 8px;
      background: radial-gradient(circle, rgba(255,255,255,.25) 1px, transparent 1px) 0 0/3px 3px;
      pointer-events: none;
    }

    /* ── GHOST ── */
    #ghost {
      position: fixed;
      width: 76px; height: 76px;
      border-radius: 12px; overflow: hidden;
      pointer-events: none; z-index: 2147483647;
      box-shadow: 0 12px 36px rgba(0,0,0,0.55);
      border: 2px solid rgba(99,179,237,.65);
      opacity: 0; transition: opacity .1s;
      transform: translate(-50%,-50%) rotate(-2.5deg) scale(1.08);
    }
    #ghost img { width:100%; height:100%; object-fit:cover; display:block; }
    #ghost.show { opacity: .9; }

    /* ── TOAST ── */
    #toast {
      position: fixed; bottom: 22px; left: 50%;
      transform: translateX(-50%) translateY(6px);
      background: rgba(14,14,20,0.96);
      border: 1px solid rgba(255,255,255,0.09);
      color: rgba(255,255,255,0.75);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px; font-weight: 500;
      padding: 7px 16px; border-radius: 999px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      pointer-events: none; z-index: 2147483647;
      opacity: 0; transition: opacity .2s, transform .2s;
      white-space: nowrap;
    }
    #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* ── KOFI FOOTER ── */
    /* Shown once after install. Clearly identified as part of Stash It.  */
    /* Per AMO policy: clearly labelled, dismissible, not injected into   */
    /* web page content, and the add-on functions fully without it.       */
    #kofi-footer {
      flex-shrink: 0;
      border-top: 1px solid rgba(255,255,255,0.055);
      padding: 8px 12px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px;
    }
    #kofi-footer.hidden { display: none; }
    #kofi-link {
      display: flex; align-items: center; gap: 6px;
      color: rgba(255,255,255,0.38);
      font-size: 11px; font-weight: 500;
      text-decoration: none;
      transition: color .13s;
      flex: 1; min-width: 0;
    }
    #kofi-link:hover { color: rgba(255,150,100,.85); }
    #kofi-link svg { flex-shrink: 0; opacity: .6; }
    #kofi-dismiss {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.2); font-size: 13px; padding: 2px 4px;
      border-radius: 5px; line-height: 1;
      transition: color .13s, background .13s;
    }
    #kofi-dismiss:hover { color: rgba(255,255,255,.5); background: rgba(255,255,255,0.06); }
    #kofi-snooze {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.2); font-size: 10px; padding: 2px 6px;
      border-radius: 5px; line-height: 1; white-space: nowrap;
      transition: color .13s, background .13s;
    }
    #kofi-snooze:hover { color: rgba(255,255,255,.5); background: rgba(255,255,255,0.06); }

    /* ── THANKYOU MODAL ── */
    #kofi-thankyou {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483647;
      pointer-events: all;
    }
    #kofi-thankyou.hidden { display: none; }
    #kofi-thankyou-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.45);
    }
    #kofi-thankyou-box {
      position: relative;
      background: rgba(18,18,24,0.97);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      padding: 24px 28px 20px;
      max-width: 280px;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      font-family: system-ui, -apple-system, sans-serif;
      color: rgba(255,255,255,0.8);
    }
    #kofi-thankyou-box p {
      font-size: 13px; line-height: 1.6;
      color: rgba(255,255,255,0.55);
      margin: 8px 0 20px;
    }
    #kofi-thankyou-box strong {
      font-size: 15px;
      color: rgba(255,255,255,0.88);
    }
    #kofi-thankyou-ok {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      font-size: 12px; padding: 7px 20px;
      transition: background .13s;
    }
    #kofi-thankyou-ok:hover { background: rgba(255,255,255,0.14); }
  `;

  shadow.appendChild(styleEl);

  // ── DOM ────────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'tray-root';

  const tray = document.createElement('div');
  tray.id = 'tray';

  // -- Titlebar --
  const bar = document.createElement('div');
  bar.id = 'bar';

  const barLeft = document.createElement('div');
  barLeft.className = 'bar-left';

  const dotEl = document.createElement('span');
  dotEl.className = 'dot';

  const titleText = document.createElement('span');
  titleText.id = 'title-text';
  titleText.textContent = 'Stash';

  const miniIcon = document.createElement('div');
  miniIcon.id = 'mini-icon';
  miniIcon.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
    Stash
  `;

  const countEl = document.createElement('span');
  countEl.id = 'count';

  barLeft.appendChild(dotEl);
  barLeft.appendChild(titleText);
  barLeft.appendChild(miniIcon);
  barLeft.appendChild(countEl);

  const barRight = document.createElement('div');
  barRight.className = 'bar-right';

  // Clear btn
  const clearBtn = document.createElement('button');
  clearBtn.className = 'bar-btn danger';
  clearBtn.title = 'Clear all';
  clearBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="3,1 3,11"/><polyline points="9,1 9,11"/><rect x="1" y="3" width="10" height="8" rx="1"/><line x1="1" y1="1" x2="11" y2="1"/></svg> Clear`;

  // Minimize btn
  const miniBtn = document.createElement('button');
  miniBtn.className = 'bar-btn';
  miniBtn.title = 'Minimize';
  miniBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="2" y1="9" x2="10" y2="9"/></svg>`;

  // Close btn
  const closeBtn = document.createElement('button');
  closeBtn.className = 'bar-btn danger';
  closeBtn.title = 'Close Stash';
  closeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>`;

  barRight.appendChild(clearBtn);
  barRight.appendChild(miniBtn);
  barRight.appendChild(closeBtn);

  bar.appendChild(barLeft);
  bar.appendChild(barRight);

  // -- Body --
  const body = document.createElement('div');
  body.id = 'body';

  const hint = document.createElement('div');
  hint.id = 'hint';
  hint.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Drop images here`;

  const grid = document.createElement('div');
  grid.id = 'grid';

  body.appendChild(hint);
  body.appendChild(grid);

  // -- Resize handles (all 8 directions) --
  const resizeDiv = document.createElement('div');
  resizeDiv.id = 'resize-all';
  ['n','s','e','w','nw','ne','sw','se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `rh rh-${dir}`;
    h.dataset.dir = dir;
    resizeDiv.appendChild(h);
  });

  tray.appendChild(bar);
  tray.appendChild(body);

  // -- Ko-fi donation footer --
  // Shown once after install. Clearly labelled as part of Stash It.
  // Dismissed permanently via storage flag. Does not affect any tray function.
  const kofiFooter = document.createElement('div');
  kofiFooter.id = 'kofi-footer';
  kofiFooter.innerHTML = `
    <a id="kofi-link" href="https://ko-fi.com/kanameshizu" target="_blank" rel="noopener noreferrer">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      Support Stash It on Ko-fi
    </a>
    <button id="kofi-snooze" title="Remind me later">Later</button>
    <button id="kofi-dismiss" title="Dismiss forever">×</button>
  `;
  kofiFooter.classList.add('hidden'); // hidden until storage confirms it's not dismissed
  tray.appendChild(kofiFooter);

  // -- Ko-fi thank-you modal (shown when user permanently dismisses footer) --
  const kofiThankyou = document.createElement('div');
  kofiThankyou.id = 'kofi-thankyou';
  kofiThankyou.classList.add('hidden');
  kofiThankyou.innerHTML = `
    <div id="kofi-thankyou-backdrop"></div>
    <div id="kofi-thankyou-box">
      <strong>Enjoy using Stash It! 📌</strong>
      <p>No worries at all. Happy stashing!</p>
      <button id="kofi-thankyou-ok">Thanks!</button>
    </div>
  `;
  tray.appendChild(kofiThankyou);

  tray.appendChild(resizeDiv);

  // -- Lightbox --
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  const lbImg = document.createElement('img');
  lbImg.alt = '';
  const lbClose = document.createElement('div');
  lbClose.id = 'lightbox-close';
  lbClose.innerHTML = '×';
  const lbLabel = document.createElement('div');
  lbLabel.id = 'lightbox-label';
  const lbNav = document.createElement('div');
  lbNav.id = 'lightbox-nav';
  const lbPrev = document.createElement('div');
  lbPrev.className = 'lbnav'; lbPrev.innerHTML = '←';
  const lbNext = document.createElement('div');
  lbNext.className = 'lbnav'; lbNext.innerHTML = '→';
  lbNav.appendChild(lbPrev);
  lbNav.appendChild(lbNext);
  lightbox.appendChild(lbImg);
  lightbox.appendChild(lbClose);
  lightbox.appendChild(lbLabel);
  lightbox.appendChild(lbNav);

  // -- Confirm dialog --
  const confirm = document.createElement('div');
  confirm.id = 'confirm';
  const confirmBox = document.createElement('div');
  confirmBox.id = 'confirm-box';
  confirmBox.innerHTML = `
    <div id="confirm-title" style="margin-bottom:6px">Close Stash It?</div>
    <div id="confirm-msg">The tray will hide completely. Your stashed images are kept and will reappear when you drag an image onto the page.</div>
    <div class="confirm-actions">
      <button class="confirm-btn cancel" id="confirm-cancel">Cancel</button>
      <button class="confirm-btn yes" id="confirm-yes">Close</button>
    </div>
  `;
  confirm.appendChild(confirmBox);

  // -- Ghost + Toast --
  const ghost = document.createElement('div');
  ghost.id = 'ghost';
  const ghostImg = document.createElement('img');
  ghostImg.alt = '';
  ghost.appendChild(ghostImg);

  const toast = document.createElement('div');
  toast.id = 'toast';

  root.appendChild(tray);
  root.appendChild(lightbox);
  root.appendChild(confirm);
  root.appendChild(ghost);
  root.appendChild(toast);
  shadow.appendChild(root);

  // ── State ────────────────────────────────────────────────────────────────
  let images = [];
  let position = { x: 0, y: 0 };
  let size = { w: 240, h: 300 };
  let mode = 'closed'; // 'open' | 'minimized' | 'closed'
  let externalDragActive = false;
  let outDragActive = false;
  let outDragItem = null;
  let skipWrite = false;
  let isSaving  = false;   // true while a storage write is in-flight
  // Initialised to Date.now() as a safe floor; bumped above any persisted id
  // once images are loaded from storage (see syncFromStorage) to prevent
  // collisions between sessions.
  let idCounter = Date.now();
  let lbIndex = 0;
  let toastTimer = null;

  // ── Storage ──────────────────────────────────────────────────────────────
  // chrome.storage.local limit is 10 MB total. We warn users before writes
  // that would push the stash payload over a conservative 8 MB soft cap so
  // they are never silently dropped.
  const STORAGE_QUOTA_BYTES = 8 * 1024 * 1024; // 8 MB soft cap

  const sg = keys => new Promise(r => chrome.storage.local.get(keys, r));
  const ss = obj  => new Promise(r => chrome.storage.local.set(obj, r));

  function saveImages() {
    if (skipWrite) return;
    const payload = images.map(({ id, src, dataUrl, filename, ts }) => ({ id, src, dataUrl, filename, ts }));
    // Rough byte estimate: JSON string length ≈ byte count for ASCII-safe base64
    const estimatedBytes = JSON.stringify(payload).length;
    if (estimatedBytes > STORAGE_QUOTA_BYTES) {
      showToast('⚠️ Stash is getting large — consider clearing some images.', 3500);
    }
    isSaving = true;
    ss({ [KEY_IMAGES]: payload }).then(() => { isSaving = false; });
  }
  function savePos()     { if (!skipWrite) ss({ [KEY_POS]: position }); }
  function saveSize()    { if (!skipWrite) ss({ [KEY_SIZE]: size }); }
  function saveMode()    { if (!skipWrite) ss({ [KEY_MODE]: mode }); }

  // ── Cross-tab sync + toolbar toggle ─────────────────────────────────────
  // The background script broadcasts every storage change to all tabs.
  // We apply incoming changes directly (skipWrite prevents echo writes) and
  // route mode changes through setMode() so host.style.visibility is always
  // kept in sync — applyMode() alone does not update it.
  //
  // TOOLBAR_TOGGLE is sent by background.js when the user clicks the pinned
  // toolbar button. It opens the tray if closed/minimized, or minimizes it
  // if already open — giving users quick access without needing to drag.
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'TOOLBAR_TOGGLE') {
      if (mode === 'open') {
        setMode('minimized');
      } else {
        // Reveal host before setMode so the open animation plays correctly.
        host.style.visibility = '';
        setMode('open');
      }
      return;
    }
    if (msg.type !== 'STASH_UPDATED') return;
    const ch = msg.changes;
    skipWrite = true;
    if (ch[KEY_IMAGES]) {
      const incoming = ch[KEY_IMAGES].newValue || [];
      const hadFewerBefore = incoming.length > images.length;
      images = incoming;
      // Re-anchor idCounter so new additions on this tab don't collide with
      // ids that were assigned on the tab that wrote the change.
      idCounter = Math.max(idCounter, ...images.map(i => i.id));
      rebuildGrid();
      // A new image arrived from another tab — reveal tray unless user explicitly closed it here.
      if (hadFewerBefore && mode === 'closed') setMode('open');
    }
    if (ch[KEY_POS])  { position = ch[KEY_POS].newValue;  applyPos(); }
    if (ch[KEY_SIZE]) { size     = ch[KEY_SIZE].newValue;  applySize(); }
    // Route through setMode so host.style.visibility is always correct.
    if (ch[KEY_MODE]) setMode(ch[KEY_MODE].newValue);
    updateUI();
    skipWrite = false;
  });

  // ── Position & Size ──────────────────────────────────────────────────────
  function clamp(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const m = 8;
    // When minimized, the pill has auto width/height — use its rendered size.
    // Fall back to full tray size when open so clamping stays accurate.
    const w = (mode === 'minimized') ? (tray.offsetWidth  || 60) : size.w;
    const h = (mode === 'minimized') ? (tray.offsetHeight || 40) : size.h;
    return {
      x: Math.max(m, Math.min(x, vw - w - m)),
      y: Math.max(m, Math.min(y, vh - h - m))
    };
  }

  function applyPos() {
    tray.style.left = position.x + 'px';
    tray.style.top  = position.y + 'px';
  }
  function applySize() {
    tray.style.width  = size.w + 'px';
    tray.style.height = size.h + 'px';
  }
  function applyMode() {
    tray.classList.remove('minimized');
    if (mode === 'minimized') {
      if (tray.style.display === 'none') {
        // Coming from closed: show first so opacity transition can play.
        tray.style.display = '';
        void tray.offsetWidth; // force reflow so opacity:0 is painted before transition starts
      }
      tray.classList.add('minimized');
      tray.classList.add('visible');
    } else if (mode === 'open') {
      if (tray.style.display === 'none') {
        // Coming from closed: show first so opacity transition can play.
        tray.style.display = '';
        void tray.offsetWidth; // force reflow
      }
      tray.classList.add('visible');
    } else {
      // closed: let the opacity/transform transition play out, THEN hide the
      // element so screen-readers and hit-testing are not affected.
      tray.classList.remove('visible');
      const onEnd = () => {
        // Only hide if mode is still closed (user may have re-opened mid-transition).
        if (mode === 'closed') tray.style.display = 'none';
        tray.removeEventListener('transitionend', onEnd);
      };
      tray.addEventListener('transitionend', onEnd);
      // Fallback: if the transition never fires (e.g. prefers-reduced-motion),
      // hide immediately so the tray doesn't stay interactive.
      setTimeout(() => { if (mode === 'closed') tray.style.display = 'none'; }, 300);
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function updateUI() {
    const empty = images.length === 0;
    hint.classList.toggle('hidden', !empty);
    countEl.textContent = images.length;
    countEl.classList.toggle('on', !empty);
    clearBtn.style.display = empty ? 'none' : '';
    if (empty && mode === 'open' && !externalDragActive && !outDragActive) {
      setMode('closed');
    }
  }

  function setMode(m) {
    mode = m;
    applyMode();
    saveMode();
    if (m === 'closed') {
      host.style.visibility = 'hidden';
    } else {
      host.style.visibility = '';
    }
  }

  function showToast(msg, dur = 2000) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), dur);
  }

  // ── Images ───────────────────────────────────────────────────────────────
  function addImage(src, dataUrl, filename) {
    if (src && images.find(i => i.src === src)) { showToast('Already stashed!'); return; }
    const item = { id: ++idCounter, src: src||'', dataUrl: dataUrl||'', filename: filename||'image', ts: Date.now() };
    images.push(item);
    renderThumb(item);
    saveImages();
    showToast(`Stashed! (${images.length})`);
    if (mode !== 'open') setMode('open');
    updateUI();
  }

  function removeImage(id) {
    const idx = images.findIndex(i => i.id === id);
    if (idx === -1) return;
    images.splice(idx, 1);
    shadow.getElementById(`th-${id}`)?.remove();
    saveImages();
    updateUI();
  }

  function clearAll() {
    images = [];
    grid.innerHTML = '';
    saveImages();
    updateUI();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function rebuildGrid() {
    grid.innerHTML = '';
    images.forEach(renderThumb);
  }

  function renderThumb(item) {
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    wrap.id = `th-${item.id}`;
    wrap.draggable = true;

    const img = document.createElement('img');
    img.src = item.dataUrl || item.src;
    img.alt = ''; img.draggable = false;

    const xBtn = document.createElement('div');
    xBtn.className = 'thumb-x';
    xBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" stroke-linecap="round"><line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/></svg>`;

    // Peek button
    const peekBtn = document.createElement('div');
    peekBtn.className = 'thumb-peek';
    peekBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

    wrap.appendChild(img);
    wrap.appendChild(xBtn);
    wrap.appendChild(peekBtn);
    grid.appendChild(wrap);

    xBtn.addEventListener('click', e => { e.stopPropagation(); removeImage(item.id); });
    peekBtn.addEventListener('click', e => { e.stopPropagation(); openLightbox(item); });

    // Drag out
    wrap.addEventListener('dragstart', e => {
      outDragItem = item; outDragActive = true;
      wrap.classList.add('out-dragging');

      const blank = document.createElement('canvas');
      blank.width = blank.height = 1;
      e.dataTransfer.setDragImage(blank, 0, 0);
      e.dataTransfer.effectAllowed = 'copy';

      if (item.dataUrl?.startsWith('data:')) {
        try {
          const arr = du2arr(item.dataUrl);
          const mime = (item.dataUrl.match(/data:([^;]+);/) || [])[1] || 'image/png';
          const file = new File([arr], item.filename, { type: mime });
          e.dataTransfer.items.add(file);
        } catch(_) {}
      }
      e.dataTransfer.setData('text/uri-list', item.src || item.dataUrl);
      e.dataTransfer.setData('text/plain',    item.src || item.dataUrl);
      e.dataTransfer.setData('text/html',     `<img src="${item.src || item.dataUrl}">`);

      ghostImg.src = item.dataUrl || item.src;
      ghost.style.left = e.clientX + 'px';
      ghost.style.top  = e.clientY + 'px';
      ghost.classList.add('show');
    });
    wrap.addEventListener('dragend', () => {
      wrap.classList.remove('out-dragging');
      ghost.classList.remove('show');
      outDragActive = false; outDragItem = null;
    });
  }

  function du2arr(dataUrl) {
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  // ── Lightbox (peek) ──────────────────────────────────────────────────────
  function openLightbox(item) {
    lbIndex = images.findIndex(i => i.id === item.id);
    showLbSlide();
    lightbox.classList.add('open');
  }
  function showLbSlide() {
    const item = images[lbIndex];
    if (!item) return;
    lbImg.src = item.dataUrl || item.src;
    lbLabel.textContent = `${lbIndex + 1} / ${images.length}  ·  ${item.filename}`;
  }
  function closeLightbox() { lightbox.classList.remove('open'); }

  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  lbPrev.addEventListener('click', e => { e.stopPropagation(); lbIndex = (lbIndex - 1 + images.length) % images.length; showLbSlide(); });
  lbNext.addEventListener('click', e => { e.stopPropagation(); lbIndex = (lbIndex + 1) % images.length; showLbSlide(); });

  // keyboard nav in lightbox
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  { lbIndex = (lbIndex - 1 + images.length) % images.length; showLbSlide(); }
    if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % images.length; showLbSlide(); }
  });

  // ── Confirm dialog ───────────────────────────────────────────────────────
  let confirmAction = null; // what the confirm "yes" button will do

  function openConfirmClose() {
    shadow.getElementById('confirm-title').textContent = 'Close Stash It?';
    shadow.getElementById('confirm-msg').textContent   = 'The tray will hide completely. Your stashed images are kept and will reappear when you drag an image onto the page.';
    shadow.getElementById('confirm-yes').textContent   = 'Close';
    confirmAction = () => setMode('closed');
    confirm.classList.add('open');
  }

  function openConfirmClear() {
    shadow.getElementById('confirm-title').textContent = 'Clear all images?';
    shadow.getElementById('confirm-msg').textContent   = 'This will permanently remove all stashed images. This cannot be undone.';
    shadow.getElementById('confirm-yes').textContent   = 'Clear all';
    confirmAction = () => clearAll();
    confirm.classList.add('open');
  }

  function closeConfirm() { confirm.classList.remove('open'); }

  shadow.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  shadow.getElementById('confirm-yes').addEventListener('click', () => {
    closeConfirm();
    if (confirmAction) { confirmAction(); confirmAction = null; }
  });
  confirm.addEventListener('click', e => { if (e.target === confirm) closeConfirm(); });

  // ── Bar buttons ──────────────────────────────────────────────────────────
  clearBtn.addEventListener('click', e => { e.stopPropagation(); openConfirmClear(); });
  miniBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (mode === 'minimized') setMode('open');
    else if (mode === 'open') setMode('minimized');
  });
  closeBtn.addEventListener('click', e => { e.stopPropagation(); openConfirmClose(); });

  // Click minimized pill → expand (only if it wasn't a drag)
  bar.addEventListener('click', e => {
    if (tdMoved) return;
    if (mode === 'minimized' && !e.target.closest('.bar-btn')) {
      setMode('open');
    }
  });

  // ── DRAG TRAY ────────────────────────────────────────────────────────────
  let td = null; // tray drag state
  let tdMoved = false; // true if pointer actually moved during tray drag

  bar.addEventListener('mousedown', e => {
    if (e.button !== 0 || e.target.closest('.bar-btn')) return;
    td = { sx: e.clientX, sy: e.clientY, ox: position.x, oy: position.y };
    tdMoved = false;
    tray.classList.add('tray-dragging');
    e.preventDefault();
  });

  // ── RESIZE ───────────────────────────────────────────────────────────────
  let rd = null; // resize drag state

  resizeDiv.addEventListener('mousedown', e => {
    const dir = e.target.dataset?.dir;
    if (!dir || e.button !== 0) return;
    rd = { dir, sx: e.clientX, sy: e.clientY, ow: size.w, oh: size.h, ox: position.x, oy: position.y };
    tray.classList.add('tray-resizing');
    e.preventDefault(); e.stopPropagation();
  });

  // Both drag handlers on window so they fire even when cursor leaves the shadow
  window.addEventListener('mousemove', e => {
    // Tray drag
    if (td) {
      const dx = e.clientX - td.sx, dy = e.clientY - td.sy;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) tdMoved = true;
      const clamped = clamp(td.ox + dx, td.oy + dy);
      position = clamped;
      applyPos();
      return;
    }

    // Resize
    if (rd) {
      const dx = e.clientX - rd.sx, dy = e.clientY - rd.sy;
      const MIN_W = 160, MIN_H = 110, MAX_W = 560, MAX_H = 640;
      let {ow, oh, ox, oy} = rd;
      let nw = ow, nh = oh, nx = ox, ny = oy;

      const d = rd.dir;
      if (d.includes('e')) nw = Math.max(MIN_W, Math.min(MAX_W, ow + dx));
      if (d.includes('s')) nh = Math.max(MIN_H, Math.min(MAX_H, oh + dy));
      if (d.includes('w')) { nw = Math.max(MIN_W, Math.min(MAX_W, ow - dx)); nx = ox + (ow - nw); }
      if (d.includes('n')) { nh = Math.max(MIN_H, Math.min(MAX_H, oh - dy)); ny = oy + (oh - nh); }

      size = { w: nw, h: nh };
      position = { x: nx, y: ny };
      applyPos(); applySize();
    }
  });

  window.addEventListener('mouseup', () => {
    if (td) { tray.classList.remove('tray-dragging'); savePos(); td = null; }
    if (rd) {
      tray.classList.remove('tray-resizing');
      // If the user dragged to the minimum size, snap to minimized
      const atMinW = size.w <= 160;
      const atMinH = size.h <= 110;
      const shrankW = rd.dir.includes('w') || rd.dir.includes('e');
      const shrankH = rd.dir.includes('n') || rd.dir.includes('s');
      if ((shrankW && atMinW) || (shrankH && atMinH)) {
        setMode('minimized');
      }
      savePos(); saveSize(); rd = null;
    }
    // tdMoved reset happens after click fires (setTimeout 0)
    setTimeout(() => { tdMoved = false; }, 0);
  });

  // Track ghost via document dragover — mousemove stops firing during native drags
  document.addEventListener('dragover', e => {
    if (outDragActive) {
      ghost.style.left = e.clientX + 'px';
      ghost.style.top  = e.clientY + 'px';
    }
  }, true);

  // ── External drag detection ───────────────────────────────────────────────
  let leaveTimer = null;

  function isImgDrag(dt) {
    if (!dt) return false;
    const t = Array.from(dt.types);
    return t.includes('Files') || t.includes('text/uri-list') || t.includes('application/x-moz-file');
  }

  document.addEventListener('dragend', () => {
    // Safety reset: always clear sentinel when any drag ends
    clearTimeout(leaveTimer);
    externalDragActive = false;
    tray.classList.remove('drag-over');
    updateUI();
  }, true);

  document.addEventListener('dragenter', e => {
    if (outDragActive) return;
    if (!isImgDrag(e.dataTransfer)) return;
    clearTimeout(leaveTimer);
    externalDragActive = true;
    if (mode === 'closed') setMode('open');
    updateUI();
  }, true);

  document.addEventListener('dragleave', e => {
    if (outDragActive) return;
    if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
      leaveTimer = setTimeout(() => {
        externalDragActive = false;
        tray.classList.remove('drag-over');
        updateUI();
      }, 120);
    }
  }, true);

  document.addEventListener('drop', e => {
    if (outDragActive) return;
    clearTimeout(leaveTimer);
    tray.classList.remove('drag-over');
    // Only clean up here for drops that missed the tray.
    // The shadow drop handler cleans up tray drops itself after addImage completes.
    if (!tray.contains(e.target) && e.target !== tray) {
      externalDragActive = false;
      updateUI();
    }
  }, true);

  // ── Tray drop (capture on shadow so pointer-events:none parents don't block) ──
  shadow.addEventListener('dragover', e => {
    if (outDragActive) return;
    if (!tray.contains(e.target) && e.target !== tray) return;
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    tray.classList.add('drag-over');
  }, true);
  shadow.addEventListener('dragleave', e => {
    if (!tray.contains(e.relatedTarget) && e.relatedTarget !== tray) tray.classList.remove('drag-over');
  }, true);
  shadow.addEventListener('drop', e => {
    if (outDragActive) return;
    if (!tray.contains(e.target) && e.target !== tray) return;
    e.preventDefault(); e.stopPropagation();
    tray.classList.remove('drag-over');
    // Keep externalDragActive true until addImage runs so updateUI doesn't close tray prematurely

    const files = Array.from(e.dataTransfer.files||[]).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      let pending = files.length;
      files.forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
          addImage(f.name, ev.target.result, f.name);
          if (--pending === 0) { externalDragActive = false; }
        };
        r.readAsDataURL(f);
      });
      return;
    }

    const html = e.dataTransfer.getData('text/html') || '';
    const uri  = e.dataTransfer.getData('text/uri-list') || '';
    const text = e.dataTransfer.getData('text/plain') || '';

    let src = null;
    if (html) { const m = html.match(/src=["']([^"']+)["']/i); if (m) src = m[1]; }
    if (!src && /^https?:\/\//.test(uri))  src = uri.trim().split('\n')[0];
    if (!src && /^https?:\/\//.test(text)) src = text.trim();

    if (src) {
      fetch(src, { mode: 'cors' })
        .then(r => { if (!r.ok) throw new Error('bad status'); return r.blob(); })
        .then(blob => {
          if (!blob.type.startsWith('image/')) throw new Error('not an image');
          const fr = new FileReader();
          fr.onload = ev => {
            const ext = blob.type.split('/')[1] || 'png';
            addImage(src, ev.target.result, `stash.${ext}`);
            externalDragActive = false;
          };
          fr.readAsDataURL(blob);
        })
        .catch(() => {
          // CORS or network failure — don't add a broken thumbnail; inform the user instead.
          showToast("Couldn't fetch image (CORS or network error).", 3000);
          externalDragActive = false;
          updateUI();
        });
    } else {
      externalDragActive = false;
      updateUI();
    }
  }, true);

  // ── Window resize clamping ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const c = clamp(position.x, position.y);
    if (c.x !== position.x || c.y !== position.y) { position = c; applyPos(); }
  });

  // ── Ko-fi footer ─────────────────────────────────────────────────────────
  // - Permanently dismissed (×): never shown again. Shows a brief thank-you modal.
  // - Snoozed ("Later"): footer hidden, re-appears after 7 days.
  const KOFI_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

  function kofiShouldShow(data) {
    if (data[KEY_KOFI]) return false; // permanently dismissed
    if (data[KEY_KOFI_SNOOZE]) {
      return Date.now() - data[KEY_KOFI_SNOOZE] >= KOFI_SNOOZE_MS;
    }
    return true;
  }

  sg([KEY_KOFI, KEY_KOFI_SNOOZE]).then(data => {
    if (kofiShouldShow(data)) kofiFooter.classList.remove('hidden');
  });

  shadow.getElementById('kofi-dismiss').addEventListener('click', () => {
    kofiFooter.classList.add('hidden');
    ss({ [KEY_KOFI]: true });
    // Show thank-you modal briefly
    kofiThankyou.classList.remove('hidden');
  });

  shadow.getElementById('kofi-snooze').addEventListener('click', () => {
    kofiFooter.classList.add('hidden');
    ss({ [KEY_KOFI_SNOOZE]: Date.now() });
  });

  shadow.getElementById('kofi-thankyou-ok').addEventListener('click', () => {
    kofiThankyou.classList.add('hidden');
  });
  shadow.getElementById('kofi-thankyou-backdrop').addEventListener('click', () => {
    kofiThankyou.classList.add('hidden');
  });

  // ── Sync from storage ────────────────────────────────────────────────────
  // Called on init AND whenever this tab becomes visible/focused so the tray
  // always reflects the latest stash without needing a page reload.
  function syncFromStorage() {
    sg([KEY_IMAGES, KEY_POS, KEY_SIZE, KEY_MODE, KEY_KOFI, KEY_KOFI_SNOOZE]).then(data => {
      skipWrite = true;
      size     = data[KEY_SIZE] || { w: 240, h: 300 };
      position = data[KEY_POS]  || { x: window.innerWidth - size.w - 24, y: window.innerHeight - size.h - 24 };
      mode     = data[KEY_MODE] || 'closed';
      images   = data[KEY_IMAGES] || [];

      // Ensure idCounter is always above every id that came out of storage so
      // new additions in this session can never collide with persisted items.
      if (images.length) idCounter = Math.max(idCounter, ...images.map(i => i.id));

      // Show Ko-fi footer only if user has not dismissed it (or snooze period has passed).
      kofiFooter.classList.toggle('hidden', !kofiShouldShow(data));

      // mode is respected as-is — closed stays closed even with images

      // Suppress transitions during initial load so there's no flash or animation
      tray.style.transition = 'none';
      applyPos(); applySize(); applyMode();
      rebuildGrid();
      updateUI();
      skipWrite = false;
      // Force a reflow so 'transition:none' takes effect before we reveal
      void tray.offsetWidth;
      // Only reveal host if there's something to show — closed = stay hidden
      if (mode !== 'closed') host.style.visibility = '';
      // Restore transitions after the frame has painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { tray.style.transition = ''; });
      });
    });
  }

  // ── Tab / window focus sync ───────────────────────────────────────────────
  // Debounce so rapid focus events (e.g. during a drag) don't race with writes.
  let syncTimer = null;
  function scheduledSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (!isSaving) syncFromStorage();
    }, 150);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduledSync();
  });
  window.addEventListener('focus', scheduledSync);

  // ── Init ─────────────────────────────────────────────────────────────────
  syncFromStorage();

})();
