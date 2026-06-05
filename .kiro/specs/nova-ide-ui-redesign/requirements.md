# Requirements Document

## Introduction

This feature covers a comprehensive UI redesign of Nova IDE — an Electron-based, AI-agent-first code editor. The redesign targets three goals: a visually distinctive and modern look that stands out from mainstream IDEs like VS Code and Cursor; a smooth typographic system using Inter as the primary UI font; and a richer set of UI-level features including a command palette, a notifications system, per-panel context menus, a workspace welcome screen, and improved settings UX. The existing Catppuccin Mocha colour palette and Monaco editor integration are preserved; the redesign refines layout, component polish, motion, and added UI surfaces.

---

## Glossary

- **Nova_IDE**: The Electron renderer process that hosts the full IDE UI.
- **Activity_Bar**: The narrow icon-only navigation strip on the far left.
- **Sidebar**: The collapsible panel hosting the file explorer, search, and git views.
- **Editor_Area**: The central pane containing the Monaco editor, tab bar, and breadcrumbs.
- **AI_Panel**: The right-side panel containing the Nova Agent chat interface.
- **Status_Bar**: The single-line footer showing language, cursor position, encoding, and agent status.
- **Title_Bar**: The custom Electron titlebar at the top of the window.
- **Command_Palette**: A modal overlay for searching and executing IDE commands.
- **Notification_System**: A toast/snackbar mechanism for surfacing ephemeral feedback.
- **Context_Menu**: A right-click popup providing actions relevant to the target element.
- **Welcome_Screen**: The full-editor placeholder shown when no workspace is open.
- **Settings_Modal**: The multi-tab modal for configuring appearance, editor, AI, and terminal options.
- **Inter**: The Google Fonts variable-weight sans-serif typeface (weights 300–700) used as the primary UI font.
- **Theme_Token**: A CSS custom property (variable) that maps a semantic name to a colour value.
- **Drag_Handle**: A narrow interactive strip between resizable panels.

---

## Requirements

### Requirement 1: Inter Typography System

**User Story:** As a developer, I want Nova IDE's UI text to use the Inter font so that the interface feels smooth, modern, and readable at every weight and size.

#### Acceptance Criteria

1. THE Nova_IDE SHALL load Inter (weights 300, 400, 500, 600, 700) via the existing Google Fonts `<link>` tag before rendering any UI chrome.
2. THE Nova_IDE SHALL assign Inter as the first entry in `--font-ui`, falling back to `-apple-system`, `BlinkMacSystemFont`, then `sans-serif`.
3. WHEN a UI element renders any label, menu item, input, or status text, THE Nova_IDE SHALL apply `font-family: var(--font-ui)` to that element.
4. THE Nova_IDE SHALL enable `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility` globally on the `body` element.
5. THE Nova_IDE SHALL NOT apply Inter to code displayed inside the Monaco editor or terminal; those surfaces SHALL continue to use `var(--font-mono)`.
6. WHERE the user selects a custom font family in the Settings_Modal Appearance tab, THE Nova_IDE SHALL update `--font-ui` to the selected value without requiring a restart.

---

### Requirement 2: Distinctive Visual Identity — Colour & Surface Redesign

**User Story:** As a developer, I want Nova IDE to have a unique visual identity so that it feels different from generic dark-theme IDEs.

#### Acceptance Criteria

1. THE Nova_IDE SHALL maintain the existing Catppuccin Mocha base palette (`--bg-base`, `--bg-surface`, `--bg-overlay`, etc.) as default Theme_Tokens.
2. THE Nova_IDE SHALL introduce a gradient accent system: the primary accent SHALL be expressed as `linear-gradient(135deg, #cba6f7 0%, #89b4fa 100%)` and stored in a new `--accent-gradient` CSS custom property.
3. WHEN an interactive element (button, active tab, active sidebar row) uses the accent, THE Nova_IDE SHALL apply `--accent-gradient` via `background` or `border-image` rather than a flat colour.
4. THE Nova_IDE SHALL add a subtle noise texture overlay (SVG `feTurbulence` filter, `opacity: 0.03`) to the Activity_Bar and Title_Bar backgrounds to break up flat colour monotony.
5. THE Nova_IDE SHALL apply a `backdrop-filter: blur(12px)` glass effect to the AI_Panel header and the Settings_Modal backdrop.
6. IF the user's OS reports `prefers-reduced-motion: reduce`, THEN THE Nova_IDE SHALL disable all CSS animations and transitions that exceed 100 ms.
7. THE Nova_IDE SHALL render the Title_Bar brand name with a letter-spacing of `0.12em` and the gradient accent applied to the brand pulse dot via `background: var(--accent-gradient)`.

