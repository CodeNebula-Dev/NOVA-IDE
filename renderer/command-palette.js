/**
 * Command Palette Module
 * 
 * Provides a VS Code-style command palette overlay:
 * - Opens with ⌘P / Ctrl+P
 * - Closes with Escape or backdrop click
 * - Case-insensitive fuzzy filter
 * - Keyboard navigation (ArrowUp/Down, Enter)
 * - Focus trapping while open
 */

const COMMAND_REGISTRY = [
  { id: 'open-folder',      label: 'Open Folder',      action: () => document.getElementById('openWorkspaceBtn')?.click() },
  { id: 'new-file',         label: 'New File',          action: () => document.getElementById('newFileBtn')?.click() },
  { id: 'new-folder',       label: 'New Folder',        action: () => document.getElementById('newFolderBtn')?.click() },
  { id: 'toggle-terminal',  label: 'Toggle Terminal',   action: () => document.getElementById('terminalToggleBtn')?.click() },
  { id: 'open-settings',    label: 'Open Settings',     action: () => document.getElementById('settingsBtn')?.click() },
  { id: 'toggle-ai-panel',  label: 'Toggle AI Panel',   action: () => { const p = document.getElementById('aiPanel'); if (p) p.classList.toggle('hidden'); } },
  { id: 'toggle-sidebar',   label: 'Toggle Sidebar',    action: () => { const s = document.getElementById('sidebar'); if (s) s.classList.toggle('collapsed'); } },
  { id: 'new-conversation', label: 'New Conversation',  action: () => document.getElementById('newConversationBtn')?.click() }
];

const CommandPalette = (() => {
  let _currentIndex = -1;
  let _filteredCommands = [...COMMAND_REGISTRY];
  let _open = false;
  let _lastFocusedEl = null;

  function _el() {
    return document.getElementById('commandPalette');
  }
  function _input() {
    return document.getElementById('commandPaletteInput');
  }
  function _list() {
    return document.getElementById('commandPaletteList');
  }
  function _emptyMsg() {
    return document.getElementById('commandPaletteEmpty');
  }

  function open() {
    const el = _el();
    if (!el) return;
    _lastFocusedEl = document.activeElement;
    _open = true;
    el.classList.remove('hidden');
    const input = _input();
    if (input) {
      input.value = '';
      input.focus();
    }
    _filteredCommands = [...COMMAND_REGISTRY];
    _currentIndex = -1;
    renderList(_filteredCommands);
  }

  function close() {
    const el = _el();
    if (!el) return;
    _open = false;
    el.classList.add('hidden');
    if (_lastFocusedEl && typeof _lastFocusedEl.focus === 'function') {
      _lastFocusedEl.focus();
    }
  }

  function filter(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      _filteredCommands = [...COMMAND_REGISTRY];
    } else {
      _filteredCommands = COMMAND_REGISTRY.filter(cmd =>
        cmd.label.toLowerCase().includes(q)
      );
    }
    _currentIndex = -1;
    renderList(_filteredCommands);
  }

  function renderList(commands) {
    const list = _list();
    const emptyMsg = _emptyMsg();
    if (!list) return;

    list.innerHTML = '';

    if (commands.length === 0) {
      emptyMsg?.classList.remove('hidden');
      return;
    }
    emptyMsg?.classList.add('hidden');

    commands.forEach((cmd, index) => {
      const li = document.createElement('li');
      li.className = 'command-palette-item';
      li.setAttribute('role', 'option');
      li.setAttribute('data-command-id', cmd.id);
      li.setAttribute('aria-selected', 'false');
      li.textContent = cmd.label;
      li.addEventListener('click', () => execute(cmd.id));
      li.addEventListener('mouseenter', () => {
        _currentIndex = index;
        _updateSelection();
      });
      list.appendChild(li);
    });
  }

  function _updateSelection() {
    const items = _list()?.querySelectorAll('.command-palette-item');
    if (!items) return;
    items.forEach((item, i) => {
      item.classList.toggle('active', i === _currentIndex);
      item.setAttribute('aria-selected', i === _currentIndex ? 'true' : 'false');
      if (i === _currentIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function execute(commandId) {
    const cmd = COMMAND_REGISTRY.find(c => c.id === commandId);
    if (cmd && typeof cmd.action === 'function') {
      close();
      cmd.action();
    }
  }

  function trapFocus(e) {
    const el = _el();
    if (!el || !_open) return;
    const focusable = [...el.querySelectorAll(
      'input, button, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.disabled);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      _currentIndex = Math.min(_currentIndex + 1, _filteredCommands.length - 1);
      _updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _currentIndex = Math.max(_currentIndex - 1, 0);
      _updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_currentIndex >= 0 && _filteredCommands[_currentIndex]) {
        execute(_filteredCommands[_currentIndex].id);
      }
    }
  }

  // Initialize event listeners once DOM is ready
  function init() {
    const el = _el();
    const input = _input();
    if (!el || !input) return;

    // Close on backdrop click
    el.querySelector('.command-palette-backdrop')?.addEventListener('click', close);

    // Filter on input
    input.addEventListener('input', (e) => filter(e.target.value));

    // Keyboard handling
    el.addEventListener('keydown', trapFocus);

    // Global ⌘P / Ctrl+P shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        if (_open) close();
        else open();
      }
    });
  }

  return { open, close, filter, renderList, execute, trapFocus, init, COMMAND_REGISTRY };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CommandPalette.init());
} else {
  CommandPalette.init();
}

window.CommandPalette = CommandPalette;
