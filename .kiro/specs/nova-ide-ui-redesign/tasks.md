# Implementation Plan: Nova IDE UI Redesign

## Overview

Implement the Nova IDE UI redesign as a pure renderer-side overhaul. Seven JS modules are introduced (`ToastSystem`, `CommandPalette`, `ContextMenu`, `PanelPersistence`, `KeyboardNav`, `BadgeManager`, `SettingsLivePreview`), alongside targeted changes to `renderer/styles.css`, `renderer/index.html`, `renderer/app.js`, and `renderer/agent-panel-manager.js`. No new Electron IPC channels or Node.js dependencies are needed beyond `fast-check` for tests.

---

## Tasks

- [x] 1. Set up test infrastructure and CSS design-token foundations
  - Install `fast-check` as a dev dependency (`npm install --save-dev fast-check@3`)
  - Create `renderer/tests/` directory and a shared `test-setup.js` with jsdom helpers and a mock `COMMAND_REGISTRY`
  - In `styles.css` `:root`, add `--accent-gradient: linear-gradient(135deg, #cba6f7 0%, #89b4fa 100%)`
  - Confirm all spacing tokens (`padding`, `margin`, `gap`) in `:root` are multiples of 4 px; correct any that are not
  - Add `--transition-fast: 120ms ease` and `--transition-normal: 200ms ease` (already present — verify they are defined)
  - Add `@media (prefers-reduced-motion: reduce)` block that sets all animation/transition durations to `0ms !important`
  - _Requirements: 2.2, 3.1, 11.1, 2.6, 11.6_

  - [x]* 1.1 Write property test for 4 px grid compliance
    - **Property 5: 4 px grid compliance for all spacing values**
    - Parse all pixel-based `padding`, `margin`, and `gap` declarations from `styles.css` and assert each is divisible by 4
    - **Validates: Requirements 3.1**

  - [x]* 1.2 Write property test for reduced-motion zeroing durations
    - **Property 4: Reduced-motion zeroes all animation durations**
    - Use fast-check to generate arbitrary animation/transition rules; verify that with `prefers-reduced-motion: reduce` applied, all computed durations are `0ms`
    - **Validates: Requirements 2.6, 11.6**

- [-] 2. Inter typography system — CSS and HTML
  - Verify the Google Fonts `<link>` tag for Inter (weights 300–700) is present and loads before any UI chrome in `index.html`
  - Update `--font-ui` in `styles.css` `:root` to `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
  - Ensure `body` has `font-family: var(--font-ui)`, `-webkit-font-smoothing: antialiased`, and `text-rendering: optimizeLegibility`
  - Add `#monacoEditorContainer, #xtermTerminalContainer { font-family: var(--font-mono) !important; }` to prevent Inter from leaking into code surfaces
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.1 Write property test for Inter applied to UI elements
    - **Property 1: Inter is applied to all UI text elements**
    - For an array of sampled UI element selectors (labels, inputs, status items), assert their computed `fontFamily` starts with `"Inter"`
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 2.2 Write property test for monospace surfaces excluding Inter
    - **Property 2: Monospace surfaces never use Inter**
    - For any element that is a descendant of `#monacoEditorContainer` or `#xtermTerminalContainer`, assert computed `fontFamily` does not start with `"Inter"`
    - **Validates: Requirements 1.5**

- [-] 3. Distinctive visual identity — gradient, noise, glass, and brand
  - Apply `background: var(--accent-gradient)` to `.activity-btn.active::before` and use `border-image: var(--accent-gradient) 1` on `.tab.active`
  - Inject the inline SVG noise filter (`<filter id="nova-noise">…</filter>`) into `index.html` just before `</body>`
  - Add `::after` pseudo-element on `.activity-bar` and `.titlebar` referencing `filter: url(#nova-noise); opacity: 0.03`
  - Add `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px)` to `.ai-header` and `.modal-backdrop`
  - Update `.brand-pulse` and `.welcome-pulse` to use `background: var(--accent-gradient)`
  - Add `letter-spacing: 0.12em` to `.brand-name` in the titlebar
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.7_

  - [ ]* 3.1 Write property test for interactive element gradient consistency
    - **Property 3: Interactive element gradient consistency**
    - For each element class in `['.activity-btn.active::before', '.tab.active']`, assert that the computed background or border-image value contains the `--accent-gradient` value
    - **Validates: Requirements 2.3**