---

### Requirement 3: Refined Layout Geometry & Spacing

**User Story:** As a developer, I want all panels, gaps, and typographic scales to follow a consistent 4 px baseline grid so that the IDE feels tight and intentional, not ad-hoc.

#### Acceptance Criteria

1. THE Nova_IDE SHALL define all spacing values (`padding`, `margin`, `gap`) in multiples of 4 px.
2. THE Activity_Bar SHALL have a fixed width of 48 px and use 40 × 40 px icon buttons with 4 px border-radius.
3. THE Sidebar default width SHALL be 240 px, minimum 140 px, and maximum 600 px when dragged via the Drag_Handle.
4. THE AI_Panel default width SHALL be 340 px, minimum 260 px, and maximum 700 px when dragged.
5. THE Status_Bar SHALL have a fixed height of 24 px with 0 px top padding and 8 px left/right padding on each item.
6. THE Title_Bar SHALL have a fixed height of 38 px.
7. WHEN the Sidebar is collapsed, THE Nova_IDE SHALL animate its width to 0 px over 200 ms using `ease` timing, keeping the Activity_Bar visible.
8. THE Editor_Area tab bar SHALL have a fixed height of 36 px; individual tabs SHALL have 0 14px horizontal padding and a maximum width of 180 px with text-overflow ellipsis.

---

### Requirement 4: Command Palette

**User Story:** As a developer, I want a searchable command palette (⌘P / Ctrl+P) so that I can quickly access IDE actions without navigating menus.

#### Acceptance Criteria

1. WHEN the user presses `⌘P` (macOS) or `Ctrl+P` (Windows/Linux), THE Nova_IDE SHALL open the Command_Palette modal overlay.
2. WHEN the Command_Palette is open, THE Nova_IDE SHALL display a text input field at the top and a filtered list of commands beneath it; WHEN the Command_Palette is closed, THE Nova_IDE SHALL hide both the input field and the command list immediately.
3. WHEN the user types in the Command_Palette input, THE Nova_IDE SHALL filter the command list to entries whose labels contain the typed string (case-insensitive) within 50 ms of each keystroke; IF filtering takes longer than 50 ms, THE Nova_IDE SHALL still display the filtered results once complete.
4. THE Command_Palette SHALL expose at minimum the following commands: "Open Folder", "New File", "New Folder", "Toggle Terminal", "Open Settings", "Toggle AI Panel", "Toggle Sidebar", "New Conversation", and all registered Monaco editor actions.
5. WHEN the user presses `Enter` or clicks a command in the Command_Palette list, THE Nova_IDE SHALL execute that command and close the palette.
6. WHEN the user presses `Escape` while the Command_Palette is open, THE Nova_IDE SHALL close the palette without executing any command.
7. THE Command_Palette SHALL trap keyboard focus: `Tab` and `Shift+Tab` SHALL cycle through list items; arrow keys SHALL also navigate the list.
8. IF no commands match the search query, THEN THE Nova_IDE SHALL display a "No results" placeholder inside the Command_Palette list.

---

### Requirement 5: Notification & Toast System

**User Story:** As a developer, I want brief, non-blocking toast notifications for IDE feedback so that I know the result of actions without losing my editing context.

#### Acceptance Criteria

1. THE Nova_IDE SHALL provide a `showToast(message, type, durationMs)` API accessible from any renderer module, where `type` is one of `"info"`, `"success"`, `"warning"`, or `"error"`.
2. WHEN `showToast` is called, THE Notification_System SHALL render a toast in the bottom-right corner of the window, outside all panel z-layers.
3. THE Notification_System SHALL auto-dismiss each toast after the specified `durationMs` (default: 3000 ms) using a CSS opacity + translateY exit animation.
4. THE Notification_System SHALL display up to 4 toasts simultaneously, stacking them vertically with an 8 px gap.
5. WHEN a fifth toast is triggered while 4 are visible, THE Notification_System SHALL dismiss the oldest toast before showing the new one.
6. WHEN the user clicks a toast, THE Notification_System SHALL dismiss it immediately.
7. THE Nova_IDE SHALL replace all existing `showToastNotification` call sites with calls to the new `showToast` API.
8. IF `type` is `"error"`, THEN THE Notification_System SHALL auto-dismiss the toast after the specified `durationMs`, consistent with all other toast types.

---

### Requirement 6: Panel Context Menus

**User Story:** As a developer, I want right-click context menus on file tree items, editor tabs, and the editor gutter so that I can access item-specific actions without hunting in toolbars.

