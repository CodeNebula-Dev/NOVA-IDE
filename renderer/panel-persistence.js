/**
 * Panel Persistence Module
 * 
 * Manages localStorage persistence for resizable panel sizes.
 * Loads persisted sizes on init, validates against min/max bounds,
 * and saves sizes after every drag-end operation.
 */

const PANEL_DEFAULTS = {
  sidebar: { min: 140, max: 600, default: 240, key: 'nova.sidebarWidth' },
  aiPanel: { min: 260, max: 700, default: 340, key: 'nova.aiPanelWidth' },
  terminal: { min: 80, max: 600, default: 200, key: 'nova.terminalHeight' }
};

/**
 * Safe localStorage setter with error handling
 */
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(`Could not persist setting: ${key}`, 'warning');
    } else {
      console.warn(`Could not persist setting: ${key}`, err);
    }
  }
}

/**
 * Apply panel size to DOM
 */
function applyPanelSize(panelName, size) {
  if (panelName === 'sidebar') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.width = size + 'px';
      sidebar.style.minWidth = size + 'px';
      document.documentElement.style.setProperty('--sidebar-width', size + 'px');
    }
  } else if (panelName === 'aiPanel') {
    const aiPanel = document.getElementById('aiPanel');
    if (aiPanel) {
      aiPanel.style.width = size + 'px';
      aiPanel.style.minWidth = size + 'px';
      document.documentElement.style.setProperty('--ai-panel-width', size + 'px');
    }
  } else if (panelName === 'terminal') {
    const termPanel = document.getElementById('terminalPanel');
    if (termPanel) {
      termPanel.style.height = size + 'px';
      document.documentElement.style.setProperty('--terminal-height', size + 'px');
    }
  }
}

/**
 * Load persisted panel sizes from localStorage
 * Validates against min/max bounds; falls back to defaults if out of range or missing
 */
function loadPersistedPanelSizes() {
  for (const [panelName, config] of Object.entries(PANEL_DEFAULTS)) {
    try {
      const storedValue = localStorage.getItem(config.key);
      let size = config.default;
      
      if (storedValue !== null) {
        const parsed = parseInt(storedValue, 10);
        if (!isNaN(parsed) && parsed >= config.min && parsed <= config.max) {
          size = parsed;
        } else {
          console.warn(`[PanelPersistence] Out-of-range value for ${panelName}: ${parsed}. Using default: ${config.default}`);
        }
      }
      
      applyPanelSize(panelName, size);
    } catch (err) {
      console.error(`[PanelPersistence] Error loading ${panelName}:`, err);
      applyPanelSize(panelName, config.default);
    }
  }
}

/**
 * Save panel size to localStorage after drag-end
 */
function savePanelSize(panelName, size) {
  const config = PANEL_DEFAULTS[panelName];
  if (!config) {
    console.warn(`[PanelPersistence] Unknown panel: ${panelName}`);
    return;
  }
  
  // Clamp to min/max
  const clampedSize = Math.min(config.max, Math.max(config.min, size));
  safeLocalStorageSet(config.key, clampedSize.toString());
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.PanelPersistence = {
    loadPersistedPanelSizes,
    savePanelSize,
    applyPanelSize,
    PANEL_DEFAULTS
  };
}