- [ ] 4. Layout geometry — spacing audit and drag-handle constraints
  - Audit and enforce CSS sizing tokens: `--activity-bar-width: 48px`, `--sidebar-width: 240px`, `--ai-panel-width: 340px`, `--titlebar-height: 38px`, `--tabs-height: 36px`, `--statusbar-height: 24px`
  - Set `.activity-btn` to `width: 40px; height: 40px; border-radius: 4px`
  - Set `.status-bar` to `height: var(--statusbar-height)` with `padding: 0 8px`
  - Set `.tab` to `padding: 0 14px; max-width: 180px`
  - Verify `.sidebar { transition: width var(--transition-normal); }` exists for collapse animation
  - Confirm `initResizableHandles()` enforces sidebar min 140/max 600, AI panel min 260/max 700, terminal min 80/max 600
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 5. Panel persistence module (`PanelPersistence`)
  - Create `renderer/panel-persistence.js` with `loadPersistedPanelSizes()` and `savePanelSize(key, value)` functions
  - `loadPersistedPanelSizes()` reads `nova.sidebarWidth`, `nova.aiPanelWidth`, `nova.terminalHeight` from `localStorage`, validates against per-panel min/max, falls back to defaults (240, 340, 200) on out-of-range or missing values, then applies via `applyPanelSize(key, size)`
  - Extend each `mouseup` handler in `initResizableHandles()` to call `savePanelSize(key, newSize)` after every drag-end
  - Wrap all `localStorage` writes in `safeLocalStorageSet(key, value)` with try/catch that calls `showToast('Could not persist setting: ' + key, 'warning')`
  - Call `loadPersistedPanelSizes()` at the top of `init()`, before the first render frame
  - Add `<script src="./panel-persistence.js"></script>` to `index.html` before `app.js`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 5.1 Write property test for panel persistence round-trip
    - **Property 17: Panel size persistence round-trip for any valid size**
    - Use fast-check `fc.integer({ min: 140, max: 600 })` (sidebar), `fc.integer({ min: 260, max: 700 })` (AI panel), `fc.integer({ min: 80, max: 600 })` (terminal) to assert `savePanelSize` writes the value and `loadPersistedPanelSizes` reads back the same value
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

  - [ ]* 5.2 Write property test for out-of-range panel size fallback
    - **Property 18: Out-of-range stored panel sizes fall back to defaults**
    - Use fast-check to generate integers outside valid ranges (e.g., `fc.integer({ min: -1000, max: 139 })` for sidebar) and assert `loadPersistedPanelSizes` applies the default value instead
    - **Validates: Requirements 10.5**

- [ ] 6. Toast notification system (`ToastSystem`)
  - Create `renderer/toast-system.js` implementing the `ToastSystem` object with `show(message, type, durationMs)`, `_dismiss(id)`, and `_create(id, message, type)` methods
  - Expose `window.showToast = (message, type, durationMs) => ToastSystem.show(message, type, durationMs)` as the public API
  - Add `<div id="toastContainer" class="toast-container" aria-live="polite" aria-atomic="false"></div>` to `index.html` (outside `#app`, before `</body>`)
  - Add `.toast-container`, `.toast`, `.toast-exit`, `@keyframes toastIn`, and `@keyframes toastOut` CSS rules to `styles.css`
  - Replace all existing `showToastNotification(msg)` call sites in `app.js` with `showToast(msg, 'info')`
  - Add `<script src="./toast-system.js"></script>` to `index.html` before `app.js`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 6.1 Write property test for toast auto-dismiss timing
    - **Property 8: Toast auto-dismisses after any valid duration**
    - Use `fc.integer({ min: 100, max: 10000 })` as `durationMs`; use fake timers to assert the toast element is removed from the DOM within `durationMs + 50ms`
    - **Validates: Requirements 5.3, 5.8**

  - [ ]* 6.2 Write property test for toast queue capacity and oldest-first eviction
    - **Property 9: Toast queue enforces oldest-first eviction at capacity 4**
    - Use fast-check to generate sequences of 1–10 `showToast()` calls; assert that at no point are more than 4 toasts simultaneously visible, and that when a fifth is added the first (by insertion order) is dismissed
    - **Validates: Requirements 5.4, 5.5**

  - [ ]* 6.3 Write property test for toast animation classes
    - **Property 20: Toast animation applied for any toast shown or dismissed**
    - For any call to `showToast()`, assert the created element has the `toast` class (enter animation); for any dismissal, assert the `toast-exit` class is added before removal
    - **Validates: Requirements 11.5**