#### Acceptance Criteria

1. WHEN the user right-clicks a file item in the Sidebar file tree, THE Nova_IDE SHALL display a Context_Menu with at minimum the actions: "Open", "Rename", "Delete", and "Copy Path".
2. WHEN the user right-clicks a folder item in the Sidebar file tree, THE Nova_IDE SHALL display a Context_Menu with at minimum the actions: "New File", "New Folder", "Rename", "Delete", and "Copy Path".
3. WHEN the user right-clicks an Editor_Area tab, THE Nova_IDE SHALL display a Context_Menu with the actions "Close Tab", "Close Other Tabs", "Close All Tabs", and "Copy File Path" available for selection; no action needs to be pre-selected or highlighted.
4. WHEN a Context_Menu action is invoked, THE Nova_IDE SHALL execute the corresponding operation and close the menu.
5. WHEN the user clicks anywhere outside an open Context_Menu, THE Nova_IDE SHALL close the menu without performing any action.
6. WHEN the user presses `Escape` while a Context_Menu is open, THE Nova_IDE SHALL close it without performing any action.
7. THE Context_Menu SHALL be positioned so it remains fully within the viewport; IF the default position would clip the menu, THEN THE Nova_IDE SHALL flip the menu to the opposite side; IF flipping still results in clipping, THEN THE Nova_IDE SHALL apply additional offset positioning to ensure the menu fits fully within the viewport.

---

### Requirement 7: Redesigned Welcome Screen

**User Story:** As a developer, I want a visually polished welcome screen when no workspace is open so that Nova IDE makes a strong first impression.

#### Acceptance Criteria

1. WHEN no workspace is open, THE Nova_IDE SHALL display the Welcome_Screen centred in the Editor_Area in place of the Monaco editor; WHEN any workspace is opened while the Welcome_Screen is visible, THE Nova_IDE SHALL hide it immediately.
2. THE Welcome_Screen SHALL display the Nova IDE logotype, a one-line tagline, primary "Open Folder" and secondary "Open File" action buttons, and a keyboard shortcut reference table.
3. THE Welcome_Screen SHALL animate in with a `fadeIn` keyframe (opacity 0 → 1, translateY 12px → 0) over 300 ms on first render.
4. WHEN the user clicks "Open Folder" on the Welcome_Screen, THE Nova_IDE SHALL invoke the folder picker IPC call.
5. THE Welcome_Screen logotype pulse dot SHALL animate using a CSS `pulse` keyframe identical to the Title_Bar brand dot.
6. WHEN a workspace is opened, THE Nova_IDE SHALL allow the Welcome_Screen fade-in animation to complete before starting the fade-out (opacity 1 → 0 over 200 ms) and then hiding it.

---

### Requirement 8: Improved Settings Modal UX

**User Story:** As a developer, I want the Settings_Modal to be easier to navigate and apply changes in real time so that I can tune the IDE without save/reload cycles.

#### Acceptance Criteria

1. THE Settings_Modal SHALL be divided into at least four tabs: "Appearance", "Editor", "AI Agent", and "Terminal".
2. WHEN the user switches tabs in the Settings_Modal, THE Nova_IDE SHALL display the corresponding settings pane within 50 ms.
3. WHEN the user changes the UI Theme in the Appearance tab, THE Nova_IDE SHALL update all Theme_Tokens in `:root` immediately (live preview) without requiring "Save".
   - Note: The unsaved-changes indicator (Requirement 8.8) SHALL appear even if the user reverts settings back to their original values after touching them.
4. WHEN the user changes the Accent Color in the Appearance tab, THE Nova_IDE SHALL update `--accent` and `--accent-gradient` immediately for live preview.
5. WHEN the user changes the Font Size in the Appearance tab, THE Nova_IDE SHALL update the Monaco editor `fontSize` option immediately.
6. WHEN the user clicks "Save Settings", THE Nova_IDE SHALL persist all setting values to `localStorage` and apply any deferred changes.
7. WHEN the user presses `Escape` or clicks the modal backdrop, THE Nova_IDE SHALL close the Settings_Modal immediately without saving pending changes, regardless of the modal's current state (including during save operations or validation errors).
8. THE Settings_Modal SHALL display a visible unsaved-changes indicator (e.g., a dot on the "Save Settings" button) WHEN any setting value has been touched since the last save, even if the value has been reverted to its original state.

---

### Requirement 9: Activity Bar Badge Indicators

**User Story:** As a developer, I want numeric badges on Activity_Bar icons so that I can see pending items (e.g., git changes, unread notifications) at a glance.

