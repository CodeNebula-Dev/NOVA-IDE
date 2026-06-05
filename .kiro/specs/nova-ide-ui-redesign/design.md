# Design Document: Nova IDE UI Redesign

## Overview

This document describes the technical design for the Nova IDE UI redesign — a comprehensive visual and interaction overhaul of the Electron-based IDE. The redesign targets twelve areas: Inter typography, distinctive visual identity (gradient accents, noise texture, glass blur), 4 px grid layout geometry, a command palette, a toast notification system, panel context menus, a redesigned welcome screen, improved settings modal UX, activity bar badge indicators, resizable panel persistence, smooth micro-interactions, and accessible keyboard navigation.

The implementation works entirely within the existing renderer process — `renderer/index.html`, `renderer/styles.css`, `renderer/app.js`, `renderer/icons.js`, and `renderer/agent-panel-manager.js` — plus the Electron main/preload bridge. No new Electron IPC channels or new Node.js dependencies are introduced; all changes are CSS, HTML, and JavaScript in the renderer layer.

### Design Goals

1. **Visual distinctiveness** — Nova IDE should be immediately recognisable and not feel like a VS Code skin.
2. **Typographic clarity** — Inter at correct weights and sizes, applied consistently, with monospace preserved for code surfaces.
3. **Interaction richness** — command palette, context menus, toasts, and keyboard navigation elevate the UX to a professional standard.
4. **Persistence & state** — panel sizes survive restarts; settings apply live without reload.
5. **Accessibility** — full keyboard navigation with visible focus rings and reduced-motion support.

---

## Architecture