- [ ] 7. Command palette (`CommandPalette`) — HTML, CSS, and module
  - Add the command palette overlay markup to `index.html` (outside `#app`):
    ```html
    <div id="commandPalette" class="command-palette hidden" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div class="command-palette-backdrop"></div>
      <div class="command-palette-panel">
        <input id="commandPaletteInput" class="command-palette-input" type="text" placeholder="Type a command…" autocomplete="off" spellcheck="false" />
        <ul id="commandPaletteList" class="command-palette-list" role="listbox"></ul>
        <div id="commandPaletteEmpty" class="command-palette-empty hidden">No results</div>
      </div>
    </div>
    ```
  - Add `.command-palette`, `.command-palette-backdrop`, `.command-palette-panel`, `.command-palette-input`, `.command-palette-list`, `.command-palette-empty` CSS rules to `styles.css` (z-index 1000, centered overlay, 560 px panel)
  - Create `renderer/command-palette.js` implementing the `CommandPalette` module with `open()`, `close()`, `filter(query)`, `renderList(commands)`, `execute(commandId)`, and `trapFocus(e)` methods
  - Define `COMMAND_REGISTRY` in `command-palette.js` with the required commands: "Open Folder", "New File", "New Folder", "Toggle Terminal", "Open Settings", "Toggle AI Panel", "Toggle Sidebar", "New Conversation"
  - In `app.js` `initMonaco()`, append all registered Monaco editor actions to `COMMAND_REGISTRY` after the editor is created
  - Wire `⌘P` / `Ctrl+P` in `bindEvents()` to call `CommandPalette.open()`; wire `Escape` inside the palette to call `CommandPalette.close()`; wire `Enter`/click on list items to call `CommandPalette.execute(id)`
  - Add `<script src="./command-palette.js"></script>` to `index.html` before `app.js`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 7.1 Write property test for command palette search correctness
    - **Property 6: Command palette search is case-insensitive and complete**
    - Use `fc.string()` as the query; assert every matching command (case-insensitive contains) is present in results and no non-matching command appears
    - **Validates: Requirements 4.3**

  - [ ]* 7.2 Write property test for command palette focus trapping
    - **Property 7: Command palette keyboard focus never escapes**
    - Use fast-check to generate arbitrary-length sequences of `Tab` / `Shift+Tab` keypresses; assert that after each keypress the focused element's `closest('#commandPalette')` is non-null
    - **Validates: Requirements 4.7, 12.3**