#### Acceptance Criteria

1. THE Activity_Bar git icon SHALL display a numeric badge showing the count of uncommitted changed files WHEN there are one or more changed files in the workspace.
2. THE Activity_Bar SHALL NOT display a badge on the git icon WHEN there are zero changed files.
3. WHEN the count of changed files exceeds 99, THE Activity_Bar badge SHALL display "99+" instead of the numeric count.
4. THE badge SHALL be positioned at the top-right corner of its Activity_Bar icon button, with a 10 × 10 px minimum tap target circle, using `--accent` as background and `--bg-overlay` as text colour.
5. WHEN the git panel is opened and files are refreshed, THE Nova_IDE SHALL update the badge count within 500 ms of receiving the updated file list.

---

### Requirement 10: Resizable Panel Persistence

**User Story:** As a developer, I want Nova IDE to remember my panel sizes between sessions so that I don't have to resize them every launch.

#### Acceptance Criteria

1. WHEN the user drags the Sidebar Drag_Handle to a new width, THE Nova_IDE SHALL persist that width to `localStorage` under the key `"nova.sidebarWidth"`.
2. WHEN the user drags the AI_Panel Drag_Handle to a new width, THE Nova_IDE SHALL persist that width to `localStorage` under the key `"nova.aiPanelWidth"`.
3. WHEN the user drags the terminal vertical Drag_Handle to a new height, THE Nova_IDE SHALL persist that height to `localStorage` under the key `"nova.terminalHeight"`.
4. WHEN Nova_IDE initialises, THE Nova_IDE SHALL read `"nova.sidebarWidth"`, `"nova.aiPanelWidth"`, and `"nova.terminalHeight"` from `localStorage` and apply them before the first render frame.
5. IF a stored width or height value is outside the valid range for its panel, THEN THE Nova_IDE SHALL fall back to the default value for that panel.

---

### Requirement 11: Smooth Micro-Interactions & Motion

**User Story:** As a developer, I want UI elements to respond with subtle animations so that interactions feel fluid and premium rather than abrupt.

#### Acceptance Criteria

1. THE Nova_IDE SHALL define `--transition-fast: 120ms ease` and `--transition-normal: 200ms ease` as CSS custom properties and use them consistently for hover, focus, and active state transitions.
2. WHEN an Activity_Bar button transitions to active state, THE Nova_IDE SHALL animate the left-edge accent indicator from width 0 to 2 px over `--transition-fast`.
3. WHEN a tab becomes active, THE Nova_IDE SHALL animate its top border from transparent to `var(--accent)` over `--transition-fast`.
4. WHEN a chat message is added to the AI_Panel, THE Nova_IDE SHALL animate it in with `fadeIn` (opacity 0 → 1, translateY 6px → 0) over 200 ms.
5. WHEN a toast notification appears, THE Notification_System SHALL animate it in with `slideIn` (translateX 100% → 0, opacity 0 → 1) over 200 ms; WHEN a toast is dismissed (auto or by click), THE Notification_System SHALL animate it out with the reverse animation (translateX 0 → 100%, opacity 1 → 0) over 150 ms.
6. IF the user's OS reports `prefers-reduced-motion: reduce`, THEN THE Nova_IDE SHALL set all transition and animation durations to 0 ms.

---

### Requirement 12: Accessible Keyboard Navigation

**User Story:** As a developer, I want to navigate the IDE entirely by keyboard so that I'm not forced to reach for the mouse.

#### Acceptance Criteria

1. THE Nova_IDE SHALL ensure all interactive controls (buttons, selects, inputs, tabs, tree rows) are reachable and operable via `Tab` and `Shift+Tab`.
2. WHEN a focusable element receives keyboard focus, THE Nova_IDE SHALL display a visible focus ring using `outline: 1px solid var(--accent); outline-offset: 2px`.
3. WHEN the Command_Palette is open, THE Nova_IDE SHALL trap focus within it until it is closed.
4. WHEN a Settings_Modal or any modal is open, THE Nova_IDE SHALL trap focus within the modal; WHEN the modal closes, THE Nova_IDE SHALL immediately restore focus to the element that triggered the modal.
5. THE Activity_Bar buttons SHALL be navigable with arrow keys when any Activity_Bar button has focus; `ArrowDown` SHALL move to the next button and `ArrowUp` to the previous.
6. THE file tree SHALL support keyboard navigation: `ArrowDown` and `ArrowUp` move between visible rows, `ArrowRight` expands a folder, `ArrowLeft` collapses a folder, and `Enter` opens a file or toggles a folder in any state.