The redesign is a pure renderer-side change. The existing architecture is preserved:

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Process (main.js)                        │
│  ├─ BrowserWindow, IPC handlers, pty, DB, Git, AI       │
│  └─ No changes required                                 │
├─────────────────────────────────────────────────────────┤
│  Preload (preload.js)                                   │
│  └─ contextBridge — no changes required                 │
├─────────────────────────────────────────────────────────┤
│  Renderer Process                                       │
│  ├─ index.html      — markup additions (palette, toasts,│
│  │                    context menus, welcome screen)    │
│  ├─ styles.css      — redesigned tokens & components   │
│  ├─ app.js          — event handlers, new modules      │
│  ├─ icons.js        — existing SVG icon set (unchanged) │
│  └─ agent-panel-manager.js — minor status updates      │
└─────────────────────────────────────────────────────────┘
```

### Module Decomposition

New JavaScript logic is added to `app.js` (or extracted into a new `renderer/ui-modules.js`) in clearly scoped, non-conflicting namespaces:

| Module | Location | Responsibility |
|---|---|---|
| `ToastSystem` | `app.js` (or `ui-modules.js`) | showToast API, queue management, animations |
| `CommandPalette` | `app.js` | Palette open/close, search, command registry |
| `ContextMenu` | `app.js` | Right-click menus for tree/tabs/editor |
| `PanelPersistence` | `app.js` | localStorage read/write for panel sizes |
| `KeyboardNav` | `app.js` | Focus trapping, arrow key nav for activity bar and file tree |
| `BadgeManager` | `agent-panel-manager.js` | Activity bar badge count updates |
| `SettingsLivePreview` | `app.js` | Real-time CSS variable updates from settings panel |

---

## Components and Interfaces

### 2.1 Inter Typography System

**CSS Changes (`styles.css`)**

The existing `--font-ui` definition is updated and the Google Fonts `<link>` tag in `index.html` already loads Inter at weights 300–700. No change needed to the `<link>` tag itself.

```css
:root {
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  /* --font-mono unchanged */
}
body {
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

Crucially, Monaco editor and the xterm terminal container must explicitly override to `var(--font-mono)`:

```css
#monacoEditorContainer,
#xtermTerminalContainer {
  font-family: var(--font-mono) !important;
}
```

**Settings live update** — when the user picks a custom font family, `app.js` calls:

```js
document.documentElement.style.setProperty('--font-ui', selectedFont + ', -apple-system, sans-serif');
```

---

### 2.2 Distinctive Visual Identity

**Gradient Accent System**

```css
:root {
  --accent-gradient: linear-gradient(135deg, #cba6f7 0%, #89b4fa 100%);
}
```

Active interactive elements use the gradient:

```css
.activity-btn.active::before { background: var(--accent-gradient); }
.tab.active { border-image: var(--accent-gradient) 1; border-top-width: 1px; }
```

**Noise Texture Overlay**

Applied via an SVG `<filter>` injected into the document and referenced as a CSS `filter` on a `::after` pseudo-element on `.activity-bar` and `.titlebar`:

```css
.activity-bar::after, .titlebar::after {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  filter: url(#nova-noise);
  opacity: 0.03;
}
```

The SVG filter element is injected inline in `index.html`:

```html
<svg style="display:none">
  <filter id="nova-noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
</svg>
```

**Glass Blur**

```css
.ai-header { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.modal-backdrop { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
```

**Reduced Motion**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

---

### 2.3 Layout Geometry & Spacing (4 px Grid)

All spacing tokens in `:root` are confirmed multiples of 4 px. The existing values already largely follow this; a full audit and any corrections are applied:

| Token | Value |
|---|---|
| `--activity-bar-width` | 48px |
| `--sidebar-width` | 240px |
| `--ai-panel-width` | 340px |
| `--titlebar-height` | 38px (≈ 9.5 × 4; allowed as it's a fixed Electron dimension) |
| `--tabs-height` | 36px |
| `--statusbar-height` | 24px |

Drag handle constraints are enforced in `initResizableHandles()`:

- Sidebar: `min: 140px`, `max: 600px`
- AI Panel: `min: 260px`, `max: 700px`
- Terminal: `min: 80px`, `max: 600px`

The sidebar collapse animation is ensured by:

```css
.sidebar {
  transition: width var(--transition-normal); /* 200ms ease */
}
```

---

### 2.4 Command Palette

**HTML (`index.html`)** — added outside the `#app` layout as a top-level overlay:

```html
<div id="commandPalette" class="command-palette hidden" role="dialog" aria-modal="true" aria-label="Command Palette">
  <div class="command-palette-backdrop"></div>
  <div class="command-palette-panel">
    <input id="commandPaletteInput" class="command-palette-input" type="text"
           placeholder="Type a command…" autocomplete="off" spellcheck="false" />
    <ul id="commandPaletteList" class="command-palette-list" role="listbox"></ul>
    <div id="commandPaletteEmpty" class="command-palette-empty hidden">No results</div>
  </div>
</div>
```

**Command Registry** — a plain JS array in `app.js`:

```js
const COMMAND_REGISTRY = [
  { id: 'openFolder',       label: 'Open Folder',        action: handleSelectWorkspace },
  { id: 'newFile',          label: 'New File',            action: handleCreateFile },
  { id: 'newFolder',        label: 'New Folder',          action: handleCreateFolder },
  { id: 'toggleTerminal',   label: 'Toggle Terminal',     action: () => els.terminalToggleBtn.click() },
  { id: 'openSettings',     label: 'Open Settings',       action: () => els.settingsBtn.click() },
  { id: 'toggleAiPanel',    label: 'Toggle AI Panel',     action: toggleAiPanel },
  { id: 'toggleSidebar',    label: 'Toggle Sidebar',      action: toggleSidebar },
  { id: 'newConversation',  label: 'New Conversation',    action: createNewConversation },
];
// Monaco actions appended when editor is initialised
```

**JavaScript Interface (`CommandPalette` module)**:

```js
const CommandPalette = {
  open()  { /* show overlay, focus input, register Escape handler */ },
  close() { /* hide overlay, restore focus to trigger */ },
  filter(query) {
    // case-insensitive substring filter, O(N) — fast enough for <200 items
    return COMMAND_REGISTRY.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
  },
  renderList(commands) { /* build <li> elements in commandPaletteList */ },
  execute(commandId)   { /* find command, call action(), close() */ },
  trapFocus(e)         { /* Tab/Shift+Tab cycles within list + input */ },
};
```

**Key bindings** added in `bindEvents()`:

```js
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
    e.preventDefault();
    CommandPalette.open();
  }
});
```

**CSS** — the palette is a fixed, centred overlay above all other layers (`z-index: 1000`):

```css
.command-palette {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 80px;
}
.command-palette-panel {
  width: 560px; max-width: 90vw;
  background: var(--bg-overlay);
  border: 1px solid var(--border-active);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
```

---

### 2.5 Toast Notification System

**HTML** — a fixed container injected once at startup:

```html
<div id="toastContainer" class="toast-container" aria-live="polite" aria-atomic="false"></div>
```

**JavaScript Interface**:

```js
const ToastSystem = {
  MAX_TOASTS: 4,
  queue: [],        // Array<{ id, el, timerId }>

  show(message, type = 'info', durationMs = 3000) {
    if (this.queue.length >= this.MAX_TOASTS) this._dismiss(this.queue[0].id);
    const id = `toast-${Date.now()}`;
    const el = this._create(id, message, type);
    document.getElementById('toastContainer').appendChild(el);
    this.queue.push({ id, el, timerId: setTimeout(() => this._dismiss(id), durationMs) });
    el.addEventListener('click', () => this._dismiss(id));
  },

  _dismiss(id) {
    const entry = this.queue.find(t => t.id === id);
    if (!entry) return;
    clearTimeout(entry.timerId);
    entry.el.classList.add('toast-exit');
    entry.el.addEventListener('animationend', () => {
      entry.el.remove();
      this.queue = this.queue.filter(t => t.id !== id);
    }, { once: true });
  },

  _create(id, message, type) { /* build toast <div> with icon and message */ }
};

// Public API
window.showToast = (message, type, durationMs) => ToastSystem.show(message, type, durationMs);
```

All existing `showToastNotification(msg)` call sites in `app.js` are replaced with `showToast(msg, 'info')`.

**CSS**:

```css
.toast-container {
  position: fixed; bottom: 32px; right: 16px; z-index: 2000;
  display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
}
.toast { animation: toastIn 200ms ease forwards; }
.toast-exit { animation: toastOut 150ms ease forwards; }

@keyframes toastIn  { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes toastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
```

---

### 2.6 Panel Context Menus

**HTML** — a single reusable context menu element (singleton):

```html
<ul id="contextMenu" class="context-menu hidden" role="menu"></ul>
```

**JavaScript Interface (`ContextMenu` module)**:

```js
const ContextMenu = {
  _trigger: null,   // element that was right-clicked

  show(x, y, items) {
    const el = document.getElementById('contextMenu');
    el.innerHTML = '';
    items.forEach(({ label, action, disabled }) => {
      const li = document.createElement('li');
      li.className = 'context-menu-item' + (disabled ? ' disabled' : '');
      li.setAttribute('role', 'menuitem');
      li.textContent = label;
      if (!disabled) li.addEventListener('click', () => { action(); this.close(); });
      el.appendChild(li);
    });
    el.classList.remove('hidden');
    this._position(el, x, y);
  },

  close() {
    document.getElementById('contextMenu').classList.add('hidden');
  },

  _position(el, x, y) {
    // Place at (x, y), flip if it would overflow viewport
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    const rect = el.getBoundingClientRect();
    if (rect.right  > window.innerWidth)  el.style.left = (x - rect.width)  + 'px';
    if (rect.bottom > window.innerHeight) el.style.top  = (y - rect.height) + 'px';
  }
};

// Global dismiss listeners
document.addEventListener('click',   () => ContextMenu.close());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ContextMenu.close(); });
```

**Wiring in `renderFileTree`** — each `.tree-row` gets a `contextmenu` listener:

```js
row.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const items = node.type === 'file' ? fileContextItems(node) : folderContextItems(node);
  ContextMenu.show(e.clientX, e.clientY, items);
});
```

Tab context menus are similarly wired in `renderTabs()`.

---

### 2.7 Redesigned Welcome Screen

The existing `#welcomeScreen` element is enhanced:

```html
<div id="welcomeScreen" class="welcome-screen">
  <div class="welcome-inner">
    <!-- Logotype -->
    <div class="welcome-logo">
      <span class="welcome-pulse"></span>  <!-- animated gradient dot -->
      <h1 class="welcome-title">Nova IDE</h1>
    </div>
    <p class="welcome-tagline">AI-agent-first code editor for the modern developer.</p>
    <!-- Actions -->
    <div class="welcome-actions">
      <button id="welcomeOpenFolderBtn" class="welcome-btn welcome-btn-primary">Open Folder</button>
      <button id="welcomeOpenFileBtn"   class="welcome-btn welcome-btn-secondary">Open File</button>
    </div>
    <!-- Shortcuts reference -->
    <table class="welcome-shortcuts">
      <tr><td><kbd>⌘P</kbd></td><td>Command Palette</td></tr>
      <tr><td><kbd>⌘K</kbd></td><td>Inline Edit</td></tr>
      <tr><td><kbd>⌘⇧R</kbd></td><td>Review Selection</td></tr>
      <tr><td><kbd>⌘Enter</kbd></td><td>Send to Agent</td></tr>
    </table>
  </div>
</div>
```

**Show/hide logic** uses CSS classes with transitions:

```js
function showWelcomeScreen() {
  const el = document.getElementById('welcomeScreen');
  el.classList.remove('hidden', 'fade-out');
  el.classList.add('fade-in');
}
function hideWelcomeScreen() {
  const el = document.getElementById('welcomeScreen');
  el.classList.replace('fade-in', 'fade-out');
  el.addEventListener('animationend', () => el.classList.add('hidden'), { once: true });
}
```

```css
.welcome-screen.fade-in  { animation: fadeInUp 300ms ease forwards; }
.welcome-screen.fade-out { animation: fadeOut 200ms ease forwards; }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeOut  { from { opacity: 1; } to { opacity: 0; } }
```

---

### 2.8 Improved Settings Modal UX

The settings modal already has four tabs (Appearance, Editor, AI Agent, Terminal) and the basic HTML structure. The redesign adds:

**Live preview** — each settings control triggers an immediate CSS update:

```js
// Appearance tab — theme live preview
uiThemeSelect.addEventListener('change', () => applyThemeTokens(uiThemeSelect.value));
accentColorInput.addEventListener('input', () => {
  const hex = accentColorInput.value;
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-gradient',
    `linear-gradient(135deg, ${hex} 0%, #89b4fa 100%)`);
  markSettingsDirty();
});
fontSizeSelect.addEventListener('change', () => {
  if (state.editor) state.editor.updateOptions({ fontSize: parseInt(fontSizeSelect.value) });
  markSettingsDirty();
});
```

**Unsaved-changes indicator**:

```js
let _settingsDirty = false;
function markSettingsDirty() {
  _settingsDirty = true;
  document.getElementById('saveSettingsBtn').classList.add('has-unsaved');
}
function clearSettingsDirty() {
  _settingsDirty = false;
  document.getElementById('saveSettingsBtn').classList.remove('has-unsaved');
}
```

```css
.has-unsaved::after {
  content: '';
  display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; background: var(--accent);
  margin-left: 6px; vertical-align: middle;
}
```

**Escape / backdrop dismiss** — the modal adds a `keydown` listener for `Escape` and the backdrop gets a click listener, both calling `closeSettingsModal()` without saving.

---

### 2.9 Activity Bar Badge Indicators

**HTML** — each activity button that can have a badge wraps in a container with a `<span class="activity-badge">`:

```html
<button class="activity-btn" data-panel="git">
  <span class="activity-icon" id="iconGit"></span>
  <span class="activity-badge hidden" id="gitBadge"></span>
</button>
```

**JavaScript (`BadgeManager`)** — called after every `refreshGitPanel()`:

```js
function updateGitBadge(changedFileCount) {
  const badge = document.getElementById('gitBadge');
  if (changedFileCount <= 0) {
    badge.classList.add('hidden');
    return;
  }
  badge.textContent = changedFileCount > 99 ? '99+' : String(changedFileCount);
  badge.classList.remove('hidden');
}
```

**CSS**:

```css
.activity-badge {
  position: absolute; top: 4px; right: 4px;
  min-width: 14px; height: 14px; padding: 0 3px;
  border-radius: 7px;
  background: var(--accent-gradient);
  color: var(--bg-overlay);
  font-size: 9px; font-weight: 700; line-height: 14px;
  text-align: center;
  pointer-events: none;
}
```

---

### 2.10 Resizable Panel Persistence

The existing `initResizableHandles()` function in `app.js` is extended to read initial sizes from `localStorage` and write them on each drag-end:

```js
const PERSIST_KEYS = {
  sidebar:   'nova.sidebarWidth',
  aiPanel:   'nova.aiPanelWidth',
  terminal:  'nova.terminalHeight',
};

const PANEL_DEFAULTS = { sidebar: 240, aiPanel: 340, terminal: 200 };
const PANEL_LIMITS   = {
  sidebar:  { min: 140, max: 600 },
  aiPanel:  { min: 260, max: 700 },
  terminal: { min: 80,  max: 600 },
};

function loadPersistedPanelSizes() {
  for (const [key, storageKey] of Object.entries(PERSIST_KEYS)) {
    const raw   = localStorage.getItem(storageKey);
    const value = raw ? parseInt(raw, 10) : NaN;
    const limits = PANEL_LIMITS[key];
    const size  = (!isNaN(value) && value >= limits.min && value <= limits.max)
                  ? value : PANEL_DEFAULTS[key];
    applyPanelSize(key, size);
  }
}

function applyPanelSize(key, size) {
  if (key === 'sidebar') {
    sidebar.style.width = size + 'px';
    document.documentElement.style.setProperty('--sidebar-width', size + 'px');
  } else if (key === 'aiPanel') {
    aiPanel.style.width = size + 'px';
    document.documentElement.style.setProperty('--ai-panel-width', size + 'px');
  } else if (key === 'terminal') {
    termPanel.style.height = size + 'px';
    document.documentElement.style.setProperty('--terminal-height', size + 'px');
  }
}
```

`loadPersistedPanelSizes()` is called at the top of `init()`, before the first render frame.

---

### 2.11 Smooth Micro-Interactions

The CSS token definitions are confirmed and all component transitions reference them. Key additions:

```css
/* Activity bar active indicator transition */
.activity-btn::before {
  content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
  width: 0; /* starts at 0 */
  background: var(--accent-gradient);
  border-radius: 0 2px 2px 0;
  transition: width var(--transition-fast);
}
.activity-btn.active::before { width: 2px; }

/* Tab active top-border transition */
.tab { border-top: 1px solid transparent; transition: border-top-color var(--transition-fast); }
.tab.active { border-top-color: var(--accent); }

/* Chat message fade-in */
.chat-message { animation: fadeInUp 200ms ease-out; }
```

---

### 2.12 Accessible Keyboard Navigation

**Focus ring** — already defined globally in the existing CSS:

```css
:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}
```

All `<button>` and interactive elements are standard HTML elements and thus natively keyboard-focusable.

**Activity Bar arrow navigation** — added in `bindEvents()`:

```js
const activityBtns = [...document.querySelectorAll('.activity-btn')];
activityBtns.forEach((btn, idx) => {
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') activityBtns[(idx + 1) % activityBtns.length].focus();
    if (e.key === 'ArrowUp')   activityBtns[(idx - 1 + activityBtns.length) % activityBtns.length].focus();
  });
});
```

**File tree arrow navigation** — added to `renderFileTree()`. Each `.tree-row` gets `tabindex="0"` and keyboard handlers:

```js
row.setAttribute('tabindex', '0');
row.addEventListener('keydown', (e) => {
  const rows = [...document.querySelectorAll('.tree-row')];
  const i = rows.indexOf(row);
  if (e.key === 'ArrowDown')  { e.preventDefault(); rows[i + 1]?.focus(); }
  if (e.key === 'ArrowUp')    { e.preventDefault(); rows[i - 1]?.focus(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); if (node.type === 'folder') expandFolder(node); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); if (node.type === 'folder') collapseFolder(node); }
  if (e.key === 'Enter')      { e.preventDefault(); node.type === 'file' ? openFile(node.path) : toggleFolder(node); }
});
```

**Focus trapping utility** — shared by Command Palette and Settings Modal:

```js
function trapFocus(containerEl, e) {
  const focusable = [...containerEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.disabled && !el.closest('[hidden]'));
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
}
```

---

## Data Models

The redesign introduces no new persistent data models beyond `localStorage` keys. Existing state in `app.js` gains two small additions:

```js
const state = {
  // … existing fields …
  commandPaletteOpen: false,    // boolean — is palette currently visible
  activeContextMenu: null,      // string | null — which context menu is open
  settingsDirty: false,         // boolean — unsaved changes indicator
};
```

**localStorage keys** (additions):

| Key | Type | Description |
|---|---|---|
| `nova.sidebarWidth` | number (string) | Last user-set sidebar width in px |
| `nova.aiPanelWidth` | number (string) | Last user-set AI panel width in px |
| `nova.terminalHeight` | number (string) | Last user-set terminal height in px |

All existing keys (`openRouterKey`, `groqKey`, settings values) are unchanged.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties cover the logic-rich, input-varying acceptance criteria that benefit from property-based testing. Pure CSS configuration checks, single-state UI checks, and infrastructure checks use example-based or smoke tests instead.

**Property reflection:** After analysis, several criteria naturally group together. Properties 1 and 2 (typography) share the same "any UI element" domain but test different things (variable value vs. exclusion) and are kept separate. Properties 5 and 6 (toast capacity and ordering) can be combined into a single comprehensive eviction property. Properties 7–9 (settings live preview) are kept separate since they test different CSS variables. Properties 10–12 (panel persistence) share the same round-trip pattern and are merged into one persistence property.

---

### Property 1: Inter is applied to all UI text elements

*For any* UI label, menu item, input, or status text element rendered by Nova IDE, its computed `font-family` value shall include `Inter` as the first entry in the font stack.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Monospace surfaces never use Inter

*For any* element that is a descendant of `#monacoEditorContainer` or `#xtermTerminalContainer`, its computed `font-family` value shall NOT start with `Inter` and shall reference `var(--font-mono)`.