- [ ] 8. Context menu system (`ContextMenu`) — HTML, CSS, and module
  - Add `<ul id="contextMenu" class="context-menu hidden" role="menu"></ul>` to `index.html` (outside `#app`, before `</body>`)
  - Add `.context-menu`, `.context-menu-item`, `.context-menu-item.disabled`, `.context-menu-item:hover` CSS to `styles.css`
  - Create `renderer/context-menu.js` implementing `ContextMenu` with `show(x, y, items)`, `close()`, and `_position(el, x, y)` methods; `_position` must handle all four viewport edges and apply additional offset if both default and flipped positions still clip
  - Wire `contextmenu` events on `.tree-row` elements in `renderFileTree()` in `app.js`: files show "Open", "Rename", "Delete", "Copy Path"; folders show "New File", "New Folder", "Rename", "Delete", "Copy Path"
  - Wire `contextmenu` events on `.tab` elements in `renderTabs()` in `app.js`: show "Close Tab", "Close Other Tabs", "Close All Tabs", "Copy File Path"
  - Register global `click` and `Escape` keydown listeners on `document` to call `ContextMenu.close()`
  - Add `<script src="./context-menu.js"></script>` to `index.html` before `app.js`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 8.1 Write property test for context menu action closes menu
    - **Property 10: Context menu action closes the menu**
    - Use fast-check to generate arbitrary item arrays; for each item, clicking it should result in `#contextMenu` having class `hidden` or being removed from DOM
    - **Validates: Requirements 6.4**

  - [ ]* 8.2 Write property test for context menu viewport containment
    - **Property 11: Context menu always fits within the viewport**
    - Use `fc.tuple(fc.integer({ min: 0, max: 1920 }), fc.integer({ min: 0, max: 1080 }))` as `(x, y)`; after calling `ContextMenu._position(el, x, y)`, assert `el.getBoundingClientRect()` is fully within `[0, window.innerWidth] × [0, window.innerHeight]`
    - **Validates: Requirements 6.7**

- [~] 9. Checkpoint — core modules wired up
  - Ensure all tests pass, ask the user if questions arise.

- [~] 10. Welcome screen redesign
  - Replace the inner content of `#welcomeScreen` in `index.html` with the updated markup: gradient-dot logotype, tagline, "Open Folder"/"Open File" action buttons, and a `<table class="welcome-shortcuts">` with four rows (⌘P, ⌘K, ⌘⇧R, ⌘Enter)
  - Add or update CSS for `.welcome-screen.fade-in` (`@keyframes fadeInUp`: opacity 0→1, translateY 12px→0, 300ms) and `.welcome-screen.fade-out` (`@keyframes fadeOut`: opacity 1→0, 200ms)
  - Update `showWelcomeScreen()` in `app.js` to add `fade-in` class and remove `hidden` and `fade-out`
  - Update `hideWelcomeScreen()` in `app.js` to swap `fade-in` for `fade-out`, then add `hidden` only after the `animationend` event fires (allowing fade-in to complete first per Req 7.6)
  - Animate `.welcome-pulse` with a CSS `pulse` keyframe identical to `.brand-pulse` in the Title_Bar
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 11. Settings modal UX improvements (`SettingsLivePreview`)
  - Create `renderer/settings-live-preview.js` implementing the `SettingsLivePreview` module
  - Implement `markSettingsDirty()` that sets `_settingsDirty = true` and adds class `has-unsaved` to `#saveSettingsBtn`; implement `clearSettingsDirty()` that clears the flag and removes the class
  - Add CSS `.has-unsaved::after` rule (6×6 px `--accent`-coloured dot appended to the Save button)
  - Wire live-preview listeners in `bindEvents()` or the `SettingsLivePreview.init()` method:
    - `#uiThemeSelect` → `applyThemeTokens(value)` + `markSettingsDirty()`
    - `#accentColorInput` → update `--accent` and `--accent-gradient` immediately + `markSettingsDirty()`
    - `#fontSizeSelect` → `state.editor.updateOptions({ fontSize })` + `markSettingsDirty()`
    - `#fontFamilySelect` → `document.documentElement.style.setProperty('--font-ui', ...)` + `markSettingsDirty()`
    - All other settings controls → `markSettingsDirty()` on any `change`/`input` event
  - Add `Escape` keydown listener and modal-backdrop click listener that call `closeSettingsModal()` (no save)
  - Call `clearSettingsDirty()` inside the existing `saveSettings()` function after persisting
  - Add `<script src="./settings-live-preview.js"></script>` to `index.html` before `app.js`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 11.1 Write property test for settings live preview — theme tokens
    - **Property 12: Settings live preview updates Theme_Tokens for any theme**
    - Use `fc.constantFrom(...Object.keys(THEME_TOKENS))` as the theme value; after simulating a `change` event, assert all `:root` tokens are immediately updated
    - **Validates: Requirements 8.3**

  - [ ]* 11.2 Write property test for accent color live preview
    - **Property 13: Accent color live preview updates both --accent and --accent-gradient**
    - Use `fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h)` as the color value; after simulating an `input` event on `#accentColorInput`, assert `getComputedStyle(document.documentElement).getPropertyValue('--accent')` and `--accent-gradient` both contain the new color
    - **Validates: Requirements 8.4**

  - [ ]* 11.3 Write property test for font size live preview
    - **Property 14: Font size live preview updates Monaco editor option**
    - Use `fc.constantFrom('12', '14', '16', '18')` as the font size; after simulating a `change` event on `#fontSizeSelect`, assert `editor.getOptions().get(monaco.editor.EditorOption.fontSize)` equals the selected integer
    - **Validates: Requirements 8.5**

  - [ ]* 11.4 Write property test for settings dirty indicator
    - **Property 15: Settings dirty indicator appears for any touched setting**
    - Use fast-check to pick an arbitrary settings control selector; simulate an interaction; assert `#saveSettingsBtn.classList.contains('has-unsaved')` is true
    - **Validates: Requirements 8.8**

