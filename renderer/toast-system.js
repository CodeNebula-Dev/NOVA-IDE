/**
 * Toast Notification System
 * 
 * Provides a queue-based toast system with:
 * - Max 4 simultaneous toasts (oldest-first eviction)
 * - Auto-dismiss after configurable duration
 * - Enter/exit animations via CSS classes
 * - Accessible via aria-live="polite" container
 */

const ToastSystem = (() => {
  const MAX_TOASTS = 4;
  const DEFAULT_DURATION = 4000;
  let queue = [];
  let idCounter = 0;

  function _getContainer() {
    return document.getElementById('toastContainer');
  }

  function _create(id, message, type) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('data-toast-id', id);
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast-message">${_escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Dismiss notification">✕</button>
    `;
    el.querySelector('.toast-close').addEventListener('click', () => _dismiss(id));
    return el;
  }

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _dismiss(id) {
    const container = _getContainer();
    if (!container) return;
    const el = container.querySelector(`[data-toast-id="${id}"]`);
    if (!el) return;

    // Add exit animation class, then remove after animation
    el.classList.add('toast-exit');
    el.addEventListener('animationend', () => {
      el.remove();
    }, { once: true });
    // Fallback: remove after 350ms if animationend doesn't fire
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 350);

    queue = queue.filter(t => t.id !== id);
  }

  function show(message, type = 'info', durationMs = DEFAULT_DURATION) {
    const container = _getContainer();
    if (!container) {
      console.warn('[ToastSystem] #toastContainer not found');
      return;
    }

    const id = ++idCounter;

    // Enforce max queue: evict oldest if at capacity
    const existingToasts = container.querySelectorAll('.toast:not(.toast-exit)');
    if (existingToasts.length >= MAX_TOASTS) {
      const oldestId = existingToasts[0].getAttribute('data-toast-id');
      _dismiss(parseInt(oldestId, 10));
    }

    const el = _create(id, message, type);
    container.appendChild(el);
    queue.push({ id, el, timer: null });

    // Auto-dismiss
    const timer = setTimeout(() => _dismiss(id), durationMs);
    const entry = queue.find(t => t.id === id);
    if (entry) entry.timer = timer;

    return id;
  }

  return { show, _dismiss, _create };
})();

// Public API: window.showToast(message, type, durationMs)
window.showToast = (message, type, durationMs) => ToastSystem.show(message, type, durationMs);