**Validates: Requirements 1.5**

---

### Property 3: Interactive element gradient consistency

*For any* interactive element (Activity_Bar button, editor tab, sidebar row) that is in the active state, its `background`, `background-image`, or `border-image` computed value shall reference the `--accent-gradient` value (`linear-gradient(135deg, #cba6f7 0%, #89b4fa 100%)`).

**Validates: Requirements 2.3**

---

### Property 4: Reduced-motion zeroes all animation durations

*For any* CSS animation or transition defined in Nova IDE's stylesheets, when the user's OS reports `prefers-reduced-motion: reduce`, the computed animation/transition duration shall be 0 ms.

**Validates: Requirements 2.6, 11.6**

---

### Property 5: 4 px grid compliance for all spacing values

*For any* pixel-based `padding`, `margin`, or `gap` CSS value declared in `styles.css`, the value shall be evenly divisible by 4.

**Validates: Requirements 3.1**

---

### Property 6: Command palette search is case-insensitive and complete

*For any* search query string entered in the Command_Palette input, every command whose label contains the query (case-insensitive) SHALL appear in the filtered list, and no command whose label does NOT contain the query (case-insensitive) SHALL appear.

**Validates: Requirements 4.3**

---

### Property 7: Command palette keyboard focus never escapes

*For any* sequence of `Tab` and `Shift+Tab` keystrokes pressed while the Command_Palette is open, the focused element SHALL remain within the Command_Palette container.

