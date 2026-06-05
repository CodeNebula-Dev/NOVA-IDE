/**
 * Settings Live Preview Module
 * 
 * Provides real-time live preview for settings changes:
 * - Theme token updates on UI theme change
 * - Accent color live update
 * - Font size live update to Monaco editor
 * - Font family live update to CSS variable
 * - "Unsaved changes" indicator on Save button
 */

const THEME_TOKENS = {
  'catppuccin-mocha': {
    '--bg-base': '#1e1e2e',
    '--bg-surface': '#181825',
    '--bg-overlay': '#11111b',
    '--bg-crust': '#0d0f14',
    '--border': '#313244',
    '--border-active': '#45475a',
    '--text-primary': '#cdd6f4',
    '--text-secondary': '#a6adc8',
    '--text-muted': '#6c7086',
    '--accent': '#cba6f7',
    '--accent-hover': '#b4befe',
    '--green': '#a6e3a1',
    '--red': '#f38ba8',
    '--yellow': '#f9e2af',
    '--blue': '#89b4fa',
    '--peach': '#fab387',
  },
  'catppuccin-latte': {
    '--bg-base': '#eff1f5',
    '--bg-surface': '#e6e9ef',
    '--bg-overlay': '#dce0e8',
    '--bg-crust': '#dce0e8',
    '--border': '#bcc0cc',
    '--border-active': '#9ca0b0',
    '--text-primary': '#4c4f69',
    '--text-secondary': '#5c5f77',
    '--text-muted': '#8c8fa1',
    '--accent': '#8839ef',
    '--accent-hover': '#7287fd',
    '--green': '#40a02b',
    '--red': '#d20f39',
    '--yellow': '#df8e1d',
    '--blue': '#1e66f5',
    '--peach': '#fe640b',
  },
  'dracula': {
    '--bg-base': '#282a36',
    '--bg-surface': '#21222c',
    '--bg-overlay': '#191a21',
    '--bg-crust': '#14151d',
    '--border': '#44475a',
    '--border-active': '#6272a4',
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#cdd6f4',
    '--text-muted': '#6272a4',
    '--accent': '#bd93f9',
    '--accent-hover': '#ff79c6',
    '--green': '#50fa7b',
    '--red': '#ff5555',
    '--yellow': '#f1fa8c',
    '--blue': '#8be9fd',
    '--peach': '#ffb86c',
  },
  'one-dark-pro': {
    '--bg-base': '#282c34',
    '--bg-surface': '#21252b',
    '--bg-overlay': '#1d2026',
    '--bg-crust': '#181b21',
    '--border': '#3e4451',
    '--border-active': '#56607a',
    '--text-primary': '#abb2bf',
    '--text-secondary': '#9da5b4',
    '--text-muted': '#5c6370',
    '--accent': '#c678dd',
    '--accent-hover': '#e5c07b',
    '--green': '#98c379',
    '--red': '#e06c75',
    '--yellow': '#e5c07b',
    '--blue': '#61afef',
    '--peach': '#d19a66',
  },
  'nord': {
    '--bg-base': '#2e3440',
    '--bg-surface': '#272c36',
    '--bg-overlay': '#1e2430',
    '--bg-crust': '#191d26',
    '--border': '#3b4252',
    '--border-active': '#4c566a',
    '--text-primary': '#eceff4',
    '--text-secondary': '#e5e9f0',
    '--text-muted': '#616e88',
    '--accent': '#88c0d0',
    '--accent-hover': '#81a1c1',
    '--green': '#a3be8c',
    '--red': '#bf616a',
    '--yellow': '#ebcb8b',
    '--blue': '#5e81ac',
    '--peach': '#d08770',
  },
  'solarized-dark': {
    '--bg-base': '#002b36',
    '--bg-surface': '#073642',
    '--bg-overlay': '#001e27',
    '--bg-crust': '#00131a',
    '--border': '#073642',
    '--border-active': '#586e75',
    '--text-primary': '#839496',
    '--text-secondary': '#657b83',
    '--text-muted': '#586e75',
    '--accent': '#268bd2',
    '--accent-hover': '#2aa198',
    '--green': '#859900',
    '--red': '#dc322f',
    '--yellow': '#b58900',
    '--blue': '#268bd2',
    '--peach': '#cb4b16',
  }
};

const SettingsLivePreview = (() => {
  let _settingsDirty = false;

  function markSettingsDirty() {
    _settingsDirty = true;
    const btn = document.getElementById('saveSettingsBtn');
    btn?.classList.add('has-unsaved');
  }

  function clearSettingsDirty() {
    _settingsDirty = false;
    const btn = document.getElementById('saveSettingsBtn');
    btn?.classList.remove('has-unsaved');
  }

  function isDirty() {
    return _settingsDirty;
  }

  function applyThemeTokens(themeKey) {
    const tokens = THEME_TOKENS[themeKey];
    if (!tokens) return;
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(tokens)) {
      root.style.setProperty(prop, value);
    }
  }

  function init() {
    // UI Theme select → live token update
    const uiThemeSelect = document.getElementById('uiThemeSelect');
    uiThemeSelect?.addEventListener('change', (e) => {
      applyThemeTokens(e.target.value);
      markSettingsDirty();
    });

    // Accent color input → live --accent and --accent-gradient update
    const accentColorInput = document.getElementById('accentColorInput');
    accentColorInput?.addEventListener('input', (e) => {
      const color = e.target.value;
      document.documentElement.style.setProperty('--accent', color);
      document.documentElement.style.setProperty(
        '--accent-gradient',
        color
      );
      document.documentElement.style.setProperty(
        '--accent-dim',
        `${color}26`
      );
      markSettingsDirty();
    });

    // Font size select → live Monaco update
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    fontSizeSelect?.addEventListener('change', (e) => {
      const size = parseInt(e.target.value, 10);
      // Update Monaco editor if available
      if (window.state?.editor) {
        window.state.editor.updateOptions({ fontSize: size });
      }
      markSettingsDirty();
    });

    // Font family select → live --font-ui CSS variable update
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    fontFamilySelect?.addEventListener('change', (e) => {
      document.documentElement.style.setProperty(
        '--font-ui',
        `'${e.target.value}', -apple-system, BlinkMacSystemFont, sans-serif`
      );
      markSettingsDirty();
    });

    // All other settings controls → mark dirty on change/input
    const otherControls = [
      '#themeSelect', '#tabSizeSelect', '#wordWrapSelect', '#minimapSelect',
      '#lineNumbersSelect', '#panelWidthSelect', '#defaultProviderSelect',
      '#defaultModelSelect', '#aiTemperatureInput', '#terminalFontSizeSelect',
      '#terminalThemeSelect'
    ];
    otherControls.forEach(selector => {
      document.querySelector(selector)?.addEventListener('change', markSettingsDirty);
    });

    // Escape keydown on settings modal → close without saving
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('settingsModal');
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        e.preventDefault();
        document.getElementById('closeSettingsBtn')?.click();
      }
    });

    // Modal backdrop click → close without saving
    document.querySelector('#settingsModal .modal-backdrop')?.addEventListener('click', () => {
      document.getElementById('closeSettingsBtn')?.click();
    });
  }

  return { markSettingsDirty, clearSettingsDirty, isDirty, applyThemeTokens, init, THEME_TOKENS };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SettingsLivePreview.init());
} else {
  SettingsLivePreview.init();
}

window.SettingsLivePreview = SettingsLivePreview;
window.THEME_TOKENS = THEME_TOKENS;