- [ ] 12. Activity bar badge indicators (`BadgeManager`)
  - Add `<span class="activity-badge hidden" id="gitBadge"></span>` inside the git `<button class="activity-btn">` in `index.html`
  - Add `.activity-badge` CSS rule to `styles.css`: `position: absolute; top: 4px; right: 4px; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 7px; background: var(--accent-gradient); color: var(--bg-overlay); font-size: 9px; font-weight: 700; line-height: 14px; pointer-events: none`
  - Implement `updateGitBadge(changedFileCount)` in `renderer/agent-panel-manager.js` inside the `BadgeManager` section: hide badge when count ≤ 0, show and set text to `count > 99 ? '99+' : String(count)` otherwise
  - Call `updateGitBadge(changedFiles.length)` in `app.js` inside `refreshGitPanel()` after the git status is parsed, within 500 ms of receiving the updated file list
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 12.1 Write property test for git badge display for any positive count
    - **Property 16: Activity bar git badge displays correct count for any positive count**
    - Use `fc.integer({ min: 1, max: 200 })` as `changedFileCount`; after calling `updateGitBadge(count)`, assert badge is visible and text equals `count > 99 ? '99+' : String(count)`
    - **Validates: Requirements 9.1, 9.3**

- [ ] 13. Keyboard navigation module (`KeyboardNav`)
  - Create `renderer/keyboard-nav.js` implementing the `KeyboardNav` module with `initActivityBarArrows()`, `initFileTreeArrows()`, and `trapFocus(containerEl, e)` utilities
  - `initActivityBarArrows()`: query all `.activity-btn`; on `keydown`, `ArrowDown` moves to index `(i + 1) mod N` and `ArrowUp` to `(i - 1 + N) mod N`
  - `initFileTreeArrows()`: after `renderFileTree()`, attach `tabindex="0"` and `keydown` handlers to all `.tree-row` elements for `ArrowDown`, `ArrowUp`, `ArrowRight` (expand folder), `ArrowLeft` (collapse folder), `Enter` (open file or toggle folder)
  - `trapFocus(containerEl, e)`: collect all focusable descendants, cycle `Tab`/`Shift+Tab` within them
  - Call `trapFocus` from the Command Palette `keydown` handler and the Settings Modal `keydown` handler
  - Restore focus to the triggering element when the Settings Modal closes (`closeSettingsModal()` stores `document.activeElement` before opening and restores it on close)
  - Ensure `:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }` is present in `styles.css`
  - Add `<script src="./keyboard-nav.js"></script>` to `index.html` before `app.js`
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 13.1 Write property test for activity bar arrow key navigation wraps
    - **Property 24: Activity bar arrow key navigation wraps correctly**
    - Use `fc.integer({ min: 0, max: N-1 })` as the starting index and `fc.array(fc.constantFrom('ArrowDown', 'ArrowUp'))` as the key sequence; assert final focus index equals `(start + net) mod N`
    - **Validates: Requirements 12.5**

  - [ ]* 13.2 Write property test for file tree arrow key navigation
    - **Property 25: File tree arrow key navigation moves between visible rows**
    - Use fast-check to generate a sequence of `ArrowDown` / `ArrowUp` presses on a mock tree; assert focus moves to the correct adjacent visible row and never escapes the tree container
    - **Validates: Requirements 12.6**

  - [ ]* 13.3 Write property test for settings modal focus trap and restoration
    - **Property 23: Settings modal focus trap and restoration**
    - Use fast-check to generate `Tab` key sequences; assert focused element always remains within `#settingsModal`; assert focus is restored to the trigger element on close
    - **Validates: Requirements 12.4**

  - [ ]* 13.4 Write property test for all interactive controls keyboard-reachable
    - **Property 21: All interactive controls are keyboard-reachable**
    - Query all buttons, selects, inputs, and `[tabindex]` elements; assert none have `tabIndex < 0` unless intentionally excluded, and none are `aria-hidden` while still interactive
    - **Validates: Requirements 12.1**

  - [ ]* 13.5 Write property test for focus-visible ring on any focused element
    - **Property 22: Focus-visible ring appears on any keyboard-focused element**
    - Use fast-check to pick arbitrary focusable elements from the DOM; simulate keyboard focus; assert computed `outline` matches `1px solid var(--accent)` and `outlineOffset` is `2px`
    - **Validates: Requirements 12.2**