**Validates: Requirements 4.7, 12.3**

---

### Property 8: Toast auto-dismisses after any valid duration

*For any* positive integer `durationMs` passed to `showToast()`, the toast element SHALL be removed from the DOM within `durationMs + 50 ms` of being added (the 50 ms is a reasonable scheduling tolerance).

**Validates: Requirements 5.3, 5.8**

---

### Property 9: Toast queue enforces oldest-first eviction at capacity 4

*For any* sequence of `showToast()` calls, at any point in time the number of simultaneously visible toasts SHALL be ≤ 4. When a fifth toast is shown while 4 are visible, the toast that was added earliest SHALL be the one dismissed first, and the new toast SHALL be visible.

**Validates: Requirements 5.4, 5.5**

---

### Property 10: Context menu action closes the menu

*For any* context menu item with an associated action, clicking that item SHALL remove the context menu from the DOM (or mark it hidden), regardless of which action is invoked.

**Validates: Requirements 6.4**

---

### Property 11: Context menu always fits within the viewport

*For any* right-click position `(x, y)` on the screen, after the Context_Menu is positioned, its bounding rectangle SHALL be fully contained within `[0, 0, window.innerWidth, window.innerHeight]`. No edge of the menu may overflow outside the viewport.

**Validates: Requirements 6.7**

