/**
 * Context Menu Module
 * 
 * Provides a right-click context menu system:
 * - show(x, y, items): render and position menu at cursor
 * - close(): hide and clean up
 * - _position(el, x, y): smart viewport-aware positioning
 */

const ContextMenu = (() => {
  function _el() {
    return document.getElementById('contextMenu');
  }

  function show(x, y, items) {
    const el = _el();
    if (!el) return;

    el.innerHTML = '';
    el.classList.remove('hidden');

    if (!items || items.length === 0) {
      close();
      return;
    }

    items.forEach(item => {
      if (item.separator) {
        const sep = document.createElement('li');
        sep.className = 'context-menu-separator';
        sep.setAttribute('role', 'separator');
        el.appendChild(sep);
        return;
      }

      const li = document.createElement('li');
      li.className = `context-menu-item${item.disabled ? ' disabled' : ''}`;
      li.setAttribute('role', 'menuitem');
      if (item.disabled) li.setAttribute('aria-disabled', 'true');
      li.textContent = item.label;

      if (!item.disabled && typeof item.action === 'function') {
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          close();
          item.action();
        });
      }

      el.appendChild(li);
    });

    _position(el, x, y);
  }

  function close() {
    const el = _el();
    if (!el) return;
    el.classList.add('hidden');
    el.innerHTML = '';
  }

  function _position(el, x, y) {
    // Reset styles to measure natural size
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.visibility = 'hidden';
    el.classList.remove('hidden');

    const menuWidth = el.offsetWidth;
    const menuHeight = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 8; // viewport edge padding

    let left = x;
    let top = y;

    // Flip horizontally if would overflow right
    if (left + menuWidth + padding > vw) {
      left = x - menuWidth;
    }
    // If flipped still clips left, pin to left padding
    if (left < padding) {
      left = padding;
    }

    // Flip vertically if would overflow bottom
    if (top + menuHeight + padding > vh) {
      top = y - menuHeight;
    }
    // If flipped still clips top, pin to top padding
    if (top < padding) {
      top = padding;
    }

    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.visibility = '';
  }

  function init() {
    // Close on any click outside
    document.addEventListener('click', (e) => {
      const el = _el();
      if (el && !el.classList.contains('hidden') && !el.contains(e.target)) {
        close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const el = _el();
        if (el && !el.classList.contains('hidden')) {
          close();
        }
      }
    });

    // Prevent context menu from triggering another context menu
    const el = _el();
    el?.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return { show, close, _position, init };
})();

// Initialize listeners
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ContextMenu.init());
} else {
  ContextMenu.init();
}

window.ContextMenu = ContextMenu;
