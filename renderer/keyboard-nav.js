/**
 * Keyboard Navigation Module
 * 
 * Provides accessible keyboard navigation:
 * - Activity bar: ArrowUp/Down wrapping navigation
 * - File tree: ArrowUp/Down/Left/Right/Enter navigation
 * - Focus trapping for modals and command palette
 * - Focus restoration on modal close
 */

const KeyboardNav = (() => {
  /**
   * Trap focus within a container element
   * Cycles Tab/Shift+Tab within focusable children
   */
  function trapFocus(containerEl, e) {
    if (!containerEl || e.key !== 'Tab') return;

    const focusable = [...containerEl.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), details > summary'
    )].filter(el => {
      // Skip hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && !el.closest('.hidden');
    });

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !containerEl.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !containerEl.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /**
   * Initialize ArrowUp/ArrowDown navigation for the activity bar buttons
   */
  function initActivityBarArrows() {
    const activityBar = document.querySelector('.activity-bar');
    if (!activityBar) return;

    activityBar.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      const buttons = [...activityBar.querySelectorAll('.activity-btn')];
      const N = buttons.length;
      if (N === 0) return;

      const currentIndex = buttons.indexOf(document.activeElement);
      let nextIndex;

      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % N;
      } else {
        nextIndex = currentIndex < 0 ? N - 1 : (currentIndex - 1 + N) % N;
      }

      e.preventDefault();
      buttons[nextIndex].focus();
    });
  }

  /**
   * Initialize ArrowUp/Down/Left/Right/Enter navigation for the file tree
   */
  function initFileTreeArrows() {
    const fileTree = document.getElementById('fileTree');
    if (!fileTree) return;

    // Ensure all tree rows have tabindex
    const rows = fileTree.querySelectorAll('.tree-row');
    rows.forEach(row => {
      if (!row.hasAttribute('tabindex')) {
        row.setAttribute('tabindex', '0');
      }
    });

    fileTree.addEventListener('keydown', (e) => {
      const rows = [...fileTree.querySelectorAll('.tree-row:not([style*="display: none"])')];
      const current = document.activeElement;
      const index = rows.indexOf(current);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = rows[Math.min(index + 1, rows.length - 1)];
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = rows[Math.max(index - 1, 0)];
        prev?.focus();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // Expand folder: simulate click if it's a folder row
        if (current?.classList.contains('tree-row')) {
          const caret = current.querySelector('.tree-caret:not(.empty)');
          if (caret && !caret.classList.contains('expanded')) {
            current.click();
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // Collapse folder
        if (current?.classList.contains('tree-row')) {
          const caret = current.querySelector('.tree-caret:not(.empty)');
          if (caret && caret.classList.contains('expanded')) {
            current.click();
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        current?.click();
      }
    });
  }

  /**
   * Initialize settings modal focus trap and focus restoration
   */
  function initSettingsModalFocusTrap() {
    const modal = document.getElementById('settingsModal');
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');
    if (!modal || !openBtn) return;

    let triggerEl = null;

    openBtn.addEventListener('click', () => {
      triggerEl = document.activeElement;
      // Focus first interactive element in modal after open
      requestAnimationFrame(() => {
        const firstFocusable = modal.querySelector(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      });
    });

    closeBtn?.addEventListener('click', () => {
      if (triggerEl && typeof triggerEl.focus === 'function') {
        triggerEl.focus();
        triggerEl = null;
      }
    });

    modal.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('hidden')) {
        trapFocus(modal, e);
      }
    });
  }

  function init() {
    initActivityBarArrows();
    initFileTreeArrows();
    initSettingsModalFocusTrap();
  }

  return { init, trapFocus, initActivityBarArrows, initFileTreeArrows, initSettingsModalFocusTrap };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => KeyboardNav.init());
} else {
  KeyboardNav.init();
}

window.KeyboardNav = KeyboardNav;