---

### Property 12: Settings live preview updates Theme_Tokens for any theme

*For any* valid theme option value selected in the Settings_Modal Appearance tab, the CSS custom properties in `:root` (`--bg-base`, `--bg-surface`, `--accent`, etc.) SHALL be updated immediately to reflect that theme's token values, without requiring "Save Settings".

**Validates: Requirements 8.3**

---

### Property 13: Accent color live preview updates both --accent and --accent-gradient

*For any* hex color string entered in the Accent Color picker in the Settings_Modal, both `--accent` and `--accent-gradient` CSS custom properties in `:root` SHALL be updated immediately to reflect the new color.

**Validates: Requirements 8.4**

---

### Property 14: Font size live preview updates Monaco editor option

*For any* font size value selected in the Settings_Modal Appearance tab, the Monaco editor's `fontSize` option (as returned by `editor.getOptions().get(monaco.editor.EditorOption.fontSize)`) SHALL immediately equal the selected value.

**Validates: Requirements 8.5**

---

### Property 15: Settings dirty indicator appears for any touched setting

*For any* settings control that the user interacts with (regardless of whether the new value differs from the original), the "Save Settings" button's unsaved-changes indicator SHALL become visible.

**Validates: Requirements 8.8**

---

### Property 16: Activity bar git badge displays correct count for any positive count