- [ ] 14. Smooth micro-interactions — CSS animation wiring
  - Update `.activity-btn::before` to start at `width: 0` and transition to `width: 2px` on `.activity-btn.active::before` using `var(--transition-fast)`
  - Ensure `.tab { border-top: 1px solid transparent; transition: border-top-color var(--transition-fast); }` and `.tab.active { border-top-color: var(--accent); }`
  - Verify `.chat-message { animation: fadeInUp 200ms ease-out; }` exists (uses existing `fadeInUp` keyframe)
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 14.1 Write property test for chat message fade-in animation
    - **Property 19: Chat messages animate in with fadeIn for any message**
    - Use fast-check to generate arbitrary message content strings; after each `addChatMessage()` call, assert the new DOM element has a CSS animation with duration `200ms` and an opacity keyframe
    - **Validates: Requirements 11.4**

- [~] 15. Script loading order — wire all new modules into `index.html`
  - Ensure `index.html` loads scripts in this order before `app.js`:
    1. `icons.js` (existing)
    2. `provider-detector.js` (existing)
    3. `diff-manager.js` (existing)
    4. `agent-panel-manager.js` (existing, now includes `BadgeManager`)
    5. `panel-persistence.js` (new)
    6. `toast-system.js` (new)
    7. `command-palette.js` (new)
    8. `context-menu.js` (new)
    9. `settings-live-preview.js` (new)
    10. `keyboard-nav.js` (new)
    11. `app.js` (existing, now calls all modules)
  - Verify no duplicate event listener registrations exist between `app.js` and the new modules (each module self-initialises, `app.js` only wires cross-module calls)
  - _Requirements: all_

- [~] 16. Final checkpoint — run all tests and verify rendering
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP development
- Each task references specific requirements for traceability
- Checkpoints (tasks 9 and 16) ensure incremental validation before proceeding
- Property tests use `fast-check` (install via `npm install --save-dev fast-check`); run via `npx vitest --run` or a Jest config pointing at `renderer/tests/`
- Unit tests validate specific examples and edge cases; property tests validate universal behaviors across generated inputs
- The design document's Correctness Properties section lists 25 properties — tasks above implement property tests for all logic-rich properties (1–25); pure CSS/smoke checks are left to example-based unit tests
- No changes to `main.js`, `preload.js`, or the Electron IPC layer are required

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["5.1", "5.2", "6.1", "6.2", "6.3", "7.1", "7.2", "8.1", "8.2"] },
    { "id": 3, "tasks": ["11.1", "11.2", "11.3", "11.4", "12.1"] },
    { "id": 4, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5", "14.1"] }
  ]
}
```