*For any* integer count of uncommitted changed files greater than zero, the git icon badge SHALL be visible and display that count as text. *For any* count that exceeds 99, the badge text SHALL be exactly `"99+"`.

**Validates: Requirements 9.1, 9.3**

---

### Property 17: Panel size persistence round-trip for any valid size

*For any* valid panel width (within allowed min/max range) set by the user via a drag handle, that value SHALL be retrievable from `localStorage` under the correct key immediately after the drag ends. On the next initialisation, the panel SHALL be rendered at that persisted width.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

---

### Property 18: Out-of-range stored panel sizes fall back to defaults

*For any* value stored in `localStorage` for a panel size key that is outside the valid range (below min or above max for that panel), Nova IDE SHALL ignore that value on initialisation and apply the panel's default size instead.

**Validates: Requirements 10.5**

---

### Property 19: Chat messages animate in with fadeIn for any message

*For any* chat message added to the `#chatMessages` container, the new DOM element SHALL have a CSS animation applied with a duration of 200 ms and the `fadeIn` keyframe (opacity 0 → 1, translateY transition).

**Validates: Requirements 11.4**

---

### Property 20: Toast animation applied for any toast shown or dismissed

*For any* toast shown via `showToast()`, its enter animation SHALL use `toastIn` at 200 ms. For any toast dismissed (by auto-timeout or click), its exit animation SHALL use `toastOut` at 150 ms.

**Validates: Requirements 11.5**

---

### Property 21: All interactive controls are keyboard-reachable

*For any* interactive control (button, select, input, tab, tree row) rendered by Nova IDE, the element SHALL have a non-negative `tabIndex` (i.e., be in the natural tab order or explicitly set) and SHALL NOT be `aria-hidden` unless intentionally excluded from interaction.

**Validates: Requirements 12.1**

---

### Property 22: Focus-visible ring appears on any keyboard-focused element

*For any* focusable element in Nova IDE when it receives keyboard focus (`:focus-visible` state), the computed `outline` style SHALL match `1px solid var(--accent)` and `outline-offset` SHALL be `2px`.

**Validates: Requirements 12.2**

---

### Property 23: Settings modal focus trap and restoration

*For any* sequence of `Tab` keystrokes while the Settings_Modal is open, the focused element SHALL remain within the modal container. When the modal closes, focus SHALL be restored to the element that triggered the modal.

**Validates: Requirements 12.4**

---

### Property 24: Activity bar arrow key navigation wraps correctly

*For any* Activity_Bar button at index `i`, pressing `ArrowDown` SHALL move focus to the button at index `(i + 1) mod N`, and pressing `ArrowUp` SHALL move focus to index `(i - 1 + N) mod N`, where `N` is the total count of Activity_Bar buttons.

**Validates: Requirements 12.5**

---

### Property 25: File tree arrow key navigation moves between visible rows

*For any* visible file tree row, pressing `ArrowDown` SHALL move focus to the next visible row and `ArrowUp` SHALL move focus to the previous visible row. Pressing `Enter` on a file row SHALL open that file; pressing `Enter` on a folder row SHALL toggle its expansion state.

**Validates: Requirements 12.6**

---

## Error Handling

### CSS Loading Failures

Inter is loaded from Google Fonts via a `<link>` tag. If the network is unavailable (e.g., offline usage), the font stack falls back to `-apple-system → BlinkMacSystemFont → sans-serif` gracefully. No JS error handling is required.

### localStorage Quota / Access Errors

All `localStorage` writes are wrapped in `try/catch`. If localStorage is unavailable (private browsing, quota exceeded), panel sizes gracefully fall back to defaults and settings are not persisted — a `showToast('Settings could not be saved.', 'warning')` is shown.

```js
function safeLocalStorageSet(key, value) {
  try { localStorage.setItem(key, value); }
  catch (e) { showToast('Could not persist setting: ' + key, 'warning'); }
}
```

### Command Palette Empty State

If `filter()` returns an empty array, the list is hidden and the `#commandPaletteEmpty` element is shown. This is a UI-only concern.

### Context Menu Off-Screen

The `_position()` method handles all four viewport edges. If both the default position and the flipped position would still clip (extremely small viewports), an additional offset clamps the menu to within the viewport bounds.

### Toast System — Invalid Type

If an unknown `type` is passed to `showToast()`, it silently defaults to `'info'` styling rather than throwing.

### Settings Modal — Theme Token Mismatch

If a theme key has no corresponding token map in `THEME_TOKENS`, the modal logs a console warning and leaves the current tokens unchanged, rather than partially applying an incomplete theme.

---

## Testing Strategy

### Dual Testing Approach

Both unit/example-based tests and property-based tests are used:

- **Unit tests** cover specific examples, edge cases, and integration points (e.g., "right-click a file item shows the correct 4 menu items").
- **Property tests** cover universal behaviors that should hold across a wide range of inputs (e.g., "for any search query, filtering is always correct").

### Property-Based Testing Library

Given the project uses Node.js/JavaScript in an Electron renderer context, **fast-check** is the chosen PBT library:

```
npm install --save-dev fast-check
```

Each property test runs a minimum of 100 iterations. Tests run via Jest or Vitest in a jsdom environment that simulates the renderer.

### Property Test Configuration

```js
// Example property test structure
import fc from 'fast-check';

test('Property 6: Command palette filter is correct', () => {
  fc.assert(
    fc.property(fc.string(), (query) => {
      const results = CommandPalette.filter(query);
      const lq = query.toLowerCase();
      // All results contain the query
      results.forEach(r => expect(r.label.toLowerCase()).toContain(lq));
      // No non-matching results are included
      COMMAND_REGISTRY.filter(c => !c.label.toLowerCase().includes(lq))
        .forEach(c => expect(results).not.toContainEqual(c));
    }),
    { numRuns: 200 } // Feature: nova-ide-ui-redesign, Property 6: command palette search is case-insensitive and complete
  );
});
```

Tag format for each property test: `// Feature: nova-ide-ui-redesign, Property N: <property text>`

### Unit Test Coverage Areas

| Area | Test Type | Notes |
|---|---|---|
| Typography token values | Smoke | Verify CSS custom properties at startup |
| Gradient accent value | Smoke | Verify --accent-gradient is defined correctly |
| Noise texture filter | Smoke | Verify SVG filter element exists |
| Glass blur applied | Example | Verify backdrop-filter on ai-header and modal backdrop |
| Layout dimensions | Example | Check widths, heights, padding via computed style |
| ⌘P opens palette | Example | Simulate keydown, verify palette visible |
| Palette command set | Example | Verify required commands in registry |
| Enter executes + closes | Example | Select command, verify action called and palette hidden |
| File tree context menu | Example | Right-click file, verify 4 menu items present |
| Folder context menu | Example | Right-click folder, verify 5 menu items |
| Tab context menu | Example | Right-click tab, verify 4 items |
| Welcome screen content | Example | Verify all required elements in DOM |
| Welcome screen shows/hides | Example | Workspace open/close state transitions |
| Settings tabs | Example | Tab count ≥ 4, switching works |
| Settings save to localStorage | Example | Change setting + save + check localStorage |
| Settings escape = no save | Example | Escape closes without persisting |
| Git badge positioning | Example | Badge has correct styles when visible |
| Badge updates within 500ms | Example | Timing test after git refresh |
| Panel size on init | Example | Set localStorage values, verify panels apply them |

### Integration Tests

The Electron IPC layer (git status → badge count, file operations via context menu) is tested with a minimal integration suite that spawns a real Electron renderer in a test workspace.

### Accessibility Testing

Full WCAG 2.1 AA validation requires manual testing with VoiceOver (macOS) and NVDA (Windows). Automated checks with `axe-core` cover role, label, and focus ring presence.
