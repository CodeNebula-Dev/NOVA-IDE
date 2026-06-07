const MODEL_CONFIG = {
  gemini: {
    label: "Gemini 2.5 Flash",
    openrouterModel: "google/gemini-2.5-flash:free",
    pollinationsModel: "openai"
  },
  gemma: {
    label: "Gemma 3 27B",
    openrouterModel: "google/gemma-3-27b-it",
    pollinationsModel: "gemma"
  },
  llama: {
    label: "Llama 3.3 70B",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct",
    pollinationsModel: "openai"
  },
  mistral: {
    label: "Mistral 7B",
    openrouterModel: "mistralai/mistral-7b-instruct",
    pollinationsModel: "mistral"
  },
  qwen: {
    label: "Qwen 2.5 Coder 32B",
    openrouterModel: "qwen/qwen-2.5-coder-32b-instruct:free",
    pollinationsModel: "openai"
  },
  deepseek: {
    label: "DeepSeek R1",
    openrouterModel: "deepseek/deepseek-r1:free",
    pollinationsModel: "openai"
  }
};

const SINGLE_AGENT_MODELS = {
  gemini: {
    label: "Gemini 2.5 Flash",
    openrouterModel: "google/gemini-2.5-flash:free",
    pollinationsModel: "openai"
  },
  deepseek: {
    label: "DeepSeek R1",
    openrouterModel: "deepseek/deepseek-r1:free",
    pollinationsModel: "openai"
  },
  qwen: {
    label: "Qwen 2.5 Coder 32B",
    openrouterModel: "qwen/qwen-2.5-coder-32b-instruct:free",
    pollinationsModel: "openai"
  },
  llama: {
    label: "Llama 3.3 70B",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
    pollinationsModel: "openai"
  }
};

const BADGE_ROLE_TO_MODEL_MODE = {
  planner: "deepseek",
  coder: "qwen",
  reviewer: "llama",
  fast: "qwen"
};

const LANGUAGE_BY_EXT = {
  js: "javascript",
  cjs: "javascript",
  mjs: "javascript",
  ts: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  py: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  html: "html",
  css: "css",
  scss: "scss",
  sh: "bash",
  zsh: "bash"
};

const ICON_BY_EXT = {
  js: "🟨",
  ts: "🔷",
  jsx: "⚛️",
  tsx: "⚛️",
  py: "🐍",
  md: "📝",
  json: "🧩",
  html: "🌐",
  css: "🎨",
  yml: "🧪",
  yaml: "🧪",
  sh: "⌘",
  zsh: "⌘",
  go: "🐹",
  rs: "🦀"
};

const state = {
  workspaceRoot: "",
  tree: null,
  expandedFolders: new Set([""]),
  selectedPath: "",
  tabs: [],
  activePath: null,
  pendingApplyContent: "",
  provider: "pollinations",
  mode: "chat",
  modelKey: "gemma",
  selectedAgent: "supernova-v1", // 'supernova-v1', 'gpt-oss-20b'
  terminalVisible: false,
  chatMessages: [],
  apiMessages: [],
  savingPaths: new Set(),
  editor: null, // Monaco editor instance reference
  currentConversationId: null,
  conversations: [],
  chatContexts: [],
  terminals: [],
  activeTerminalId: null
};

const saveTimers = new Map();
let activeTerminal = null; // Holds our xterm.js + node-pty state

const els = {
  workspaceLabel: document.getElementById("workspaceLabel"),
  openWorkspaceBtn: document.getElementById("openWorkspaceBtn"),
  refreshWorkspaceBtn: document.getElementById("refreshWorkspaceBtn"),
  terminalToggleBtn: document.getElementById("terminalToggleBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  terminalPanel: document.getElementById("terminalPanel"),
  xtermTerminalContainer: document.getElementById("xtermTerminalContainer"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  themeSelect: document.getElementById("themeSelect"),
  fontSizeSelect: document.getElementById("fontSizeSelect"),
  panelWidthSelect: document.getElementById("panelWidthSelect"),
  uiThemeSelect: document.getElementById("uiThemeSelect"),
  accentColorInput: document.getElementById("accentColorInput"),
  fontFamilySelect: document.getElementById("fontFamilySelect"),
  tabSizeSelect: document.getElementById("tabSizeSelect"),
  wordWrapSelect: document.getElementById("wordWrapSelect"),
  minimapSelect: document.getElementById("minimapSelect"),
  lineNumbersSelect: document.getElementById("lineNumbersSelect"),
  defaultProviderSelect: document.getElementById("defaultProviderSelect"),
  defaultModelSelect: document.getElementById("defaultModelSelect"),
  aiTemperatureInput: document.getElementById("aiTemperatureInput"),
  aiTemperatureVal: document.getElementById("aiTemperatureVal"),
  terminalFontSizeSelect: document.getElementById("terminalFontSizeSelect"),
  terminalThemeSelect: document.getElementById("terminalThemeSelect"),
  fileTree: document.getElementById("fileTree"),
  newFileBtn: document.getElementById("newFileBtn"),
  newFolderBtn: document.getElementById("newFolderBtn"),
  tabsBar: document.getElementById("tabsBar"),
  monacoEditorContainer: document.getElementById("monacoEditorContainer"),
  statusLanguage: document.getElementById("statusLanguage"),
  statusCursor: document.getElementById("statusCursor"),
  statusEncoding: document.getElementById("statusEncoding"),
  statusSaveState: document.getElementById("statusSaveState"),
  providerSelect: document.getElementById("providerSelect"),
  modelSelect: document.getElementById("modelSelect"),
  modeSelect: document.getElementById("modeSelect"),
  openRouterKeyWrap: document.getElementById("openRouterKeyWrap"),
  openRouterKeyInput: document.getElementById("openRouterKeyInput"),
  groqKeyWrap: document.getElementById("groqKeyWrap"),
  groqKeyInput: document.getElementById("groqKeyInput"),
  diffControlBar: document.getElementById("diffControlBar"),
  acceptDiffBtn: document.getElementById("acceptDiffBtn"),
  rejectDiffBtn: document.getElementById("rejectDiffBtn"),
  monacoDiffContainer: document.getElementById("monacoDiffContainer"),
  modelHint: document.getElementById("modelHint"),
  contextFileLabel: document.getElementById("contextFileLabel"),
  conversationList: document.getElementById("conversationList"),
  newConversationBtn: document.getElementById("newConversationBtn"),
  chatMessages: document.getElementById("chatMessages"),
  // NEW: Sticky agent panel elements
  agentPromptInput: document.getElementById("agentPromptInput"),
  sendAgentPromptBtn: document.getElementById("sendAgentPromptBtn"),
  addContextBtn: document.getElementById("addContextBtn"),
  composerContextBar: document.getElementById("composerContextBar"),
  contextDropdown: document.getElementById("contextDropdown"),
  contextAddActiveFile: document.getElementById("contextAddActiveFile"),
  contextAddSelection: document.getElementById("contextAddSelection"),
  contextAddAllTabs: document.getElementById("contextAddAllTabs"),
  toggleChatHistoryBtn: document.getElementById("toggleChatHistoryBtn"),
  agentStatusDot: document.getElementById("agentStatusDot"),
  agentStatusText: document.getElementById("agentStatusText"),
  activeFilesCount: document.getElementById("activeFilesCount"),
  agentBadges: document.querySelectorAll(".agent-badge"),
  modelModeSelect: document.getElementById("modelModeSelect"),
  // OLD: Keep for compatibility
  agentInput: document.getElementById("agentInput"),
  sendAgentBtn: document.getElementById("sendAgentBtn"),
  applyToFileBtn: document.getElementById("applyToFileBtn"),
  
  // NEW: Layout and Panels
  activityBtns: document.querySelectorAll('.activity-btn[data-panel]'),
  sidebar: document.getElementById('sidebar'),
  explorerPanel: document.getElementById('explorerPanel'),
  searchPanel: document.getElementById('searchPanel'),
  aiPanel: document.getElementById('aiPanel'),
  terminalCloseBtn: document.getElementById('terminalCloseBtn'),
  rapidChatContainer: document.getElementById("rapidChatContainer"),
  rapidChatIframe: document.getElementById("rapidChatIframe"),
  toggleLeftSidebarBtn: document.getElementById('toggleLeftSidebarBtn'),
  toggleTerminalPanelBtn: document.getElementById('toggleTerminalPanelBtn'),
  toggleAiPanelBtn: document.getElementById('toggleAiPanelBtn')
};

// Monaco AMD setup
require.config({ paths: { vs: "../node_modules/monaco-editor/min/vs" } });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      addChatMessage("system", `Startup error: ${error.message}`);
    });
  });
} else {
  init().catch((error) => {
    addChatMessage("system", `Startup error: ${error.message}`);
  });
}

async function init() {
  // Load persisted panel sizes before first render
  if (typeof loadPersistedPanelSizes === 'function') {
    loadPersistedPanelSizes();
  }

  renderModelOptions();
  bindEvents();
  syncAgentModeUI();
  syncProviderUI();
  initResizableHandles();
  updateLayoutToggleButtons();

  // API Keys are no longer used since SuperNova v1 and GPT OSS 20B are zero-setup and free.

  // 1. Initialize Monaco Editor
  await initMonaco();

  // 2. Load stored settings (now that Monaco is fully initialized!)
  loadSettings();

  // 3. Load conversations from database
  await loadConversations();

  // 4. Fetch workspace root — if empty, show welcome screen
  state.workspaceRoot = await window.novaAPI.getWorkspaceRoot();

  if (!state.workspaceRoot) {
    // No workspace open — show welcome screen
    showWelcomeScreen();
    await refreshWorkspaceTree();
  } else {
    hideWelcomeScreen();
    await refreshWorkspaceTree();
    // Do NOT auto-open any file — user opens files explicitly
    clearEditor();
  }

  // 5. Register Valkyrie events
  // 5. Register SuperNova events
  if (window.novaAPI.supernova) {
    window.novaAPI.supernova.onEvent("supernova:thought-chunk", (data) => {
      updateActiveValkyrieCard('thought', data.chunk);
    });
    window.novaAPI.supernova.onEvent("supernova:plan-update", (data) => {
      updateActiveValkyrieCard('plan', data.plan);
    });
    window.novaAPI.supernova.onEvent("supernova:task-update", (data) => {
      updateActiveValkyrieCard('task', data);
    });
    window.novaAPI.supernova.onEvent("supernova:diff-chunk", (data) => {
      updateActiveValkyrieCard('diff', data.chunk);
    });
    window.novaAPI.supernova.onEvent("supernova:review-status", (data) => {
      updateActiveValkyrieCard('review', data);
    });
    window.novaAPI.supernova.onEvent("supernova:status", (data) => {
      updateActiveValkyrieCard('status', data.message);
    });
    window.novaAPI.supernova.onEvent("supernova:completed", (data) => {
      updateActiveValkyrieCard('completed', data);
    });
    window.novaAPI.supernova.onEvent("supernova:error", (data) => {
      updateActiveValkyrieCard('error', data.message);
      addChatMessage("system", `❌ SuperNova Engine: ${data.message}`);
    });
  }

  updateStatusBar();
  initGit();
}

/**
 * Initializes the Monaco Editor inside our layout
 */
function initMonaco() {
  return new Promise((resolve) => {
    require(["vs/editor/editor.main"], function () {
      state.editor = monaco.editor.create(els.monacoEditorContainer, {
        value: "",
        language: "plaintext",
        theme: els.themeSelect.value || "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: '"JetBrains Mono", monospace',
        lineHeight: 20,
        tabSize: 2,
        insertSpaces: true,
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 }
      });

      // Update dirty status on content edit
      state.editor.onDidChangeModelContent(() => {
        handleEditorInput();
      });

      // Update status cursor indicators on selection
      state.editor.onDidChangeCursorPosition(() => {
        updateStatusBar();
      });

      // Add Inline Review action
      state.editor.addAction({
        id: 'nova-review-selection',
        label: 'NOVA: Review Selection (Llama 3.3)',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: function (ed) {
          const selection = ed.getSelection();
          if (!selection.isEmpty()) {
            const text = ed.getModel().getValueInRange(selection);
            triggerInlineReview(text, selection);
          }
        }
      });

      // Add Inline Edit action
      state.editor.addAction({
        id: 'nova-inline-edit',
        label: 'NOVA: Inline Edit (Cmd+K)',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.6,
        run: function (ed) {
          showInlineEditWidget(ed);
        }
      });

      // Append Monaco editor actions to the Command Palette registry
      if (typeof COMMAND_REGISTRY !== 'undefined' && state.editor) {
        const monacoActions = state.editor.getActions();
        monacoActions.forEach(action => {
          // Avoid duplicates if already registered
          if (!COMMAND_REGISTRY.find(c => c.id === action.id)) {
            COMMAND_REGISTRY.push({
              id: action.id,
              label: action.label,
              action: () => action.run()
            });
          }
        });
      }

      renderChatMessages();
      resolve();
    });
  });
}

async function initTerminal() {
  if (state.terminals.length === 0) {
    await createTerminalInstance();
  } else if (state.activeTerminalId) {
    activateTerminalInstance(state.activeTerminalId);
  }
}

function handleTerminalResize() {
  if (activeTerminal && state.terminalVisible) {
    activeTerminal.fit.fit();
    window.novaAPI.terminalResize(activeTerminal.termId, activeTerminal.term.cols, activeTerminal.term.rows);
  }
}

/**
 * Resizable panel handles — drag to resize sidebar, AI panel, and terminal
 */
function initResizableHandles() {
  // ── Sidebar resize (sidebar ↔ editor) ────────────────────────────────────
  const sidebarHandle = document.getElementById('resizeSidebar');
  const sidebar = document.getElementById('sidebar');

  if (sidebarHandle && sidebar) {
    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    sidebarHandle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      sidebarHandle.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const newWidth = Math.min(600, Math.max(140, startWidth + delta));
      sidebar.style.width = newWidth + 'px';
      sidebar.style.minWidth = newWidth + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        sidebarHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Trigger Monaco layout update
        if (state.editor) state.editor.layout();
        // Persist the new sidebar width
        if (typeof savePanelSize === 'function') {
          savePanelSize('sidebar', parseInt(sidebar.style.width, 10));
        }
      }
    });
  }

  // ── AI Panel resize (editor ↔ AI panel) ──────────────────────────────────
  const aiHandle = document.getElementById('resizeAiPanel');
  const aiPanel = document.getElementById('aiPanel');

  if (aiHandle && aiPanel) {
    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    aiHandle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = aiPanel.getBoundingClientRect().width;
      aiHandle.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      // Dragging left = bigger AI panel
      const delta = startX - e.clientX;
      const newWidth = Math.min(700, Math.max(260, startWidth + delta));
      aiPanel.style.width = newWidth + 'px';
      aiPanel.style.minWidth = newWidth + 'px';
      document.documentElement.style.setProperty('--ai-panel-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        aiHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (state.editor) state.editor.layout();
        // Persist the new AI panel width
        if (typeof savePanelSize === 'function') {
          savePanelSize('aiPanel', parseInt(aiPanel.style.width, 10));
        }
      }
    });
  }

  // ── Terminal vertical resize ──────────────────────────────────────────────
  const termHandle = document.getElementById('resizeTerminal');
  const termPanel = document.getElementById('terminalPanel');

  if (termHandle && termPanel) {
    let dragging = false;
    let startY = 0;
    let startHeight = 0;

    termHandle.addEventListener('mousedown', (e) => {
      if (termPanel.classList.contains('hidden')) return;
      dragging = true;
      startY = e.clientY;
      startHeight = termPanel.getBoundingClientRect().height;
      termHandle.classList.add('dragging');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = startY - e.clientY;
      const newHeight = Math.min(600, Math.max(80, startHeight + delta));
      termPanel.style.height = newHeight + 'px';
      document.documentElement.style.setProperty('--terminal-height', newHeight + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        termHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        handleTerminalResize();
        if (state.editor) state.editor.layout();
        // Persist the new terminal height
        if (typeof savePanelSize === 'function') {
          savePanelSize('terminal', parseInt(termPanel.style.height, 10));
        }
      }
    });
  }

  // ── Welcome screen buttons ────────────────────────────────────────────────
  const welcomeOpenFolderBtn = document.getElementById('welcomeOpenFolderBtn');
  if (welcomeOpenFolderBtn) {
    welcomeOpenFolderBtn.addEventListener('click', handleSelectWorkspace);
  }

  const welcomeOpenFileBtn = document.getElementById('welcomeOpenFileBtn');
  if (welcomeOpenFileBtn) {
    welcomeOpenFileBtn.addEventListener('click', async () => {
      // If no workspace, prompt to open folder first
      if (!state.workspaceRoot) {
        addChatMessage('system', '⚠️ Please open a folder first using "Open Folder".');
        return;
      }
      handleCreateFile();
    });
  }
}

function bindEvents() {
  els.openWorkspaceBtn.addEventListener("click", handleSelectWorkspace);
  els.refreshWorkspaceBtn.addEventListener("click", refreshWorkspaceTree);
  els.newFileBtn.addEventListener("click", handleCreateFile);
  els.newFolderBtn.addEventListener("click", handleCreateFolder);

  els.providerSelect?.addEventListener("change", () => {
    state.provider = els.providerSelect.value;
    syncProviderUI();
  });
  els.modelSelect?.addEventListener("change", () => {
    state.modelKey = els.modelSelect.value;
    syncProviderUI();
  });
  els.modeSelect?.addEventListener("change", () => {
    state.mode = els.modeSelect.value;
    syncProviderUI();
  });
  els.modelModeSelect?.addEventListener("change", () => {
    state.selectedAgent = els.modelModeSelect.value;
    syncAgentModeUI();
    syncProviderUI();
    console.log(`🤖 Agent mode changed to: ${state.selectedAgent}`);
  });

  // Model Toggle Pill click handlers
  const btnSupernova = document.getElementById("btnSupernova");
  const btnGptOss = document.getElementById("btnGptOss");

  btnSupernova?.addEventListener("click", () => {
    state.selectedAgent = "supernova-v1";
    if (els.modelModeSelect) {
      els.modelModeSelect.value = "supernova-v1";
      els.modelModeSelect.dispatchEvent(new Event("change"));
    }
  });

  btnGptOss?.addEventListener("click", () => {
    state.selectedAgent = "gpt-oss-20b";
    if (els.modelModeSelect) {
      els.modelModeSelect.value = "gpt-oss-20b";
      els.modelModeSelect.dispatchEvent(new Event("change"));
    }
  });

  // Suggestion chips click handlers
  const suggestionChips = document.querySelectorAll(".suggestion-chip");
  suggestionChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const promptText = chip.getAttribute("data-prompt");
      if (promptText && els.agentPromptInput) {
        els.agentPromptInput.value = promptText;
        // Automatically send the prompt
        handleSendToAgent();
      }
    });
  });

  // ========== NEW: STICKY AGENT PANEL EVENTS ==========
  if (els.sendAgentPromptBtn) {
    els.sendAgentPromptBtn.addEventListener("click", () => handleSendToAgent());
  }
  if (els.agentPromptInput) {
    els.agentPromptInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSendToAgent();
      }
    });
  }
  if (els.addContextBtn) {
    els.addContextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      els.contextDropdown?.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", () => {
    els.contextDropdown?.classList.add("hidden");
  });

  if (els.contextAddActiveFile) {
    els.contextAddActiveFile.addEventListener("click", (e) => {
      e.stopPropagation();
      els.contextDropdown?.classList.add("hidden");
      addActiveFileContext();
    });
  }
  if (els.contextAddSelection) {
    els.contextAddSelection.addEventListener("click", (e) => {
      e.stopPropagation();
      els.contextDropdown?.classList.add("hidden");
      addSelectionContext();
    });
  }
  if (els.contextAddAllTabs) {
    els.contextAddAllTabs.addEventListener("click", (e) => {
      e.stopPropagation();
      els.contextDropdown?.classList.add("hidden");
      addAllTabsContext();
    });
  }

  if (els.toggleChatHistoryBtn) {
    els.toggleChatHistoryBtn.addEventListener("click", toggleChatHistory);
  }

  // Activity Bar toggling
  const activityBtns = document.querySelectorAll('.activity-btn[data-panel]');
  activityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      const sidebar = document.getElementById('sidebar');
      
      if (panel === 'ai') {
        toggleAiPanel();
        return;
      }
      
      const isAlreadyActive = btn.classList.contains('active');
      const isSidebarOpen = sidebar && !sidebar.classList.contains('collapsed');
      
      if (isAlreadyActive && isSidebarOpen) {
        toggleSidebar();
      } else {
        activityBtns.forEach(b => {
          if (b.dataset.panel !== 'ai') b.classList.remove('active');
        });
        btn.classList.add('active');
        
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.add('hidden'));
        
        if (panel === 'explorer') {
          document.getElementById('explorerPanel')?.classList.remove('hidden');
        } else if (panel === 'search') {
          document.getElementById('searchPanel')?.classList.remove('hidden');
        } else if (panel === 'git') {
          document.getElementById('gitPanel')?.classList.remove('hidden');
          refreshGitPanel();
        }
        
        if (sidebar && sidebar.classList.contains('collapsed')) {
          toggleSidebar();
        }
      }
    });
  });

  // Layout Toggle Buttons in Titlebar
  if (els.toggleLeftSidebarBtn) {
    els.toggleLeftSidebarBtn.addEventListener('click', () => {
      toggleSidebar();
    });
  }
  if (els.toggleTerminalPanelBtn) {
    els.toggleTerminalPanelBtn.addEventListener('click', () => {
      toggleTerminal();
    });
  }
  if (els.toggleAiPanelBtn) {
    els.toggleAiPanelBtn.addEventListener('click', () => {
      toggleAiPanel();
    });
  }

  // Search Panel Input Event Binding
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  if (searchInput && searchResults) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim();
      searchResults.innerHTML = "";
      if (!query) return;
      
      const matchedFiles = searchWorkspaceTree(query);
      if (matchedFiles.length === 0) {
        const noResults = document.createElement("div");
        noResults.className = "tab-empty";
        noResults.style.cssText = "padding: 12px; color: var(--text-muted); font-size: var(--font-size-xs);";
        noResults.textContent = "No matching files found.";
        searchResults.appendChild(noResults);
        return;
      }
      
      matchedFiles.forEach(file => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        
        const fileLabel = document.createElement("div");
        fileLabel.className = "result-file";
        fileLabel.innerHTML = `<span style="font-size: 14px;">${getNodeIcon(file)}</span> <span>${file.name}</span>`;
        
        const fileMatch = document.createElement("div");
        fileMatch.className = "result-match";
        fileMatch.textContent = file.path;
        
        item.append(fileLabel, fileMatch);
        item.addEventListener("click", () => {
          openFile(file.path);
        });
        
        searchResults.appendChild(item);
      });
    });
  }

  // Terminal Close Button
  document.getElementById('terminalCloseBtn')?.addEventListener('click', () => {
    state.terminalVisible = false;
    els.terminalPanel.classList.add('hidden');
  });
  
  // Agent badge selection
  els.agentBadges?.forEach(badge => {
    badge.addEventListener("click", () => {
      const role = badge.dataset.role;
      selectAgentRole(role);
    });
  });

  // ========== OLD: FALLBACK EVENTS (for compatibility) ==========
  if (els.sendAgentBtn) {
    els.sendAgentBtn.addEventListener("click", handleSendToAgent);
  }
  if (els.agentInput) {
    els.agentInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSendToAgent();
      }
    });
  }
  if (els.applyToFileBtn) {
    els.applyToFileBtn.addEventListener("click", applySuggestedContentToFile);
  }

  if (els.newConversationBtn) {
    els.newConversationBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      createNewConversation();
    });
  }

  // Settings Modal Tab switching & Slider
  const tabBtns = document.querySelectorAll(".settings-tab-btn");
  const panes = document.querySelectorAll(".settings-pane");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(`pane-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  if (els.aiTemperatureInput && els.aiTemperatureVal) {
    els.aiTemperatureInput.addEventListener("input", () => {
      els.aiTemperatureVal.textContent = els.aiTemperatureInput.value;
    });
  }

  els.settingsBtn.addEventListener("click", () => {
    els.settingsModal.classList.remove("hidden");
  });
  els.closeSettingsBtn.addEventListener("click", () => {
    els.settingsModal.classList.add("hidden");
  });
  els.saveSettingsBtn.addEventListener("click", saveSettings);

  els.terminalToggleBtn.addEventListener("click", () => {
    toggleTerminal();
  });

  els.openRouterKeyInput?.addEventListener("input", () => {
    localStorage.setItem("openRouterKey", els.openRouterKeyInput.value);
  });
  if (els.groqKeyInput) {
    els.groqKeyInput.addEventListener("input", () => {
      localStorage.setItem("groqKey", els.groqKeyInput.value);
    });
  }

  els.acceptDiffBtn?.addEventListener("click", async () => {
    try {
      saveCurrentDiffChanges();
      const workspaceRoot = state.workspaceRoot || await window.novaAPI.getWorkspaceRoot();

      for (const file of valkyrieSession.modifiedFiles) {
        let absPath = file.filePath;
        if (workspaceRoot && !file.filePath.startsWith('/')) {
          absPath = `${workspaceRoot}/${file.filePath}`;
        }

        await window.novaAPI.writeFile(absPath, file.proposedContent);
        
        // Update active tab if it's currently open (support both absolute and relative matching)
        const activeTab = state.tabs.find(t => t.path === absPath || t.path === file.filePath);
        if (activeTab) {
          activeTab.content = file.proposedContent;
          activeTab.dirty = false;
          if (state.activePath === absPath || state.activePath === file.filePath) {
            setEditorContent(file.proposedContent, absPath);
          }
        }
      }
      renderTabs();
      state.pendingApplyContent = "";
      updateApplyButtonState();
      hideDiffEditor();
      addChatMessage("system", "✅ Proposed changes accepted and committed to disk.");
    } catch (err) {
      addChatMessage("system", `❌ Failed to commit changes: ${err.message}`);
    }
  });

  els.rejectDiffBtn?.addEventListener("click", () => {
    hideDiffEditor();
    addChatMessage("system", "❌ Proposed changes rejected. Files on disk were not altered.");
  });

  // Onboarding Guided Tour
  const startTourBtn = document.getElementById("startTourBtn");
  if (startTourBtn) {
    startTourBtn.addEventListener("click", startOnboardingTour);
  }
  const onboardingNextBtn = document.getElementById("onboardingNextBtn");
  if (onboardingNextBtn) {
    onboardingNextBtn.addEventListener("click", nextTourStep);
  }
  const onboardingSkipBtn = document.getElementById("onboardingSkipBtn");
  if (onboardingSkipBtn) {
    onboardingSkipBtn.addEventListener("click", endOnboardingTour);
  }

  // Outline Collapse/Expand Toggle
  const outlineHeader = document.getElementById("outlineHeader");
  const outlineTree = document.getElementById("outlineTree");
  if (outlineHeader && outlineTree) {
    outlineHeader.addEventListener("click", () => {
      outlineHeader.classList.toggle("collapsed");
      outlineTree.classList.toggle("hidden");
    });
  }

  // Terminal Add Button
  const addTerminalBtn = document.getElementById("addTerminalBtn");
  if (addTerminalBtn) {
    addTerminalBtn.addEventListener("click", () => {
      createTerminalInstance();
    });
  }

  // Git status bar branch click quick-pick
  const statusGitBranch = document.getElementById("statusGitBranch");
  if (statusGitBranch) {
    statusGitBranch.addEventListener("click", showGitBranchQuickPick);
  }
}

function addActiveFileContext() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    showToastNotification("No active file open!");
    return;
  }
  const id = `file-${activeTab.path}`;
  if (state.chatContexts.some(ctx => ctx.id === id)) {
    showToastNotification("Active file already added as context!");
    return;
  }
  state.chatContexts.push({
    id: id,
    type: "file",
    label: activeTab.name,
    path: activeTab.path
  });
  renderContextChips();
  showToastNotification("📄 Added active file to context");
}

function addSelectionContext() {
  const selection = getSelectedEditorText();
  if (!selection) {
    showToastNotification("No text selected in editor!");
    return;
  }
  const activeTab = getActiveTab();
  const filename = activeTab ? activeTab.name : "Untitled";
  const id = `selection-${Date.now()}`;
  
  state.chatContexts.push({
    id: id,
    type: "selection",
    label: `Selection: ${filename}`,
    value: selection
  });
  renderContextChips();
  showToastNotification("✂️ Added selection to context");
}

function addAllTabsContext() {
  if (!state.tabs || state.tabs.length === 0) {
    showToastNotification("No open tabs!");
    return;
  }
  const id = `all-tabs-${Date.now()}`;
  if (state.chatContexts.some(ctx => ctx.type === "all-tabs")) {
    showToastNotification("All open tabs already added to context!");
    return;
  }
  state.chatContexts.push({
    id: id,
    type: "all-tabs",
    label: `All Tabs (${state.tabs.length})`,
    value: state.tabs.map(t => ({ name: t.name, path: t.path, content: t.content }))
  });
  renderContextChips();
  showToastNotification("📂 Added all open tabs to context");
}

function renderContextChips() {
  if (!els.composerContextBar) return;
  els.composerContextBar.innerHTML = "";
  
  if (state.chatContexts.length === 0) {
    els.composerContextBar.style.display = "none";
    return;
  }
  
  els.composerContextBar.style.display = "flex";
  
  state.chatContexts.forEach(ctx => {
    const chip = document.createElement("div");
    chip.className = "context-chip";
    chip.dataset.id = ctx.id;
    
    let icon = "📄";
    if (ctx.type === "selection") icon = "✂️";
    if (ctx.type === "all-tabs") icon = "📂";
    
    chip.innerHTML = `
      <span class="context-chip-icon">${icon}</span>
      <span class="context-chip-label" title="${ctx.label}">${ctx.label}</span>
      <span class="context-chip-close">×</span>
    `;
    
    const closeBtn = chip.querySelector(".context-chip-close");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.chatContexts = state.chatContexts.filter(c => c.id !== ctx.id);
      renderContextChips();
    });
    
    els.composerContextBar.appendChild(chip);
  });
}

function showToastNotification(msg) {
  // Route through ToastSystem if available, else fall back to chat
  if (typeof showToast === 'function') {
    showToast(msg, 'info');
  } else {
    addChatMessage("system", msg);
  }
}

function getSelectedEditorText() {
  if (!state.editor) {
    return "";
  }
  const selection = state.editor.getSelection();
  if (!selection || selection.isEmpty()) {
    return "";
  }
  const model = state.editor.getModel();
  return model ? model.getValueInRange(selection) : "";
}

/**
 * Toggle chat history panel
 */
function toggleChatHistory() {
  document.dispatchEvent(new CustomEvent('toggle-chat-history'));
  console.log('📋 Toggling chat history');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const handle = document.getElementById('resizeSidebar');
  if (!sidebar) return;
  const isCollapsed = sidebar.classList.toggle('collapsed');
  
  if (isCollapsed) {
    sidebar.style.width = '0px';
    sidebar.style.minWidth = '0px';
    if (handle) {
      handle.classList.add('hidden');
    }
  } else {
    // Restore size from localStorage or fallback to default
    const savedWidth = localStorage.getItem('nova.sidebarWidth') || '240';
    sidebar.style.width = savedWidth + 'px';
    sidebar.style.minWidth = savedWidth + 'px';
    if (handle) {
      handle.classList.remove('hidden');
    }
  }
  
  // Update activity bar active class
  const activityBtns = document.querySelectorAll('.activity-btn[data-panel]');
  if (isCollapsed) {
    activityBtns.forEach(btn => {
      if (btn.dataset.panel !== 'ai') {
        btn.classList.remove('active');
      }
    });
  } else {
    // If not collapsed and no button is active, activate explorer
    const explorerBtn = document.querySelector('.activity-btn[data-panel="explorer"]');
    const searchBtn = document.querySelector('.activity-btn[data-panel="search"]');
    const gitBtn = document.querySelector('.activity-btn[data-panel="git"]');
    const hasActive = [explorerBtn, searchBtn, gitBtn].some(b => b?.classList.contains('active'));
    if (!hasActive) {
      explorerBtn?.classList.add('active');
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('explorerPanel')?.classList.remove('hidden');
    }
  }

  if (state.editor) state.editor.layout();
  updateLayoutToggleButtons();
}

function toggleTerminal() {
  state.terminalVisible = !state.terminalVisible;
  const terminalPanel = document.getElementById('terminalPanel');
  if (terminalPanel) {
    terminalPanel.classList.toggle("hidden", !state.terminalVisible);
  }
  
  if (state.terminalVisible) {
    if (!activeTerminal) {
      initTerminal().then(() => {
        if (activeTerminal) {
          activeTerminal.term.focus();
        }
      });
    } else {
      setTimeout(() => {
        activeTerminal.fit.fit();
        activeTerminal.term.focus();
      }, 50);
    }
  }
  
  if (state.editor) state.editor.layout();
  updateLayoutToggleButtons();
}

function toggleAiPanel() {
  const aiPanel = document.getElementById('aiPanel');
  const handle = document.getElementById('resizeAiPanel');
  if (!aiPanel) return;
  
  const isHidden = aiPanel.classList.toggle('hidden');
  if (handle) {
    handle.classList.toggle('hidden', isHidden);
  }
  
  if (state.editor) state.editor.layout();
  updateLayoutToggleButtons();
}

function updateLayoutToggleButtons() {
  const sidebar = document.getElementById('sidebar');
  const terminalPanel = document.getElementById('terminalPanel');
  const aiPanel = document.getElementById('aiPanel');
  
  if (els.toggleLeftSidebarBtn && sidebar) {
    const isSidebarVisible = !sidebar.classList.contains('collapsed');
    els.toggleLeftSidebarBtn.classList.toggle('active', isSidebarVisible);
  }
  
  if (els.toggleTerminalPanelBtn && terminalPanel) {
    els.toggleTerminalPanelBtn.classList.toggle('active', state.terminalVisible);
  }
  
  if (els.toggleAiPanelBtn && aiPanel) {
    const isAiVisible = !aiPanel.classList.contains('hidden');
    els.toggleAiPanelBtn.classList.toggle('active', isAiVisible);
  }
}

window.toggleSidebar = toggleSidebar;
window.toggleTerminal = toggleTerminal;
window.toggleAiPanel = toggleAiPanel;
window.updateLayoutToggleButtons = updateLayoutToggleButtons;

/**
 * Select agent role
 */
function selectAgentRole(role) {
  const mappedMode = BADGE_ROLE_TO_MODEL_MODE[role] || role;
  state.selectedAgent = mappedMode;
  syncAgentModeUI();
  syncProviderUI();
  console.log(`🎯 Selected agent role: ${role} -> ${mappedMode}`);
}

function syncAgentModeUI() {
  if (els.modelModeSelect && els.modelModeSelect.value !== state.selectedAgent) {
    els.modelModeSelect.value = state.selectedAgent;
  }

  const btnSupernova = document.getElementById("btnSupernova");
  const btnGptOss = document.getElementById("btnGptOss");
  if (state.selectedAgent === "supernova-v1") {
    btnSupernova?.classList.add("active");
    btnGptOss?.classList.remove("active");
  } else {
    btnGptOss?.classList.add("active");
    btnSupernova?.classList.remove("active");
  }

  els.agentBadges?.forEach((badge) => {
    const badgeMode = BADGE_ROLE_TO_MODEL_MODE[badge.dataset.role];
    const shouldBeActive = state.selectedAgent !== "supernova-v1" && badgeMode === state.selectedAgent;
    badge.classList.toggle("active", shouldBeActive);
    badge.classList.toggle("inactive", !shouldBeActive);
  });
}

function normalizePath(input = "") {
  return input.replace(/\\/g, "/").split("/").filter(Boolean).join("/");
}

function compareNodes(a, b) {
  if (a.type !== b.type) {
    return a.type === "folder" ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

function searchWorkspaceTree(query) {
  const results = [];
  if (!state.tree) return results;
  
  function traverse(node) {
    if (node.type === "file" && node.name.toLowerCase().includes(query.toLowerCase())) {
      results.push(node);
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }
  }
  
  if (state.tree.children) {
    state.tree.children.forEach(traverse);
  }
  return results;
}

async function handleSelectWorkspace() {
  try {
    state.workspaceRoot = await window.novaAPI.selectWorkspaceRoot();
    if (!state.workspaceRoot) return; // User cancelled the dialog

    state.tabs = [];
    state.activePath = null;
    state.selectedPath = "";
    
    // Dispose all terminals to reset root
    if (state.terminals && state.terminals.length > 0) {
      state.terminals.forEach((termInstance) => {
        try {
          termInstance.dispose();
        } catch (e) {
          console.error(e);
        }
      });
      state.terminals = [];
      state.activeTerminalId = null;
      activeTerminal = null;
    }
    renderTerminalTabs();

    hideWelcomeScreen();
    clearEditor();
    await refreshWorkspaceTree();
    addChatMessage("system", `Workspace opened: ${state.workspaceRoot}`);
  } catch (error) {
    addChatMessage("system", `Workspace switch failed: ${error.message}`);
  }
}

/**
 * Show the VS Code-style welcome screen when no folder is open
 */
function showWelcomeScreen() {
  const ws = document.getElementById('welcomeScreen');
  if (ws) {
    ws.classList.remove('hidden');
    ws.classList.remove('fade-out');
    ws.classList.add('fade-in');
    
    // Trigger the sequenced typing intro log animation
    animateWelcomeIntroLogText();
  }
  if (els.monacoEditorContainer) {
    els.monacoEditorContainer.classList.add('hidden');
  }
  if (els.tabsBar) {
    const empty = document.createElement('div');
    empty.className = 'tab-empty';
    empty.textContent = 'No open tabs';
    els.tabsBar.innerHTML = '';
    els.tabsBar.appendChild(empty);
  }
}

function hideWelcomeScreen() {
  const ws = document.getElementById('welcomeScreen');
  if (!ws) return;

  // Clear welcome typing timer if active
  if (window.welcomeTypingTimer) {
    clearInterval(window.welcomeTypingTimer);
    window.welcomeTypingTimer = null;
  }

  // Swap fade-in → fade-out, then hide after animation completes
  ws.classList.remove('fade-in');
  ws.classList.add('fade-out');
  ws.addEventListener('animationend', () => {
    ws.classList.add('hidden');
    ws.classList.remove('fade-out');
  }, { once: true });
  // Fallback: hide after 300ms if animationend doesn't fire
  setTimeout(() => {
    if (!ws.classList.contains('hidden')) {
      ws.classList.add('hidden');
      ws.classList.remove('fade-out');
    }
  }, 300);

  if (els.monacoEditorContainer) {
    els.monacoEditorContainer.classList.remove('hidden');
    if (state.editor) {
      setTimeout(() => {
        state.editor.layout();
      }, 50);
    }
  }
}

async function refreshWorkspaceTree() {
  try {
    state.tree = await window.novaAPI.readTree();
    state.workspaceRoot = await window.novaAPI.getWorkspaceRoot();
    state.expandedFolders.add("");
    // Show folder name only (not full path) in the title bar label
    if (state.workspaceRoot) {
      const folderName = state.workspaceRoot.split('/').pop() || state.workspaceRoot;
      els.workspaceLabel.textContent = folderName;
      els.workspaceLabel.title = state.workspaceRoot;
    } else {
      els.workspaceLabel.textContent = '';
    }
    renderFileTree();
    renderTabs();
    updateContextLabel();
    if (state.workspaceRoot) {
      refreshGitPanel().catch(() => {});
    }
  } catch (error) {
    addChatMessage("system", `Failed to refresh file tree: ${error.message}`);
  }
}

function renderFileTree() {
  els.fileTree.innerHTML = "";
  if (!state.tree || !Array.isArray(state.tree.children) || state.tree.children.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No files in this workspace yet.";
    empty.className = "tab-empty";
    els.fileTree.appendChild(empty);
    return;
  }

  const rootList = document.createElement("ul");
  rootList.className = "tree-list";

  const children = [...state.tree.children].sort(compareNodes);
  for (const child of children) {
    rootList.appendChild(renderTreeNode(child, 0));
  }

  els.fileTree.appendChild(rootList);

  // Re-initialize keyboard navigation for dynamically rendered tree rows
  if (typeof KeyboardNav !== 'undefined' && KeyboardNav.initFileTreeArrows) {
    KeyboardNav.initFileTreeArrows();
  }
}

function renderTreeNode(node, depth) {
  const li = document.createElement("li");
  const row = document.createElement("div");
  row.className = "tree-row";
  row.setAttribute('tabindex', '0');
  row.style.paddingLeft = `${8 + depth * 14}px`;

  const caret = document.createElement("span");
  caret.className = "tree-caret";
  if (node.type === "folder") {
    caret.textContent = "▸";
    if (state.expandedFolders.has(node.path)) {
      caret.classList.add("expanded");
    }
  } else {
    caret.textContent = " ";
    caret.classList.add("empty");
  }

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.innerHTML = getNodeIcon(node);

  const name = document.createElement("span");
  name.className = "tree-label";
  if (node.type === "folder") {
    name.classList.add("folder-name");
  }
  name.textContent = node.name;

  if (node.path === state.activePath) {
    row.classList.add("active");
  }
  if (node.path === state.selectedPath) {
    row.classList.add("selected");
  }

  row.addEventListener("click", async (event) => {
    event.stopPropagation();
    state.selectedPath = node.path;

    if (node.type === "folder") {
      if (state.expandedFolders.has(node.path)) {
        state.expandedFolders.delete(node.path);
      } else {
        state.expandedFolders.add(node.path);
      }
      renderFileTree();
      return;
    }

    await openFile(node.path);
  });

  // Context menu for file tree rows
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof ContextMenu === 'undefined') return;

    let items;
    if (node.type === 'file') {
      items = [
        { label: 'Open', action: () => openFile(node.path) },
        { label: 'Rename', action: () => handleRenameNode(node) },
        { label: 'Delete', action: () => handleDeleteNode(node) },
        { separator: true },
        { label: 'Copy Path', action: () => { navigator.clipboard.writeText(node.path); showToastNotification('Path copied to clipboard'); } }
      ];
    } else {
      items = [
        { label: 'New File', action: () => handleCreateFileInFolder(node.path) },
        { label: 'New Folder', action: () => handleCreateFolderInFolder(node.path) },
        { separator: true },
        { label: 'Rename', action: () => handleRenameNode(node) },
        { label: 'Delete', action: () => handleDeleteNode(node) },
        { separator: true },
        { label: 'Copy Path', action: () => { navigator.clipboard.writeText(node.path); showToastNotification('Path copied to clipboard'); } }
      ];
    }
    ContextMenu.show(e.clientX, e.clientY, items);
  });

  row.append(caret, icon, name);
  li.appendChild(row);

  if (node.type === "folder" && state.expandedFolders.has(node.path) && Array.isArray(node.children)) {
    const childList = document.createElement("ul");
    childList.className = "tree-list";
    const children = [...node.children].sort(compareNodes);
    for (const child of children) {
      childList.appendChild(renderTreeNode(child, depth + 1));
    }
    li.appendChild(childList);
  }

  return li;
}

function getNodeIcon(node) {
  if (node.type === "folder") {
    return state.expandedFolders.has(node.path) ? (window.NOVA_ICONS?.folderOpen || "") : (window.NOVA_ICONS?.folder || "");
  }
  return window.getFileIcon ? window.getFileIcon(node.name) : (window.NOVA_ICONS?.file || "");
}

function getExtension(fileName = "") {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function getLanguageForPath(filePath = "") {
  const ext = getExtension(filePath);
  return LANGUAGE_BY_EXT[ext] || "plaintext";
}

function renderTabs() {
  window.renderTabs = renderTabs;
  els.tabsBar.innerHTML = "";
  if (state.tabs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tab-empty";
    empty.textContent = "No open tabs";
    els.tabsBar.appendChild(empty);
    return;
  }

  for (const tab of state.tabs) {
    const tabButton = document.createElement("button");
    tabButton.className = "tab";
    if (tab.path === state.activePath) {
      tabButton.classList.add("active");
    }
    if (tab.dirty || state.savingPaths.has(tab.path)) {
      tabButton.classList.add("saving");
    }

    const fileName = tab.path.split("/").pop();

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = fileName;

    const iconSpan = document.createElement("span");
    iconSpan.className = "tab-file-icon";
    iconSpan.innerHTML = window.getFileIcon ? window.getFileIcon(fileName) : "";

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.innerHTML = window.NOVA_ICONS?.close || "×";
    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(tab.path);
    });

    tabButton.addEventListener("click", () => {
      activateTab(tab.path);
    });

    // Context menu for tabs
    tabButton.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof ContextMenu === 'undefined') return;

      const items = [
        { label: 'Close Tab', action: () => closeTab(tab.path) },
        { label: 'Close Other Tabs', action: () => closeOtherTabs(tab.path) },
        { label: 'Close All Tabs', action: () => closeAllTabs() },
        { separator: true },
        { label: 'Copy File Path', action: () => { navigator.clipboard.writeText(tab.path); showToastNotification('Path copied to clipboard'); } }
      ];
      ContextMenu.show(e.clientX, e.clientY, items);
    });

    tabButton.append(iconSpan, title, closeBtn);
    els.tabsBar.appendChild(tabButton);
  }
}

function activateTab(path) {
  const tab = state.tabs.find((entry) => entry.path === path);
  if (!tab) {
    return;
  }
  state.activePath = path;
  state.selectedPath = path;
  setEditorContent(tab.content, path);
  renderTabs();
  renderFileTree();
  updateContextLabel();
  updateApplyButtonState();
  renderBreadcrumbs();
  renderOutline();
}

function createMonacoUri(pathStr) {
  if (pathStr.startsWith('file://')) {
    return monaco.Uri.parse(pathStr);
  }
  const cleanPath = pathStr.replace(/\\/g, '/');
  if (cleanPath.startsWith('/') || /^[a-zA-Z]:\//.test(cleanPath)) {
    return monaco.Uri.file(cleanPath);
  }
  const workspaceRoot = state.workspaceRoot;
  if (workspaceRoot) {
    const abs = workspaceRoot.replace(/\\/g, '/');
    const separator = abs.endsWith('/') ? '' : '/';
    return monaco.Uri.file(`${abs}${separator}${cleanPath}`);
  }
  const pathNoLeadingSlash = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
  return monaco.Uri.parse(`file:///${pathNoLeadingSlash}`);
}

function closeTab(path) {
  const index = state.tabs.findIndex((tab) => tab.path === path);
  if (index === -1) {
    return;
  }

  state.tabs.splice(index, 1);
  
  // Dispose the Monaco model to keep memory safe
  const fileUri = createMonacoUri(path);
  const model = monaco.editor.getModel(fileUri);
  if (model) {
    model.dispose();
  }

  if (state.activePath === path) {
    const fallback = state.tabs[index] || state.tabs[index - 1] || null;
    if (fallback) {
      state.activePath = fallback.path;
      setEditorContent(fallback.content, fallback.path);
    } else {
      state.activePath = null;
      clearEditor();
    }
  }

  renderTabs();
  renderFileTree();
  updateContextLabel();
  updateApplyButtonState();
  renderBreadcrumbs();
  renderOutline();
}

async function openFile(filePath) {
  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath) {
    return;
  }

  const existingTab = state.tabs.find((tab) => tab.path === normalizedPath);
  if (existingTab) {
    activateTab(normalizedPath);
    return;
  }

  try {
    const content = await window.novaAPI.readFile(normalizedPath);
    state.tabs.push({
      path: normalizedPath,
      content,
      dirty: false
    });
    state.activePath = normalizedPath;
    state.selectedPath = normalizedPath;
    setEditorContent(content, normalizedPath);
    renderTabs();
    renderFileTree();
    updateContextLabel();
    updateApplyButtonState();
    renderBreadcrumbs();
    renderOutline();
  } catch (error) {
    addChatMessage("system", `Failed to open ${normalizedPath}: ${error.message}`);
  }
}

function clearEditor() {
  if (state.editor) {
    state.editor.setValue("");
  }
  updateStatusBar();
  renderBreadcrumbs();
  renderOutline();
  showWelcomeScreen();
}

/**
 * Assigns code content dynamically using Monaco virtual models
 */
function setEditorContent(content, filePath) {
  if (!state.editor) return;

  if (!filePath) {
    state.editor.setValue(content ?? "");
    updateStatusBar();
    return;
  }

  hideWelcomeScreen();

  const fileUri = createMonacoUri(filePath);
  let model = monaco.editor.getModel(fileUri);

  if (!model) {
    model = monaco.editor.createModel(content ?? "", getLanguageForPath(filePath), fileUri);
  } else {
    if (model.getValue() !== content) {
      model.setValue(content ?? "");
    }
  }

  state.editor.setModel(model);
  updateStatusBar();
}

function getActiveTab() {
  return state.tabs.find((tab) => tab.path === state.activePath) || null;
}

function handleEditorInput() {
  const activeTab = getActiveTab();
  if (!activeTab || !state.editor) {
    updateStatusBar();
    return;
  }

  const content = state.editor.getValue();
  
  // Only register edit if model value differs
  if (activeTab.content !== content) {
    activeTab.content = content;
    activeTab.dirty = true;
    scheduleSave(activeTab.path, content);
    renderTabs();
    renderOutline();
  }
  updateStatusBar();
}

function scheduleSave(filePath, content) {
  if (saveTimers.has(filePath)) {
    clearTimeout(saveTimers.get(filePath));
  }

  const timer = setTimeout(async () => {
    state.savingPaths.add(filePath);
    renderTabs();
    try {
      await window.novaAPI.writeFile(filePath, content);
      const tab = state.tabs.find((entry) => entry.path === filePath);
      if (tab && tab.content === content) {
        tab.dirty = false;
      }
    } catch (error) {
      addChatMessage("system", `Save failed for ${filePath}: ${error.message}`);
    } finally {
      state.savingPaths.delete(filePath);
      renderTabs();
    }
  }, 350);

  saveTimers.set(filePath, timer);
}

function updateStatusBar() {
  const language = state.activePath ? getLanguageForPath(state.activePath) : "plaintext";
  const cursor = getCursorPosition();
  els.statusLanguage.textContent = language;
  els.statusCursor.textContent = `Ln ${cursor.line}, Col ${cursor.column}`;
  els.statusEncoding.textContent = "UTF-8";

  const activeTab = getActiveTab();
  if (els.statusSaveState) {
    if (activeTab && activeTab.dirty) {
      els.statusSaveState.textContent = "● Unsaved Changes";
      els.statusSaveState.className = "status-item dirty";
    } else if (activeTab) {
      els.statusSaveState.textContent = "● Saved";
      els.statusSaveState.className = "status-item clean";
    } else {
      els.statusSaveState.textContent = "";
      els.statusSaveState.className = "status-item hidden";
    }
  }
}

function getCursorPosition() {
  if (!state.editor) {
    return { line: 1, column: 1 };
  }
  const position = state.editor.getPosition();
  return {
    line: position ? position.lineNumber : 1,
    column: position ? position.column : 1
  };
}

function updateContextLabel() {
  if (els.contextFileLabel) {
    els.contextFileLabel.textContent = state.activePath || "No file selected";
  }
}

function getSuggestedBasePath() {
  const selectedNode = findNodeByPath(state.selectedPath);
  if (!selectedNode) {
    return "";
  }
  if (selectedNode.type === "folder") {
    return selectedNode.path;
  }
  const parts = selectedNode.path.split("/");
  parts.pop();
  return parts.join("/");
}

async function handleCreateFile() {
  // Guard: workspace must be open
  if (!state.workspaceRoot) {
    addChatMessage("system", "⚠️ Please open a folder first before creating files.");
    return;
  }

  const basePath = getSuggestedBasePath();
  const suggestion = basePath ? `${basePath}/` : "";
  const rawPath = window.prompt("New file path (e.g. src/index.ts):", suggestion);
  if (!rawPath || !rawPath.trim()) {
    return;
  }

  const filePath = normalizePath(rawPath.trim());
  if (!filePath) {
    return;
  }

  try {
    await window.novaAPI.createFile(filePath);
    await refreshWorkspaceTree();
    await openFile(filePath);
    addChatMessage("system", `✅ Created file: ${filePath}`);
  } catch (error) {
    addChatMessage("system", `❌ Could not create file: ${error.message}`);
  }
}

async function handleCreateFolder() {
  // Guard: workspace must be open
  if (!state.workspaceRoot) {
    addChatMessage("system", "⚠️ Please open a folder first before creating folders.");
    return;
  }

  const basePath = getSuggestedBasePath();
  const suggestion = basePath ? `${basePath}/` : "";
  const rawPath = window.prompt("New folder path (e.g. src/components):", suggestion);
  if (!rawPath || !rawPath.trim()) {
    return;
  }

  const folderPath = normalizePath(rawPath.trim());
  if (!folderPath) {
    return;
  }

  try {
    await window.novaAPI.createFolder(folderPath);
    state.expandedFolders.add(folderPath);
    await refreshWorkspaceTree();
    addChatMessage("system", `✅ Created folder: ${folderPath}`);
  } catch (error) {
    addChatMessage("system", `❌ Could not create folder: ${error.message}`);
  }
}

function closeOtherTabs(path) {
  const keepTab = state.tabs.find((tab) => tab.path === path);
  if (!keepTab) return;

  state.tabs.forEach((tab) => {
    if (tab.path !== path) {
      const fileUri = createMonacoUri(tab.path);
      const model = monaco.editor.getModel(fileUri);
      if (model) model.dispose();
    }
  });

  state.tabs = [keepTab];
  state.activePath = path;
  setEditorContent(keepTab.content, keepTab.path);

  renderTabs();
  renderFileTree();
  updateContextLabel();
  updateApplyButtonState();
}

function closeAllTabs() {
  state.tabs.forEach((tab) => {
    const fileUri = createMonacoUri(tab.path);
    const model = monaco.editor.getModel(fileUri);
    if (model) model.dispose();
  });

  state.tabs = [];
  state.activePath = null;
  clearEditor();

  renderTabs();
  renderFileTree();
  updateContextLabel();
  updateApplyButtonState();
}

async function handleCreateFileInFolder(folderPath) {
  const suggestion = folderPath ? `${folderPath}/` : "";
  const rawPath = window.prompt("New file path:", suggestion);
  if (!rawPath || !rawPath.trim()) return;
  const filePath = normalizePath(rawPath.trim());
  if (!filePath) return;
  try {
    await window.novaAPI.createFile(filePath);
    await refreshWorkspaceTree();
    await openFile(filePath);
    showToastNotification(`✅ Created file: ${filePath}`);
  } catch (error) {
    showToastNotification(`❌ Could not create file: ${error.message}`);
  }
}

async function handleCreateFolderInFolder(folderPath) {
  const suggestion = folderPath ? `${folderPath}/` : "";
  const rawPath = window.prompt("New folder path:", suggestion);
  if (!rawPath || !rawPath.trim()) return;
  const targetFolderPath = normalizePath(rawPath.trim());
  if (!targetFolderPath) return;
  try {
    await window.novaAPI.createFolder(targetFolderPath);
    state.expandedFolders.add(targetFolderPath);
    await refreshWorkspaceTree();
    showToastNotification(`✅ Created folder: ${targetFolderPath}`);
  } catch (error) {
    showToastNotification(`❌ Could not create folder: ${error.message}`);
  }
}

async function handleRenameNode(node) {
  const newName = window.prompt(`Rename ${node.type}:`, node.name);
  if (!newName || !newName.trim() || newName.trim() === node.name) return;

  const parts = node.path.split('/');
  parts.pop();
  parts.push(newName.trim());
  const newPath = parts.join('/');

  try {
    await window.novaAPI.renameNode(node.path, newPath);
    
    // For any tabs that are affected by this rename, dispose model and rename tab
    state.tabs.forEach(tab => {
      if (tab.path === node.path || tab.path.startsWith(node.path + '/')) {
        const oldUri = createMonacoUri(tab.path);
        const oldModel = monaco.editor.getModel(oldUri);
        if (oldModel) oldModel.dispose();

        let newTabPath = newPath;
        if (tab.path.startsWith(node.path + '/')) {
          newTabPath = newPath + tab.path.slice(node.path.length);
        }
        tab.path = newTabPath;
      }
    });

    if (state.activePath === node.path) {
      state.activePath = newPath;
    } else if (state.activePath && state.activePath.startsWith(node.path + '/')) {
      state.activePath = newPath + state.activePath.slice(node.path.length);
    }

    if (state.activePath) {
      const activeTab = state.tabs.find(t => t.path === state.activePath);
      if (activeTab) {
        setEditorContent(activeTab.content, activeTab.path);
      }
    }

    await refreshWorkspaceTree();
    renderTabs();
    showToastNotification(`✅ Renamed ${node.type} to ${newName}`);
  } catch (error) {
    showToastNotification(`❌ Could not rename ${node.type}: ${error.message}`);
  }
}

async function handleDeleteNode(node) {
  const confirm = window.confirm(`Are you sure you want to delete this ${node.type} and all its contents?`);
  if (!confirm) return;

  try {
    await window.novaAPI.deleteNode(node.path);
    // Close tab(s)
    const tabsToClose = state.tabs.filter(t => t.path === node.path || t.path.startsWith(node.path + '/'));
    tabsToClose.forEach(t => {
      closeTab(t.path);
    });
    await refreshWorkspaceTree();
    showToastNotification(`✅ Deleted ${node.type}: ${node.path}`);
  } catch (error) {
    showToastNotification(`❌ Could not delete: ${error.message}`);
  }
}

function renderModelOptions() {
  if (!els.modelSelect) return;
  els.modelSelect.innerHTML = "";
  for (const [key, config] of Object.entries(MODEL_CONFIG)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = config.label;
    els.modelSelect.appendChild(option);
  }
  els.modelSelect.value = state.modelKey;
  if (els.modeSelect) els.modeSelect.value = state.mode;
  if (els.providerSelect) els.providerSelect.value = state.provider;
}

function syncProviderUI() {
  const isRapidChat = state.selectedAgent === "rapidchat" || state.provider === "rapidchat";
  
  // Hide or show Rapid-Chat Container
  if (els.rapidChatContainer) {
    els.rapidChatContainer.classList.toggle("hidden", !isRapidChat);
    if (isRapidChat && els.rapidChatIframe) {
      if (els.rapidChatIframe.src === "about:blank" || els.rapidChatIframe.src === "") {
        els.rapidChatIframe.src = "https://speedchat.vercel.app";
      }
    }
  }

  // Toggle built-in chat messages and chat composer visibility
  if (els.chatMessages) {
    els.chatMessages.classList.toggle("hidden", isRapidChat);
  }
  const chatComposer = document.querySelector(".chat-composer");
  if (chatComposer) {
    chatComposer.classList.toggle("hidden", isRapidChat);
  }
  
  // Hide conversations section
  const conversationsSection = document.querySelector(".conversations-section-details");
  if (conversationsSection) {
    conversationsSection.classList.toggle("hidden", isRapidChat);
  }
  
  if (isRapidChat) {
    // Hide key wrappers and configurations
    els.openRouterKeyWrap?.classList.add("hidden");
    if (els.groqKeyWrap) {
      els.groqKeyWrap.classList.add("hidden");
    }
    if (els.modelHint) {
      els.modelHint.textContent = "🚀 Running Rapid-Chat Interface (by your friend) embedded directly!";
    }
    return;
  }

  const model = MODEL_CONFIG[state.modelKey];
  const isOpenRouter = state.provider === "openrouter";
  const isEditMode = state.mode === "edit";
  
  const showKeys = isOpenRouter || isEditMode;

  els.openRouterKeyWrap?.classList.toggle("hidden", !showKeys);
  if (els.groqKeyWrap) {
    els.groqKeyWrap.classList.toggle("hidden", !showKeys);
  }
  
  if (els.modelHint) {
    if (isEditMode) {
      els.modelHint.textContent = "⚡ Edit mode activates the Valkyrie Multi-Agent cohort (DeepSeek R1 + Qwen Coder + Llama 3.3). API Keys are required.";
    } else {
      els.modelHint.textContent = isOpenRouter
        ? `OpenRouter model: ${model?.openrouterModel || "default"} (free-tier availability can vary).`
        : `Pollinations model: ${model?.pollinationsModel || "default"} (no API key required).`;
    }
  }
}

async function loadConversations() {
  try {
    state.conversations = await window.novaAPI.chat.getConversations();
    
    if (state.conversations.length === 0) {
      const newConversationId = await window.novaAPI.chat.createConversation("New Conversation");
      state.currentConversationId = newConversationId;
      state.conversations = await window.novaAPI.chat.getConversations();
    } else {
      state.currentConversationId = state.conversations[0].id;
      await loadConversationMessages(state.currentConversationId);
    }
    renderConversationList();
  } catch (error) {
    console.error("Failed to load conversations:", error);
    addChatMessage("system", "Failed to load conversation history from database.");
  }
}

function renderConversationList() {
  els.conversationList.innerHTML = "";
  
  for (const conversation of state.conversations) {
    const item = document.createElement("div");
    item.className = `conversation-item ${conversation.id === state.currentConversationId ? "active" : ""}`;
    
    const title = document.createElement("span");
    title.className = "conversation-item-title";
    title.textContent = conversation.title;
    title.title = "Double-click to rename";
    title.addEventListener("dblclick", async (event) => {
      event.stopPropagation();
      const newTitle = prompt("Rename conversation:", conversation.title);
      if (newTitle && newTitle.trim()) {
        try {
          await window.novaAPI.chat.updateConversationTitle(conversation.id, newTitle.trim());
          state.conversations = await window.novaAPI.chat.getConversations();
          renderConversationList();
        } catch (error) {
          console.error("Failed to rename conversation:", error);
        }
      }
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "conversation-item-delete";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (confirm(`Delete conversation "${conversation.title}"?`)) {
        try {
          await window.novaAPI.chat.deleteConversation(conversation.id);
          state.conversations = await window.novaAPI.chat.getConversations();
          if (state.currentConversationId === conversation.id) {
            state.currentConversationId = state.conversations[0]?.id || null;
            if (state.currentConversationId) {
              await loadConversationMessages(state.currentConversationId);
            } else {
              state.chatMessages = [];
              state.apiMessages = [];
              renderChatMessages();
            }
          }
          renderConversationList();
        } catch (error) {
          console.error("Failed to delete conversation:", error);
          addChatMessage("system", "Failed to delete conversation.");
        }
      }
    });
    
    item.addEventListener("click", () => {
      switchConversation(conversation.id);
    });
    
    item.append(title, deleteBtn);
    els.conversationList.appendChild(item);
  }
}

async function loadConversationMessages(conversationId) {
  try {
    const messages = await window.novaAPI.chat.getMessages(conversationId);
    state.chatMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
    }));
    state.apiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    renderChatMessages();
  } catch (error) {
    console.error("Failed to load messages:", error);
  }
}

async function createNewConversation() {
  try {
    const title = prompt("Enter conversation title:", "New Conversation");
    if (!title) return;
    
    const newConversationId = await window.novaAPI.chat.createConversation(title);
    state.currentConversationId = newConversationId;
    state.chatMessages = [];
    state.apiMessages = [];
    state.conversations = await window.novaAPI.chat.getConversations();
    renderConversationList();
    renderChatMessages();
    addChatMessage("assistant", "Started a new conversation. I'll include the active Monaco file as context in every request.");
  } catch (error) {
    console.error("Failed to create conversation:", error);
    addChatMessage("system", "Failed to create new conversation.");
  }
}

async function switchConversation(conversationId) {
  try {
    state.currentConversationId = conversationId;
    await loadConversationMessages(conversationId);
    renderConversationList();
  } catch (error) {
    console.error("Failed to switch conversation:", error);
    addChatMessage("system", "Failed to switch conversation.");
  }
}

/**
 * Smart auto-scroll for chat message area.
 * It checks if the user is already scrolled near the bottom,
 * and if so, schedules a scroll to the bottom after layout reflow.
 * If activeValkyrieCard is active, uses a larger threshold (350px) to handle expanding components.
 */
function scrollChatToBottom(force = false) {
  const container = els.chatMessages;
  if (!container) return;
  
  const threshold = activeValkyrieCard ? 350 : 150;
  const isNearBottom = force || (container.scrollHeight - container.clientHeight - container.scrollTop < threshold);
  
  if (isNearBottom) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 30);
    // Also schedule another scroll at 250ms to perfectly account for CSS max-height transitions (which take 200ms)
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 250);
  }
}

/**
 * Smart auto-scroll for nested scrollable containers (e.g. thought-content, diff-content)
 * only if the user is already scrolled near the bottom of that element, or if forced.
 */
function scrollElementToBottom(element, force = false) {
  if (!element) return;
  const isNearBottom = force || (element.scrollHeight - element.clientHeight - element.scrollTop < 40);
  if (isNearBottom) {
    element.scrollTop = element.scrollHeight;
  }
}

function addChatMessage(role, content) {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.chatMessages.push({ role, content, timestamp });
  renderChatMessages();
}

function renderChatMessages() {
  const welcomeScreen = document.getElementById("aiWelcomeScreen");
  if (state.chatMessages.length > 0) {
    welcomeScreen?.classList.add("hidden");
    els.chatMessages.classList.remove("hidden");
  } else {
    welcomeScreen?.classList.remove("hidden");
    els.chatMessages.classList.add("hidden");
  }

  els.chatMessages.innerHTML = "";
  for (const message of state.chatMessages) {
    const chatMsg = document.createElement("div");
    chatMsg.className = `chat-message ${message.role}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = formatMessageContent(message.content);

    chatMsg.appendChild(bubble);

    if (message.timestamp) {
      const timeSpan = document.createElement("span");
      timeSpan.className = "message-timestamp";
      timeSpan.textContent = message.timestamp;
      chatMsg.appendChild(timeSpan);
    }

    els.chatMessages.appendChild(chatMsg);
  }

  if (state.agentBusy) {
    const typingMsg = document.createElement("div");
    typingMsg.className = "chat-message assistant typing";
    
    const bubble = document.createElement("div");
    bubble.className = "message-bubble typing-bubble";
    bubble.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    
    typingMsg.appendChild(bubble);
    els.chatMessages.appendChild(typingMsg);
  }

  // Colorize code blocks using Monaco colorizer in real-time
  if (window.monaco && monaco.editor && typeof monaco.editor.colorizeElement === 'function') {
    const codeBlocks = els.chatMessages.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      if (!block.dataset.colorized) {
        block.dataset.colorized = "true";
        monaco.editor.colorizeElement(block, { theme: 'vs-dark' }).then(() => {
          block.style.backgroundColor = 'transparent';
        });
      }
    });
  }

  scrollChatToBottom(true);
}

window.copyCodeBlock = (btn, encodedCode) => {
  const code = decodeURIComponent(encodedCode);
  navigator.clipboard.writeText(code).then(() => {
    btn.innerHTML = `<svg style="width: 14px; height: 14px; margin-right: 4px; display: inline-block; vertical-align: middle;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>Copied!`;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = `<svg style="width: 14px; height: 14px; margin-right: 4px; display: inline-block; vertical-align: middle;" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>Copy`;
      btn.classList.remove("copied");
    }, 2000);
  });
};

window.insertAtCursor = (encodedCode) => {
  const code = decodeURIComponent(encodedCode);
  if (!state.editor) {
    showToastNotification("No active editor!");
    return;
  }
  const selection = state.editor.getSelection();
  const range = new monaco.Range(
    selection.startLineNumber,
    selection.startColumn,
    selection.endLineNumber,
    selection.endColumn
  );
  const id = { major: 1, minor: 1 };
  const text = code;
  const op = { identifier: id, range: range, text: text, forceMoveMarkers: true };
  state.editor.executeEdits("my-source", [op]);
  showToastNotification("Inserted code at cursor!");
};

window.applyToActiveFile = (encodedCode) => {
  const code = decodeURIComponent(encodedCode);
  const activeTab = getActiveTab();
  if (!activeTab || !state.editor) {
    showToastNotification("No active file open!");
    return;
  }
  state.editor.setValue(code);
  handleEditorInput();
  showToastNotification(`Applied changes to ${activeTab.name}`);
};

function formatMessageContent(content) {
  if (!content) return "";
  
  let escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  const codeBlockRegex = /```(\w*)\r?\n([\s\S]*?)```/g;
  escaped = escaped.replace(codeBlockRegex, (match, lang, code) => {
    const encoded = encodeURIComponent(code.trim());
    const displayLang = lang ? lang.toLowerCase() : "code";
    return `<div class="code-container">
  <div class="code-header">
    <span class="code-lang">${displayLang}</span>
    <div class="code-header-actions">
      <button class="code-action-btn" onclick="window.copyCodeBlock(this, '${encoded}')">Copy</button>
      <button class="code-action-btn" onclick="window.insertAtCursor('${encoded}')">Insert</button>
      <button class="code-action-btn" onclick="window.applyToActiveFile('${encoded}')">Apply</button>
    </div>
  </div>
  <pre><code class="language-${displayLang}">${code.trim()}</code></pre>
</div>`;
  });
  
  const customCodeBlockRegex = /&lt;nova-code&gt;([\s\S]*?)&lt;\/nova-code&gt;/g;
  escaped = escaped.replace(customCodeBlockRegex, (match, code) => {
    const encoded = encodeURIComponent(code.trim());
    return `<div class="code-container">
  <div class="code-header">
    <span class="code-lang">code</span>
    <div class="code-header-actions">
      <button class="code-action-btn" onclick="window.copyCodeBlock(this, '${encoded}')">Copy</button>
      <button class="code-action-btn" onclick="window.insertAtCursor('${encoded}')">Insert</button>
      <button class="code-action-btn" onclick="window.applyToActiveFile('${encoded}')">Apply</button>
    </div>
  </div>
  <pre><code>${code.trim()}</code></pre>
</div>`;
  });

  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  const lines = escaped.split('\n');
  let inList = false;
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.includes('<pre>') || line.includes('</pre>') || line.includes('<code>') || line.includes('</code>')) {
      processedLines.push(line);
      continue;
    }
    
    const listMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${listMatch[2]}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }
  
  let finalHtml = processedLines.join('\n');
  
  const parts = finalHtml.split(/(<\/pre>|<pre>)/g);
  let isInsidePre = false;
  for (let k = 0; k < parts.length; k++) {
    if (parts[k] === '<pre>') {
      isInsidePre = true;
    } else if (parts[k] === '</pre>') {
      isInsidePre = false;
    } else if (!isInsidePre) {
      parts[k] = parts[k].replace(/\n/g, '<br>');
    }
  }
  
  return parts.join('');
}

function setAgentBusy(isBusy) {
  state.agentBusy = isBusy;
  els.agentStatusDot.classList.toggle("busy", isBusy);
  els.agentStatusText.textContent = isBusy ? "Thinking..." : "Ready";
  if (els.sendAgentBtn) els.sendAgentBtn.disabled = isBusy;
  if (els.sendAgentPromptBtn) els.sendAgentPromptBtn.disabled = isBusy;
  renderChatMessages();
}

function buildFileTreeContext() {
  if (!state.tree) {
    return "";
  }

  const files = [];
  function collectFiles(node, depth = 0) {
    if (node.type === "file") {
      files.push("  ".repeat(depth) + node.path);
    } else if (node.type === "folder" && Array.isArray(node.children)) {
      files.push("  ".repeat(depth) + node.path + "/");
      for (const child of node.children) {
        collectFiles(child, depth + 1);
      }
    }
  }

  collectFiles(state.tree);

  if (files.length === 0) {
    return "";
  }

  return [
    "Workspace file tree:",
    ...files.slice(0, 50),
    files.length > 50 ? `... and ${files.length - 50} more files` : ""
  ].join("\n");
}

function isQueryConversational(prompt) {
  const clean = prompt.toLowerCase().trim().replace(/[?.,!]/g, "");
  
  // Basic offline local triggers (greetings, capabilities, listing)
  const localTriggers = [
    "what are you", "what can you do", "who are you", "help", 
    "supernova help", "about", "about supernova", "what is this",
    "tell me about yourself", "capabilities", "features",
    "list files", "show files", "show project tree", "what files are in this workspace",
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening"
  ];
  if (localTriggers.some(t => clean.includes(t) || t.includes(clean) && clean.length > 3)) {
    return true;
  }

  // Conversation keywords
  const chatKeywords = [
    "explain", "what is", "how do I", "why", "how does", "what does", 
    "tell me about", "describe", "meaning of", "analyze", "question", 
    "suggest", "recommend", "how to"
  ];

  // Modification keywords
  const editKeywords = [
    "create", "write", "make", "add", "change", "edit", "implement", 
    "delete", "remove", "fix", "refactor", "update", "modify", "rewrite", 
    "patch", "apply"
  ];

  const hasChat = chatKeywords.some(kw => clean.includes(kw));
  const hasEdit = editKeywords.some(kw => clean.includes(kw));

  // If it contains chat keywords and NO edit keywords, it is conversational
  if (hasChat && !hasEdit) {
    return true;
  }

  // General questions (starts with question words: what, why, how, who, when)
  if (/^(what|why|how|who|when|explain)\b/.test(clean)) {
    if (!hasEdit) return true;
  }

  // If it's short and doesn't contain any file operations or edits, default to conversational chat
  if (clean.split(/\s+/).length < 5 && !hasEdit) {
    return true;
  }

  return false;
}

async function handleSendToAgent() {
  const prompt = (els.agentPromptInput?.value || els.agentInput?.value || "").trim();
  if (!prompt) {
    console.warn("⚠️  Empty prompt");
    return;
  }

  // Clear input
  if (els.agentPromptInput) els.agentPromptInput.value = "";
  if (els.agentInput) els.agentInput.value = "";

  // Disable send button
  if (els.sendAgentPromptBtn) els.sendAgentPromptBtn.disabled = true;
  if (els.sendAgentBtn) els.sendAgentBtn.disabled = true;

  // Add the CLEAN prompt to the chat history
  addChatMessage("user", prompt);

  // Update status to "Processing"
  updateAgentStatus('active', '⏳ Processing...');

  if (state.currentConversationId) {
    try {
      await window.novaAPI.chat.addMessage(
        state.currentConversationId, 
        "user", 
        prompt, 
        "User"
      );
      state.conversations = await window.novaAPI.chat.getConversations();
      renderConversationList();
    } catch (dbError) {
      console.error("Failed to save user message:", dbError);
    }
  }

  // Compile enhancedPrompt with active contexts
  let enhancedPrompt = prompt;
  if (state.chatContexts && state.chatContexts.length > 0) {
    let contextString = "\n\n--- CONTEXT DETAILS ---\n";
    for (const ctx of state.chatContexts) {
      if (ctx.type === "file") {
        const tab = state.tabs.find(t => t.path === ctx.path);
        const content = tab ? tab.content : "";
        contextString += `\n[File: ${ctx.label}]\nPath: ${ctx.path}\nContent:\n\`\`\`\n${content}\n\`\`\`\n`;
      } else if (ctx.type === "selection") {
        contextString += `\n[Selected Code: ${ctx.label}]\nContent:\n\`\`\`\n${ctx.value}\n\`\`\`\n`;
      } else if (ctx.type === "all-tabs") {
        contextString += `\n[All Open Tabs]\n`;
        for (const file of ctx.value) {
          contextString += `\nFile: ${file.name}\nPath: ${file.path}\nContent:\n\`\`\`\n${file.content}\n\`\`\`\n`;
        }
      }
    }
    enhancedPrompt += contextString;
  }

  // Clear contexts and update chips in UI
  state.chatContexts = [];
  renderContextChips();

  setAgentBusy(true);

  try {
    // ========== DETERMINE MODE ==========
    const selectedAgent = state.selectedAgent || 'supernova-v1';
    let mode = selectedAgent === 'supernova-v1' ? 'multi-agent' : 'single-agent';

    if (selectedAgent === 'supernova-v1' && isQueryConversational(prompt)) {
      mode = 'single-agent';
      console.log("ℹ️ Routing conversational prompt to chat mode");
    }

    console.log(`🚀 Sending prompt with mode: ${mode}`);

    if (mode === 'multi-agent') {
      // ========== SUPERNOVA MULTI-AGENT MODE ==========
      await handleSupernovaExecution(enhancedPrompt);
    } else {
      // ========== SINGLE AGENT MODE (GPT OSS 20B / SuperNova v1) ==========
      const agentLabel = selectedAgent === 'supernova-v1' ? 'SuperNova v1' : 'GPT OSS 20B';
      await handleSingleAgentExecution(enhancedPrompt, agentLabel);
    }

  } catch (error) {
    console.error("❌ Execution failed:", error);
    addChatMessage("system", `❌ Error: ${error.message}`);
    updateAgentStatus('error', '❌ Error');
  } finally {
    setAgentBusy(false);
    if (els.sendAgentPromptBtn) els.sendAgentPromptBtn.disabled = false;
    if (els.sendAgentBtn) els.sendAgentBtn.disabled = false;
    updateAgentStatus('ready', 'Ready');
  }
}

/**
 * Execute using SuperNova multi-agent orchestration
 * Planner → Coder → Reviewer
 */
async function handleSupernovaExecution(prompt) {
  console.log("📝 SuperNova multi-agent mode");

  const activeTab = getActiveTab();
  const activeFilePath = activeTab ? activeTab.path : null;

  createValkyrieCard(prompt);
  valkyrieSession.activeFilePath = activeFilePath;
  valkyrieSession.originalContent = activeTab ? activeTab.content : "";

  try {
    // Apply diffs in real-time
    const results = await window.novaAPI.supernova.execute(
      state.currentConversationId,
      prompt,
      activeFilePath
    );

    if (results && results.length > 0) {
      // Show diffs
      showDiffsInEditor(results);

      // Show summary
      const summary = `✅ SuperNova completed:\n` + 
        results.map(r => `• ${r.task?.description || 'Task'} → \`${r.filePath}\``).join("\n");
      
      addChatMessage("assistant", summary);

      updateActiveValkyrieCard('completed', 'All checks approved the changes!');

      if (state.currentConversationId) {
        try {
          await window.novaAPI.chat.addMessage(
            state.currentConversationId, 
            "assistant", 
            summary, 
            "SuperNova"
          );
        } catch (dbErr) {
          console.warn('Failed to persist SuperNova summary to DB (continuing):', dbErr);
        }
      }
    }
  } catch (error) {
    updateActiveValkyrieCard('error', error.message);
    throw error;
  }
}

async function handleSingleAgentExecution(prompt, agentName) {
  console.log(`🤖 Single agent mode: ${agentName}`);

  updateAgentStatus('active', `💬 ${agentName} is responding...`);

  try {
    // Get active file context
    const activeTab = getActiveTab();
    const activeFilePath = activeTab ? activeTab.path : null;
    const activeFileContent = activeTab ? activeTab.content : "";

    // Call single agent API (Pollinations free by default)
    const response = await window.novaAPI.agent.chat({
      prompt,
      filePath: activeFilePath,
      fileContent: activeFileContent,
      mode: "chat"
    });

    // Show raw response (which contains code fences) in chat, or fallback to text if raw is empty
    const chatDisplay = response.raw || response.text;
    if (chatDisplay) addChatMessage("assistant", chatDisplay);

    // If a code block was returned, store it for Apply (without auto-opening diff view)
    if (response.code) {
      state.pendingApplyContent = response.code;
      updateApplyButtonState();
      addChatMessage("system", "💡 Code ready — click Apply in the chat bubble or use the Apply button at the bottom.");
    }

    if (state.currentConversationId && chatDisplay) {
      await window.novaAPI.chat.addMessage(
        state.currentConversationId,
        "assistant",
        chatDisplay,
        agentName
      );
    }
  } catch (error) {
    // If the backend call failed, fallback to simulated response
    console.warn('Single agent execution failed, using simulation fallback:', error);
    const simulated = { text: "Chat fallback: unable to connect to Pollinations API. Please check your network connection.", code: null };
    addChatMessage('assistant', simulated.text);
  }
}

// --- Simulation helpers (UI-only fallback) -----------------
async function simulateValkyrieFallback(prompt, filePath) {
  // Simulate staggered agent work and return a faux results array
  await new Promise(r => setTimeout(r, 700)); // small delay for planning
  addChatMessage('system', '📝 (sim) Planning...');
  updateAgentStatus('active', '📝 Planning...');

  await new Promise(r => setTimeout(r, 1200));
  addChatMessage('system', '💻 (sim) Coding...');
  updateAgentStatus('active', '💻 Coding...');

  await new Promise(r => setTimeout(r, 900));
  addChatMessage('system', '🧐 (sim) Reviewing...');
  updateAgentStatus('active', '🧐 Reviewing...');

  // Create a simple mock diff result
  const file = filePath || 'example.js';
  const original = (state.tabs.find(t => t.path === file)?.content) || '// original file content\nfunction hello() {\n  console.log("hi");\n}\n';
  const proposed = original.replace('console.log("hi");', 'console.log("hello world");');

  return [{
    filePath: file,
    originalContent: original,
    proposedContent: proposed,
    task: { description: 'Simulated code fix' }
  }];
}

async function simulateSingleAgentFallback(prompt, agent) {
  await new Promise(r => setTimeout(r, 800));
  const activeTab = getActiveTab();
  const file = activeTab ? activeTab.path : 'example.js';
  const original = activeTab ? activeTab.content : '// original file content\nfunction hello() {\n  console.log("hi");\n}\n';
  
  // Create simulated proposed content
  let proposed = original;
  if (original.includes('console.log("hi");')) {
    proposed = original.replace('console.log("hi");', 'console.log("hello from Nova simulation");');
  } else {
    proposed = original + '\n\n// Added by Nova AI Agent Simulation\nfunction novaHelper() {\n  return "Nova IDE active";\n}';
  }
  
  const ext = file.split('.').pop() || 'javascript';
  const text = `(${agent} sim) I have analyzed the code and solved your request: "${prompt}".\n\nHere are the simulated modifications for \`${file}\`:\n\n\`\`\`${ext}\n${proposed}\n\`\`\``;

  return { text, code: proposed };
}
// --- end simulation helpers ------------------------------

/**
 * Display diffs in editor in real-time
 */
function showDiffsInEditor(results) {
  console.log("📊 Showing diffs in editor");

  if (!results || results.length === 0) return;

  // Only show diffs in editor if at least one file has actual changes!
  const hasActualChanges = results.some(r => {
    return r.filePath && r.filePath !== 'general-chat' && r.originalContent !== r.proposedContent;
  });

  if (!hasActualChanges) {
    console.log("ℹ️ No actual file modifications in results. Skipping diff editor.");
    return;
  }

  if (!window.diffManager && typeof window.initDiffManager === 'function') {
    window.initDiffManager();
  }

  // Use the DiffManager if available
  if (window.diffManager) {
    const filesWithDiffs = {};
    results.forEach(result => {
      if (result.filePath) {
        filesWithDiffs[result.filePath] = {
          original: result.originalContent || "",
          proposed: result.proposedContent || result.content || "",
          language: LANGUAGE_BY_EXT[result.filePath.split('.').pop()] || 'plaintext'
        };
      }
    });

    window.diffManager.show(filesWithDiffs);

    // Add button to show review panel
    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'accent-btn';
    reviewBtn.textContent = '👁️ Review Changes';
    reviewBtn.onclick = () => {
      addChatMessage("system", "Review the proposed changes in the editor. Accept or Reject above.");
    };
  }
}

/**
 * Update agent status indicator
 */
function updateAgentStatus(status, text) {
  // Update sticky top-bar status
  if (els.agentStatusDot) {
    els.agentStatusDot.className = `status-dot ${status}`;
  }
  if (els.agentStatusText) {
    els.agentStatusText.textContent = text;
  }
  // Also update sidebar status (different IDs to avoid duplicate-ID bug)
  const sidebarDot = document.getElementById("sidebarAgentStatusDot");
  const sidebarTxt = document.getElementById("sidebarAgentStatusText");
  if (sidebarDot) sidebarDot.className = `status-dot ${status}`;
  if (sidebarTxt) sidebarTxt.textContent = text;
}


async function callPollinations(messages) {
  // Anonymous pollinations text API only supports 'openai-fast' (aliased as 'openai')
  const model = "openai"; 
  const response = await fetch("https://text.pollinations.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages,
      model,
      seed: 42,
      private: true
    })
  });

  if (!response.ok) {
    throw new Error(`Pollinations error (${response.status})`);
  }

  const resText = await response.text();
  try {
    const data = JSON.parse(resText);
    return (data?.choices?.[0]?.message?.content || resText).trim();
  } catch (e) {
    return resText.trim();
  }
}

async function callOpenRouter(messages) {
  const key = els.openRouterKeyInput.value.trim();
  if (!key) {
    throw new Error("OpenRouter API key is required when provider is OpenRouter.");
  }

  const model = MODEL_CONFIG[state.modelKey].openrouterModel;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${message.slice(0, 180)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map((part) => part?.text || "").join("\n").trim();
  }

  return JSON.stringify(content, null, 2);
}

function extractCodeFromResponse(text) {
  const fencedMatch = text.match(/```(?:[\w.+-]+)?\r?\n([\s\S]*?)\r?\n```/);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trimEnd();
  }
  return text.trim();
}

function updateApplyButtonState() {
  const hasActiveFile = Boolean(getActiveTab());
  const hasSuggestedContent = Boolean(state.pendingApplyContent);
  els.applyToFileBtn.disabled = !(hasActiveFile && hasSuggestedContent);
}

function applySuggestedContentToFile() {
  const activeTab = getActiveTab();
  if (!activeTab || !state.pendingApplyContent) {
    return;
  }

  activeTab.content = state.pendingApplyContent;
  activeTab.dirty = true;
  setEditorContent(activeTab.content, activeTab.path);
  scheduleSave(activeTab.path, activeTab.content);
  renderTabs();
  addChatMessage("system", `Applied AI output to ${activeTab.path}`);
}

function findNodeByPath(targetPath) {
  if (!state.tree) {
    return null;
  }
  const normalizedTarget = normalizePath(targetPath);
  if (!normalizedTarget) {
    return state.tree;
  }
  return findNodeByPathRecursive(state.tree, normalizedTarget);
}

function findNodeByPathRecursive(node, targetPath) {
  if (normalizePath(node.path) === targetPath) {
    return node;
  }
  if (node.type !== "folder" || !Array.isArray(node.children)) {
    return null;
  }
  for (const child of node.children) {
    const found = findNodeByPathRecursive(child, targetPath);
    if (found) {
      return found;
    }
  }
  return null;
}

function findFirstFilePath(node) {
  if (!node) {
    return null;
  }
  if (node.type === "file") {
    return node.path;
  }
  if (!Array.isArray(node.children)) {
    return null;
  }
  const sortedChildren = [...node.children].sort(compareNodes);
  for (const child of sortedChildren) {
    const first = findFirstFilePath(child);
    if (first) {
      return first;
    }
  }
  return null;
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem("novaSettings") || "{}");
  
  // UI Theme
  if (settings.uiTheme) {
    if (els.uiThemeSelect) els.uiThemeSelect.value = settings.uiTheme;
    applyUITheme(settings.uiTheme);
  } else {
    applyUITheme("catppuccin-mocha");
  }
  
  // Accent Color
  if (settings.accentColor) {
    if (els.accentColorInput) els.accentColorInput.value = settings.accentColor;
    applyAccentColor(settings.accentColor);
  }
  
  // Editor Theme
  if (settings.theme) {
    els.themeSelect.value = settings.theme;
    applyTheme(settings.theme);
  }
  
  // Font Family
  if (settings.fontFamily) {
    if (els.fontFamilySelect) els.fontFamilySelect.value = settings.fontFamily;
    applyFontFamily(settings.fontFamily);
  }
  
  // Font Size
  if (settings.fontSize) {
    els.fontSizeSelect.value = settings.fontSize;
    applyFontSize(settings.fontSize);
  }
  
  // Tab Size
  if (settings.tabSize) {
    if (els.tabSizeSelect) els.tabSizeSelect.value = settings.tabSize;
    applyTabSize(settings.tabSize);
  }
  
  // Word Wrap
  if (settings.wordWrap) {
    if (els.wordWrapSelect) els.wordWrapSelect.value = settings.wordWrap;
    applyWordWrap(settings.wordWrap);
  }
  
  // Minimap
  if (settings.minimap) {
    if (els.minimapSelect) els.minimapSelect.value = settings.minimap;
    applyMinimap(settings.minimap === "true");
  }
  
  // Line Numbers
  if (settings.lineNumbers) {
    if (els.lineNumbersSelect) els.lineNumbersSelect.value = settings.lineNumbers;
    applyLineNumbers(settings.lineNumbers);
  }
  
  // Panel/Sidebar Width
  if (settings.panelWidth) {
    els.panelWidthSelect.value = settings.panelWidth;
    applyPanelWidth(settings.panelWidth);
  }
  
  // Default Provider
  if (settings.defaultProvider) {
    if (els.defaultProviderSelect) els.defaultProviderSelect.value = settings.defaultProvider;
    if (els.providerSelect) {
      els.providerSelect.value = settings.defaultProvider;
      // Trigger UI updates
      const event = new Event("change");
      els.providerSelect.dispatchEvent(event);
    }
  }
  
  // Default Model
  if (settings.defaultModel) {
    let defaultModel = settings.defaultModel;
    if (defaultModel === "valkyrie") defaultModel = "supernova-v1";
    if (els.defaultModelSelect) els.defaultModelSelect.value = defaultModel;
    if (els.modelModeSelect) {
      els.modelModeSelect.value = defaultModel;
      const event = new Event("change");
      els.modelModeSelect.dispatchEvent(event);
    }
  }
  
  // Temperature
  if (settings.aiTemperature) {
    if (els.aiTemperatureInput) {
      els.aiTemperatureInput.value = settings.aiTemperature;
      if (els.aiTemperatureVal) els.aiTemperatureVal.textContent = settings.aiTemperature;
    }
  }
  
  // Terminal Font Size
  if (settings.terminalFontSize) {
    if (els.terminalFontSizeSelect) els.terminalFontSizeSelect.value = settings.terminalFontSize;
    applyTerminalFontSize(settings.terminalFontSize);
  }
  
  // Terminal Theme
  if (settings.terminalTheme) {
    if (els.terminalThemeSelect) els.terminalThemeSelect.value = settings.terminalTheme;
    applyTerminalTheme(settings.terminalTheme);
  }
}

function saveSettings() {
  const settings = {
    uiTheme: els.uiThemeSelect ? els.uiThemeSelect.value : "catppuccin-mocha",
    accentColor: els.accentColorInput ? els.accentColorInput.value : "#a6e3a1",
    theme: els.themeSelect.value,
    fontFamily: els.fontFamilySelect ? els.fontFamilySelect.value : "Inter",
    fontSize: els.fontSizeSelect.value,
    tabSize: els.tabSizeSelect ? els.tabSizeSelect.value : "4",
    wordWrap: els.wordWrapSelect ? els.wordWrapSelect.value : "on",
    minimap: els.minimapSelect ? els.minimapSelect.value : "true",
    lineNumbers: els.lineNumbersSelect ? els.lineNumbersSelect.value : "on",
    panelWidth: els.panelWidthSelect.value,
    defaultProvider: els.defaultProviderSelect ? els.defaultProviderSelect.value : "pollinations",
    defaultModel: els.defaultModelSelect ? els.defaultModelSelect.value : "supernova-v1",
    aiTemperature: els.aiTemperatureInput ? els.aiTemperatureInput.value : "0.7",
    terminalFontSize: els.terminalFontSizeSelect ? els.terminalFontSizeSelect.value : "13",
    terminalTheme: els.terminalThemeSelect ? els.terminalThemeSelect.value : "match-ui"
  };
  
  localStorage.setItem("novaSettings", JSON.stringify(settings));
  
  applyUITheme(settings.uiTheme);
  applyAccentColor(settings.accentColor);
  applyTheme(settings.theme);
  applyFontFamily(settings.fontFamily);
  applyFontSize(settings.fontSize);
  applyTabSize(settings.tabSize);
  applyWordWrap(settings.wordWrap);
  applyMinimap(settings.minimap === "true");
  applyLineNumbers(settings.lineNumbers);
  applyPanelWidth(settings.panelWidth);
  applyTerminalFontSize(settings.terminalFontSize);
  applyTerminalTheme(settings.terminalTheme);
  
  // Update AI provider & model selection if changed
  if (els.providerSelect && els.providerSelect.value !== settings.defaultProvider) {
    els.providerSelect.value = settings.defaultProvider;
    const event = new Event("change");
    els.providerSelect.dispatchEvent(event);
  }
  
  if (els.modelModeSelect && els.modelModeSelect.value !== settings.defaultModel) {
    els.modelModeSelect.value = settings.defaultModel;
    const event = new Event("change");
    els.modelModeSelect.dispatchEvent(event);
  }
  
  els.settingsModal.classList.add("hidden");
  addChatMessage("system", "Settings saved successfully.");
  
  // Clear unsaved indicator
  if (typeof SettingsLivePreview !== 'undefined') {
    SettingsLivePreview.clearSettingsDirty();
  }
}

function applyUITheme(uiTheme) {
  document.documentElement.setAttribute("data-theme", uiTheme);
}

function applyAccentColor(color) {
  document.documentElement.style.setProperty("--accent", color);
  
  // Also calculate and set accent-dim (opacity 0.15)
  let r = 166, g = 227, b = 161;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  }
  document.documentElement.style.setProperty("--accent-dim", `rgba(${r}, ${g}, ${b}, 0.15)`);
  document.documentElement.style.setProperty("--accent-hover", `rgba(${r}, ${g}, ${b}, 0.85)`);
}

function applyTheme(theme) {
  if (state.editor) {
    monaco.editor.setTheme(theme);
  }
}

function applyFontFamily(fontFamily) {
  if (state.editor) {
    state.editor.updateOptions({ fontFamily: fontFamily });
  }
}

function applyFontSize(fontSize) {
  if (state.editor) {
    state.editor.updateOptions({ fontSize: parseInt(fontSize) });
  }
}

function applyTabSize(tabSize) {
  if (state.editor) {
    state.editor.updateOptions({ tabSize: parseInt(tabSize) });
  }
}

function applyWordWrap(wordWrap) {
  if (state.editor) {
    state.editor.updateOptions({ wordWrap: wordWrap });
  }
}

function applyMinimap(enabled) {
  if (state.editor) {
    state.editor.updateOptions({ minimap: { enabled: enabled } });
  }
}

function applyLineNumbers(lineNumbers) {
  if (state.editor) {
    state.editor.updateOptions({ lineNumbers: lineNumbers });
  }
}

function applyPanelWidth(width) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const widthPx = width + 'px';
    sidebar.style.width = widthPx;
    sidebar.style.minWidth = widthPx;
    document.documentElement.style.setProperty('--sidebar-width', widthPx);
    if (state.editor) state.editor.layout();
  }
}

function applyTerminalFontSize(fontSize) {
  if (activeTerminal && activeTerminal.term) {
    activeTerminal.term.options.fontSize = parseInt(fontSize);
    setTimeout(() => {
      if (activeTerminal.fit) activeTerminal.fit.fit();
    }, 50);
  }
}

function applyTerminalTheme(terminalTheme) {
  if (activeTerminal && activeTerminal.term) {
    let background = "#0d0f14";
    if (terminalTheme === "pitch-black") {
      background = "#000000";
    } else if (terminalTheme === "match-ui") {
      const computedStyle = getComputedStyle(document.documentElement);
      background = computedStyle.getPropertyValue("--bg-crust").trim() || "#0d0f14";
    }
    
    activeTerminal.term.options.theme = {
      background: background,
      foreground: "#cdd6f4",
      cursor: "#cba6f7",
      cursorAccent: "#1e1e2e",
      selection: "rgba(255, 255, 255, 0.15)",
      black: "#45475a",
      red: "#f38ba8",
      green: "#a6e3a1",
      yellow: "#f9e2af",
      blue: "#89b4fa",
      magenta: "#f5c2e7",
      cyan: "#94e2d5",
      white: "#a6adc8"
    };
  }
}

// --- Valkyrie Agent Harness UI Management ---
let activeValkyrieCard = null;
let valkyrieThoughtBuffer = "";
let valkyrieDiffBuffer = "";

function renderValkyrieDiff(buffer) {
  const lines = buffer.split(/\r?\n/);
  let html = "";
  let inSearch = false;
  let inReplace = false;

  const escapeHtml = (str) => {
    if (!str) return "&nbsp;";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for SEARCH/REPLACE boundaries
    if (trimmed.startsWith("<<<<<<< SEARCH")) {
      inSearch = true;
      inReplace = false;
      html += `<div class="diff-marker-search">🔍 SEARCH (Existing Code)</div>`;
      continue;
    } else if (trimmed.startsWith("=======")) {
      inSearch = false;
      inReplace = true;
      html += `<div class="diff-marker-divider">⚡ REPLACE (New Code)</div>`;
      continue;
    } else if (trimmed.startsWith(">>>>>>> REPLACE")) {
      inSearch = false;
      inReplace = false;
      html += `<div class="diff-marker-replace">✅ END REPLACE</div>`;
      continue;
    }

    // Check if we are inside a SEARCH block (code being replaced)
    if (inSearch) {
      html += `<span class="diff-line-search">${escapeHtml(line)}</span>`;
      continue;
    }

    // Check if we are inside a REPLACE block (new code replacing the old)
    if (inReplace) {
      html += `<span class="diff-line-replace">${escapeHtml(line)}</span>`;
      continue;
    }

    // Fallback: If not inside SEARCH/REPLACE blocks, it could be a standard Unified Diff or normal text
    if (trimmed.startsWith("--- ") || trimmed.startsWith("+++ ")) {
      html += `<span class="diff-header-line">${escapeHtml(line)}</span>`;
    } else if (trimmed.startsWith("@@")) {
      html += `<span class="diff-header-line">${escapeHtml(line)}</span>`;
    } else if (line.startsWith("-") && !trimmed.startsWith("---")) {
      html += `<span class="diff-line-search">${escapeHtml(line)}</span>`;
    } else if (line.startsWith("+") && !trimmed.startsWith("+++")) {
      html += `<span class="diff-line-replace">${escapeHtml(line)}</span>`;
    } else {
      // Normal code line
      html += `<span class="diff-line-normal">${escapeHtml(line)}</span>`;
    }
  }

  return html;
}

function createValkyrieCard(userPrompt) {
  valkyrieThoughtBuffer = "";
  valkyrieDiffBuffer = "";
  
  const card = document.createElement("div");
  card.className = "message valkyrie-message";
  card.innerHTML = `
    <div class="valkyrie-header">
      <span class="valkyrie-icon">⚡</span>
      <span>Valkyrie Engine</span>
      <button class="abort-btn">Abort</button>
    </div>
    <div class="valkyrie-thought-section">
      <div class="thought-header-row" style="display: flex; justify-content: space-between; align-items: center; user-select: none;">
        <div class="thought-title" style="flex: 1; padding: 8px 12px; font-size: var(--font-size-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-base); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background var(--transition-fast);">▼ Thought Logs (DeepSeek R1)</div>
        <div class="thought-controls" style="display: flex; gap: 8px; font-size: 0.72rem; align-items: center; background: var(--bg-base); padding: 8px 12px 8px 0;">
          <button class="thought-expand-btn" style="display: block; background: none; border: none; color: var(--accent); cursor: pointer; padding: 2px 6px; font-family: var(--font-ui); font-size: 0.72rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">↕ Expand</button>
        </div>
      </div>
      <div class="thought-content"></div>
    </div>
    <div class="valkyrie-plan-section hidden">
      <div class="plan-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; user-select: none;">
        <span class="section-title" style="margin: 0; cursor: pointer;">📋 Execution Plan</span>
        <div class="plan-controls" style="display: flex; gap: 8px; font-size: 0.72rem; align-items: center;">
          <button class="plan-expand-btn" style="background: none; border: none; color: var(--accent); cursor: pointer; padding: 2px 6px; font-family: var(--font-ui); font-size: 0.72rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">↕ Expand</button>
          <span class="plan-collapse-arrow" style="cursor: pointer; color: var(--text-muted); font-size: 0.75rem;">▼</span>
        </div>
      </div>
      <div class="plan-list-wrapper">
        <ul class="plan-list"></ul>
      </div>
    </div>
    <div class="valkyrie-diff-section hidden">
      <div class="diff-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; user-select: none;">
        <span class="section-title" style="margin: 0; cursor: pointer;">🔍 Surgical Diffs</span>
        <div class="diff-controls" style="display: flex; gap: 8px; font-size: 0.72rem; align-items: center;">
          <button class="diff-expand-btn" style="background: none; border: none; color: var(--accent); cursor: pointer; padding: 2px 6px; font-family: var(--font-ui); font-size: 0.72rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">↕ Expand</button>
          <span class="diff-collapse-arrow" style="cursor: pointer; color: var(--text-muted); font-size: 0.75rem;">▼</span>
        </div>
      </div>
      <div class="diff-content-wrapper">
        <div class="diff-content"></div>
      </div>
    </div>
    <div class="valkyrie-status-bar">
      <span class="status-dot pulsing"></span>
      <span class="status-text">Orchestrator preparing...</span>
    </div>
  `;
  
  // Thought toggle
  const thoughtTitle = card.querySelector(".thought-title");
  const thoughtSection = card.querySelector(".valkyrie-thought-section");
  const thoughtExpandBtn = card.querySelector(".thought-expand-btn");
  
  const toggleThoughtCollapse = () => {
    const isClosed = thoughtSection.classList.toggle("closed");
    thoughtTitle.textContent = isClosed ? "▶ Thought Logs (DeepSeek R1)" : "▼ Thought Logs (DeepSeek R1)";
    if (thoughtExpandBtn) {
      thoughtExpandBtn.style.display = isClosed ? "none" : "block";
    }
    scrollChatToBottom(true);
  };
  
  thoughtTitle.addEventListener("click", toggleThoughtCollapse);
  
  if (thoughtExpandBtn) {
    thoughtExpandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = thoughtSection.classList.toggle("expanded");
      thoughtExpandBtn.textContent = isExpanded ? "↕ Shrink" : "↕ Expand";
      scrollChatToBottom(true);
    });
  }

  // Plan section controls
  const planSection = card.querySelector(".valkyrie-plan-section");
  const planTitle = card.querySelector(".plan-header-row .section-title");
  const planCollapseArrow = card.querySelector(".plan-collapse-arrow");
  const planExpandBtn = card.querySelector(".plan-expand-btn");
  
  const togglePlanCollapse = () => {
    const isCollapsed = planSection.classList.toggle("collapsed");
    planCollapseArrow.textContent = isCollapsed ? "▶" : "▼";
    if (isCollapsed) {
      planExpandBtn.style.display = "none";
    } else {
      planExpandBtn.style.display = "block";
    }
    scrollChatToBottom(true);
  };
  
  planTitle.addEventListener("click", togglePlanCollapse);
  planCollapseArrow.addEventListener("click", togglePlanCollapse);
  
  planExpandBtn.addEventListener("click", () => {
    const isExpanded = planSection.classList.toggle("expanded");
    planExpandBtn.textContent = isExpanded ? "↕ Shrink" : "↕ Expand";
    scrollChatToBottom(true);
  });

  // Diff section controls
  const diffSection = card.querySelector(".valkyrie-diff-section");
  const diffTitle = card.querySelector(".diff-header-row .section-title");
  const diffCollapseArrow = card.querySelector(".diff-collapse-arrow");
  const diffExpandBtn = card.querySelector(".diff-expand-btn");
  
  const toggleDiffCollapse = () => {
    const isCollapsed = diffSection.classList.toggle("collapsed");
    diffCollapseArrow.textContent = isCollapsed ? "▶" : "▼";
    if (isCollapsed) {
      diffExpandBtn.style.display = "none";
    } else {
      diffExpandBtn.style.display = "block";
    }
    scrollChatToBottom(true);
  };
  
  diffTitle.addEventListener("click", toggleDiffCollapse);
  diffCollapseArrow.addEventListener("click", toggleDiffCollapse);
  
  diffExpandBtn.addEventListener("click", () => {
    const isExpanded = diffSection.classList.toggle("expanded");
    diffExpandBtn.textContent = isExpanded ? "↕ Shrink" : "↕ Expand";
    scrollChatToBottom(true);
  });
  
  // Abort button
  const abortBtn = card.querySelector(".abort-btn");
  abortBtn.addEventListener("click", async () => {
    abortBtn.disabled = true;
    abortBtn.textContent = "Aborting...";
    await window.novaAPI.valkyrie.abort();
  });
  
  // Dynamic Transition-End Layout Adjustments to ensure smooth parent scrolling
  const thoughtContentEl = thoughtSection.querySelector(".thought-content");
  const planListWrapperEl = planSection.querySelector(".plan-list-wrapper");
  const diffContentEl = diffSection.querySelector(".diff-content");
  
  if (thoughtContentEl) {
    thoughtContentEl.addEventListener("transitionend", () => scrollChatToBottom(true));
  }
  if (planListWrapperEl) {
    planListWrapperEl.addEventListener("transitionend", () => scrollChatToBottom(true));
  }
  if (diffContentEl) {
    diffContentEl.addEventListener("transitionend", () => scrollChatToBottom(true));
  }
  
  els.chatMessages.appendChild(card);
  scrollChatToBottom(true);
  
  activeValkyrieCard = card;
}

function updateActiveValkyrieCard(type, data) {
  if (!activeValkyrieCard) return;
  
  if (type === 'thought') {
    const thoughtSection = activeValkyrieCard.querySelector(".valkyrie-thought-section");
    const thoughtContent = activeValkyrieCard.querySelector(".thought-content");
    
    // Automatically open thought section if it's the first chunk
    const isFirstThoughtChunk = valkyrieThoughtBuffer === "";
    if (thoughtSection.classList.contains("closed") && isFirstThoughtChunk) {
      thoughtSection.classList.remove("closed");
      activeValkyrieCard.querySelector(".thought-title").textContent = "▼ Thought Logs (DeepSeek R1)";
      const thoughtExpandBtn = activeValkyrieCard.querySelector(".thought-expand-btn");
      if (thoughtExpandBtn) {
        thoughtExpandBtn.style.display = "block";
      }
      // Force scroll parent chat so the newly opened thought section is visible
      scrollChatToBottom(true);
    }
    
    valkyrieThoughtBuffer += data;
    thoughtContent.textContent = valkyrieThoughtBuffer;
    // Smart nested scroll inside the thought log container
    scrollElementToBottom(thoughtContent, isFirstThoughtChunk);
    
    // Smoothly scroll the parent chat messages container down to track the growing card
    scrollChatToBottom(false);
  }
  
  else if (type === 'plan') {
    const planSection = activeValkyrieCard.querySelector(".valkyrie-plan-section");
    const planList = activeValkyrieCard.querySelector(".plan-list");
    const isFirstTimePlanShown = planSection.classList.contains("hidden");
    if (isFirstTimePlanShown) {
      planSection.classList.remove("hidden");
      // Force scroll parent chat so the execution plan is brought into full view
      scrollChatToBottom(true);
    }
    planList.innerHTML = "";
    
    for (const task of data) {
      const li = document.createElement("li");
      li.className = `plan-item ${task.status || 'pending'}`;
      li.id = `plan-item-${task.id}`;
      
      let icon = "⬜";
      if (task.status === 'completed') icon = "✅";
      else if (task.status === 'in-progress') icon = "⚡";
      else if (task.status === 'failed') icon = "❌";
      
      li.innerHTML = `<span class="status-icon">${icon}</span> <span>${task.description} <code style="font-size:0.7rem; opacity:0.7">(${task.assignedFile})</code></span>`;
      planList.appendChild(li);
    }
    // Automatically keep the user scrolling down as plan is formed
    scrollChatToBottom(false);
  }
  
  else if (type === 'task') {
    const item = activeValkyrieCard.querySelector(`#plan-item-${data.taskId}`);
    if (item) {
      item.className = `plan-item ${data.status}`;
      const iconSpan = item.querySelector(".status-icon");
      if (iconSpan) {
        let icon = "⬜";
        if (data.status === 'completed') icon = "✅";
        else if (data.status === 'in-progress') icon = "⚡";
        else if (data.status === 'failed') icon = "❌";
        iconSpan.textContent = icon;
      }
    }
    // Scroll chat to keep up with active task updates
    scrollChatToBottom(false);
  }
  
  else if (type === 'diff') {
    const diffSection = activeValkyrieCard.querySelector(".valkyrie-diff-section");
    const diffContent = activeValkyrieCard.querySelector(".diff-content");
    const isFirstTimeDiffShown = diffSection.classList.contains("hidden");
    if (isFirstTimeDiffShown) {
      diffSection.classList.remove("hidden");
      // Force scroll parent chat so the diff section is brought into full view
      scrollChatToBottom(true);
    }
    
    const isFirstDiffChunk = valkyrieDiffBuffer === "";
    valkyrieDiffBuffer += data;
    diffContent.innerHTML = renderValkyrieDiff(valkyrieDiffBuffer);
    // Smart nested scroll inside the diff log container
    scrollElementToBottom(diffContent, isFirstDiffChunk);
    
    // Automatically keep the user scrolling down as diff streams in
    scrollChatToBottom(false);
  }
  
  else if (type === 'review') {
    // Show verification attempts / status updates
    const statusBarText = activeValkyrieCard.querySelector(".status-text");
    if (data.approved) {
      statusBarText.textContent = `Llama 3.3 approved changes (Score: ${data.score}/100)`;
    } else {
      statusBarText.textContent = `⚠️ Attempt ${data.attempt} failed verification: ${data.feedback.slice(0, 60)}...`;
      // Append a small warning below the item
      const item = activeValkyrieCard.querySelector(`#plan-item-${data.taskId}`);
      if (item) {
        const feedbackDiv = document.createElement("div");
        feedbackDiv.style.cssText = "font-size: 0.72rem; color: #ff6170; margin-left: 20px; font-style: italic;";
        feedbackDiv.textContent = `Attempt ${data.attempt} failed: ${data.feedback}`;
        item.appendChild(feedbackDiv);
      }
    }
    // Scroll chat to keep up with reviews
    scrollChatToBottom(false);
  }
  
  else if (type === 'status') {
    const statusBarText = activeValkyrieCard.querySelector(".status-text");
    statusBarText.textContent = data;
    // Scroll chat to keep up with status updates
    scrollChatToBottom(false);
  }
  
  else if (type === 'error') {
    const statusBar = activeValkyrieCard.querySelector(".valkyrie-status-bar");
    statusBar.innerHTML = `<span class="status-dot" style="background:var(--danger)"></span> <span style="color:var(--danger)">Error: ${data}</span>`;
    activeValkyrieCard.querySelector(".abort-btn").classList.add("hidden");
  }
  
  else if (type === 'completed') {
    const statusBar = activeValkyrieCard.querySelector(".valkyrie-status-bar");
    statusBar.innerHTML = `<span class="status-dot" style="background:var(--good)"></span> <span style="color:var(--good)">Execution Completed Successfully!</span>`;
    activeValkyrieCard.querySelector(".abort-btn").classList.add("hidden");
    
    // Close the thought logs to save vertical space
    activeValkyrieCard.querySelector(".valkyrie-thought-section").classList.add("closed");
    activeValkyrieCard.querySelector(".thought-title").textContent = "▶ Thought Logs (DeepSeek R1)";
    const thoughtExpandBtn = activeValkyrieCard.querySelector(".thought-expand-btn");
    if (thoughtExpandBtn) {
      thoughtExpandBtn.style.display = "none";
    }
    
    // Aggregate results by file
    const fileMap = new Map();
    for (const res of data.results || []) {
      if (!fileMap.has(res.filePath)) {
        fileMap.set(res.filePath, {
          filePath: res.filePath,
          originalContent: res.originalContent,
          proposedContent: res.proposedContent
        });
      } else {
        fileMap.get(res.filePath).proposedContent = res.proposedContent;
      }
    }
    
    valkyrieSession.modifiedFiles = Array.from(fileMap.values());
    valkyrieSession.activeIndex = 0;
    
    if (valkyrieSession.modifiedFiles.length > 0) {
      renderDiffSidebar();
      showDiffEditorForIndex(0);
    }
  }
  
  scrollChatToBottom(false);
}

// --- Diff Editor State & Management ---
let valkyrieSession = {
  modifiedFiles: [],
  activeIndex: 0
};

function saveCurrentDiffChanges() {
  if (state.diffEditor) {
    const activeFile = valkyrieSession.modifiedFiles[valkyrieSession.activeIndex];
    const models = state.diffEditor.getModel();
    if (activeFile && models && models.modified) {
      activeFile.proposedContent = models.modified.getValue();
    }
  }
}

function renderDiffSidebar() {
  const listEl = document.getElementById("diffFileList");
  listEl.innerHTML = "";
  
  valkyrieSession.modifiedFiles.forEach((file, index) => {
    const li = document.createElement("li");
    li.textContent = file.filePath.split("/").pop(); // Basename
    li.title = file.filePath;
    li.style.cssText = `padding: 8px 12px; cursor: pointer; border-left: 3px solid transparent; opacity: 0.7;`;
    
    if (index === valkyrieSession.activeIndex) {
      li.style.borderLeftColor = "var(--accent)";
      li.style.opacity = "1";
      li.style.background = "rgba(255,255,255,0.05)";
    }
    
    li.addEventListener("click", () => showDiffEditorForIndex(index));
    listEl.appendChild(li);
  });
}

function showDiffEditorForIndex(index) {
  saveCurrentDiffChanges();
  
  valkyrieSession.activeIndex = index;
  renderDiffSidebar();
  
  const file = valkyrieSession.modifiedFiles[index];
  if (!file) return;
  
  if (!state.diffEditor) {
    state.diffEditor = monaco.editor.createDiffEditor(els.monacoDiffContainer, {
      originalEditable: false,
      readOnly: false,
      renderSideBySide: true,
      theme: els.themeSelect.value || "vs-dark",
      ignoreTrimWhitespace: false,
      automaticLayout: true
    });
  }

  const language = getLanguageForPath(file.filePath);
  const originalModel = monaco.editor.createModel(file.originalContent, language);
  const modifiedModel = monaco.editor.createModel(file.proposedContent, language);

  state.diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel
  });

  els.monacoEditorContainer.classList.add("hidden");
  document.getElementById("diffViewerWrapper").classList.remove("hidden");
  els.diffControlBar.classList.remove("hidden");
}

function hideDiffEditor() {
  saveCurrentDiffChanges();
  
  document.getElementById("diffViewerWrapper").classList.add("hidden");
  els.monacoEditorContainer.classList.remove("hidden");
  els.diffControlBar.classList.add("hidden");

  if (state.diffEditor) {
    const models = state.diffEditor.getModel();
    if (models) {
      if (models.original) models.original.dispose();
      if (models.modified) models.modified.dispose();
    }
  }
}
async function triggerInlineReview(text, selection) {
  addChatMessage("system", "Triggering inline code review via Llama 3.3...");
  const activeTab = getActiveTab();
  const filePath = activeTab ? activeTab.path : "unknown";
  
  try {
    const apiKeys = {
      openrouter: els.openRouterKeyInput.value.trim(),
      groq: els.groqKeyInput ? els.groqKeyInput.value.trim() : ""
    };
    
    const review = await window.novaAPI.valkyrie.reviewSelection(text, filePath, apiKeys);
    
    if (review.error) {
      addChatMessage("system", `Inline review failed: ${review.error}`);
      return;
    }
    
    let html = `<div style="background:var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin-top: 8px;">
      <h4 style="margin:0 0 8px 0; color:var(--accent);">🔍 Llama 3.3 Selection Review</h4>
      <p style="margin:0 0 8px 0; font-size:0.85rem;">Score: <strong>${review.score}/100</strong> - ${review.approved ? '✅ Approved' : '❌ Issues Found'}</p>
      <p style="margin:0 0 12px 0; font-size:0.85rem; font-style:italic; opacity:0.8;">${review.feedback}</p>
    `;
    
    if (review.issues && review.issues.length > 0) {
      html += `<ul style="margin:0; padding-left:20px; font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">`;
      review.issues.forEach(issue => {
        html += `<li style="color:${issue.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}">
          <strong>${issue.type.toUpperCase()}:</strong> ${issue.description}
          ${issue.suggestedFix ? `<br><code style="background:rgba(255,255,255,0.05); padding:2px 4px; border-radius:4px; display:inline-block; margin-top:4px;">${issue.suggestedFix}</code>` : ''}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div>`;
    
    // Add to chat history
    const card = document.createElement("div");
    card.className = "message system-message";
    card.innerHTML = html;
    els.chatMessages.appendChild(card);
    scrollChatToBottom(true);
    
  } catch (err) {
    addChatMessage("system", `Inline review failed: ${err.message}`);
  }
}

// --- Inline Edit and Diff Implementation ---
let activeInlineWidget = null;
let activeInlineDiff = null;

function showInlineEditWidget(editor) {
  if (activeInlineWidget) {
    editor.removeContentWidget(activeInlineWidget);
    activeInlineWidget = null;
  }

  const position = editor.getPosition();
  if (!position) return;

  const selection = editor.getSelection();

  const domNode = document.createElement('div');
  domNode.className = 'inline-edit-widget';
  domNode.style.position = 'absolute';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ask AI to edit this code...';
  domNode.appendChild(input);

  const applyBtn = document.createElement('button');
  applyBtn.className = 'inline-edit-apply';
  applyBtn.innerHTML = '✓';
  domNode.appendChild(applyBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'inline-edit-cancel';
  cancelBtn.innerHTML = '✗';
  domNode.appendChild(cancelBtn);

  const widget = {
    getId: () => 'inline-edit-widget',
    getDomNode: () => domNode,
    getPosition: () => {
      return {
        position: position,
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE
        ]
      };
    }
  };

  activeInlineWidget = widget;
  editor.addContentWidget(widget);
  input.focus();

  // Prevent editor from eating keys in the input
  domNode.addEventListener('keydown', (e) => {
    e.stopPropagation();
  }, true);

  const triggerEdit = async () => {
    const val = input.value.trim();
    if (!val) return;

    editor.removeContentWidget(widget);
    activeInlineWidget = null;

    await executeInlineEdit(editor, selection, val);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerEdit();
    } else if (e.key === 'Escape') {
      editor.removeContentWidget(widget);
      activeInlineWidget = null;
      editor.focus();
    }
  });

  applyBtn.addEventListener('click', triggerEdit);
  cancelBtn.addEventListener('click', () => {
    editor.removeContentWidget(widget);
    activeInlineWidget = null;
    editor.focus();
  });
}

async function executeInlineEdit(editor, selection, instruction) {
  const activeTab = getActiveTab();
  const filePath = activeTab ? activeTab.path : "unknown";
  const model = editor.getModel();
  
  let range = selection;
  if (range.isEmpty()) {
    const position = editor.getPosition();
    range = new monaco.Selection(position.lineNumber, 1, position.lineNumber, model.getLineMaxColumn(position.lineNumber));
  }
  
  const selectedCode = model.getValueInRange(range);
  const fullFileContent = model.getValue();
  
  setAgentBusy(true);
  addChatMessage("system", `Inline Editing: "${instruction}"...`);
  
  try {
    const apiKeys = {
      openrouter: els.openRouterKeyInput?.value.trim() || "",
      groq: els.groqKeyInput ? els.groqKeyInput.value.trim() : ""
    };
    
    const res = await window.novaAPI.agent.inlineEdit({
      instruction,
      selectedCode,
      fullFileContent,
      filePath,
      apiKeys
    });
    
    setAgentBusy(false);
    
    if (res.error) {
      addChatMessage("system", `Inline Edit failed: ${res.error}`);
      return;
    }
    
    if (!res.code) {
      addChatMessage("system", `Inline Edit: AI did not return any replacement code.`);
      return;
    }
    
    showInlineDiff(editor, range, selectedCode, res.code);
    
  } catch (err) {
    setAgentBusy(false);
    addChatMessage("system", `Inline Edit failed: ${err.message}`);
  }
}

function showInlineDiff(editor, selection, originalText, newText) {
  if (activeInlineDiff) {
    rejectActiveInlineDiff();
  }

  const model = editor.getModel();
  const originalLines = originalText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  
  const compositeText = [...originalLines, ...newLines].join('\n');
  const startLine = selection.startLineNumber;
  
  model.pushEditOperations(
    [],
    [{
      range: selection,
      text: compositeText,
      forceMoveMarkers: true
    }],
    () => null
  );
  
  const numOriginalLines = originalLines.length;
  const numNewLines = newLines.length;
  
  const originalRange = new monaco.Range(
    startLine, 
    1, 
    startLine + numOriginalLines - 1, 
    model.getLineMaxColumn(startLine + numOriginalLines - 1)
  );
  
  const newRange = new monaco.Range(
    startLine + numOriginalLines, 
    1, 
    startLine + numOriginalLines + numNewLines - 1, 
    model.getLineMaxColumn(startLine + numOriginalLines + numNewLines - 1)
  );
  
  const decorations = editor.deltaDecorations([], [
    {
      range: originalRange,
      options: {
        isWholeLine: true,
        className: 'inline-diff-remove',
        marginClassName: 'inline-diff-remove-margin'
      }
    },
    {
      range: newRange,
      options: {
        isWholeLine: true,
        className: 'inline-diff-add',
        marginClassName: 'inline-diff-add-margin'
      }
    }
  ]);
  
  const domNode = document.createElement('div');
  domNode.className = 'inline-diff-actions';
  domNode.style.position = 'absolute';
  
  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'inline-diff-accept';
  acceptBtn.innerHTML = '✓ Accept';
  
  const rejectBtn = document.createElement('button');
  rejectBtn.className = 'inline-diff-reject';
  rejectBtn.innerHTML = '✗ Reject';
  
  domNode.appendChild(acceptBtn);
  domNode.appendChild(rejectBtn);
  
  const actionsWidget = {
    getId: () => 'inline-diff-actions-widget',
    getDomNode: () => domNode,
    getPosition: () => {
      return {
        position: { lineNumber: startLine, column: 1 },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW
        ]
      };
    }
  };
  
  editor.addContentWidget(actionsWidget);
  
  activeInlineDiff = {
    editor,
    startLine,
    numOriginalLines,
    numNewLines,
    decorations,
    actionsWidget,
    originalText,
    newText
  };
  
  acceptBtn.addEventListener('click', acceptActiveInlineDiff);
  rejectBtn.addEventListener('click', rejectActiveInlineDiff);
}

function acceptActiveInlineDiff() {
  if (!activeInlineDiff) return;
  const { editor, startLine, numOriginalLines, numNewLines, decorations, actionsWidget, newText } = activeInlineDiff;
  const model = editor.getModel();
  
  editor.deltaDecorations(decorations, []);
  editor.removeContentWidget(actionsWidget);
  
  const totalLines = numOriginalLines + numNewLines;
  const currentRange = new monaco.Range(
    startLine,
    1,
    startLine + totalLines - 1,
    model.getLineMaxColumn(startLine + totalLines - 1)
  );
  
  model.pushEditOperations(
    [],
    [{
      range: currentRange,
      text: newText,
      forceMoveMarkers: true
    }],
    () => null
  );
  
  activeInlineDiff = null;
  editor.focus();
  
  const activeTab = getActiveTab();
  if (activeTab) {
    activeTab.content = model.getValue();
    activeTab.isDirty = true;
    renderTabs();
  }
}

function rejectActiveInlineDiff() {
  if (!activeInlineDiff) return;
  const { editor, startLine, numOriginalLines, numNewLines, decorations, actionsWidget, originalText } = activeInlineDiff;
  const model = editor.getModel();
  
  editor.deltaDecorations(decorations, []);
  editor.removeContentWidget(actionsWidget);
  
  const totalLines = numOriginalLines + numNewLines;
  const currentRange = new monaco.Range(
    startLine,
    1,
    startLine + totalLines - 1,
    model.getLineMaxColumn(startLine + totalLines - 1)
  );
  
  model.pushEditOperations(
    [],
    [{
      range: currentRange,
      text: originalText,
      forceMoveMarkers: true
    }],
    () => null
  );
  
  activeInlineDiff = null;
  editor.focus();
}

// ── Git Integration Module ──

function initGit() {
  const gitRefreshBtn = document.getElementById("gitRefreshBtn");
  const gitCreateBranchBtn = document.getElementById("gitCreateBranchBtn");
  const gitBranchSelect = document.getElementById("gitBranchSelect");
  const gitPullBtn = document.getElementById("gitPullBtn");
  const gitPushBtn = document.getElementById("gitPushBtn");
  const gitCommitBtn = document.getElementById("gitCommitBtn");
  const gitCommitInput = document.getElementById("gitCommitInput");

  if (gitRefreshBtn) {
    gitRefreshBtn.addEventListener("click", () => {
      refreshGitPanel();
    });
  }

  if (gitCreateBranchBtn) {
    gitCreateBranchBtn.addEventListener("click", handleCreateBranch);
  }

  if (gitBranchSelect) {
    gitBranchSelect.addEventListener("change", handleBranchChange);
  }

  if (gitPullBtn) {
    gitPullBtn.addEventListener("click", handleGitPull);
  }

  if (gitPushBtn) {
    gitPushBtn.addEventListener("click", handleGitPush);
  }

  if (gitCommitBtn) {
    gitCommitBtn.addEventListener("click", handleGitCommit);
  }

  if (gitCommitInput) {
    gitCommitInput.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGitCommit();
      }
    });
  }
}

async function refreshGitPanel() {
  if (!state.workspaceRoot) {
    showGitPlaceholder("No open workspace. Please open a folder first.");
    return;
  }

  try {
    // 1. Fetch current status
    const statusRes = await window.novaAPI.git.status();
    if (!statusRes.success) {
      if (statusRes.error && statusRes.error.includes("not a git repository")) {
        showGitPlaceholder("Not a git repository. Open a folder with a Git repository.");
      } else {
        showGitPlaceholder(`Git error: ${statusRes.error || "Unknown error"}`);
      }
      return;
    }

    // 2. Fetch branches
    const branchRes = await window.novaAPI.git.getBranches();
    if (branchRes.success) {
      renderGitBranches(branchRes.stdout);
    }

    // 3. Render changed files
    renderGitChanges(statusRes.stdout);

  } catch (error) {
    console.error("Failed to refresh Git status:", error);
    showGitPlaceholder(`Failed to load Git status: ${error.message}`);
  }
}

function showGitPlaceholder(message) {
  const gitChangesList = document.getElementById("gitChangesList");
  if (gitChangesList) {
    gitChangesList.innerHTML = `<div class="git-empty-state">${message}</div>`;
  }
  const gitBranchSelect = document.getElementById("gitBranchSelect");
  if (gitBranchSelect) {
    gitBranchSelect.innerHTML = `<option value="">None</option>`;
    gitBranchSelect.disabled = true;
  }
}

function renderGitBranches(branchOutput) {
  const gitBranchSelect = document.getElementById("gitBranchSelect");
  if (!gitBranchSelect) return;

  gitBranchSelect.disabled = false;
  gitBranchSelect.innerHTML = "";

  // Parse branches
  const lines = branchOutput.split("\n");
  let activeBranch = "";
  const branches = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    let isCurrent = false;
    if (line.startsWith("*")) {
      isCurrent = true;
      line = line.substring(1).trim();
    }

    // Strip remotes prefix if any (e.g. remotes/origin/main)
    let displayName = line;
    if (line.startsWith("remotes/")) {
      displayName = line.replace("remotes/", "");
    }

    branches.push({ name: line, displayName, isCurrent });
    if (isCurrent) {
      activeBranch = line;
    }
  }

  // Populate select
  branches.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.name;
    opt.textContent = b.displayName;
    opt.selected = b.isCurrent;
    gitBranchSelect.appendChild(opt);
  });

  // Update status bar Git branch text
  const statusGitBranch = document.getElementById("statusGitBranch");
  if (statusGitBranch) {
    if (activeBranch) {
      statusGitBranch.classList.remove("hidden");
      statusGitBranch.textContent = `git: ${activeBranch}`;
    } else {
      statusGitBranch.classList.add("hidden");
    }
  }
}

function renderGitChanges(statusOutput) {
  const gitChangesList = document.getElementById("gitChangesList");
  if (!gitChangesList) return;

  gitChangesList.innerHTML = "";

  const lines = statusOutput.split("\n").filter(l => l.trim());

  if (lines.length === 0) {
    gitChangesList.innerHTML = `<div class="git-empty-state">No changes detected</div>`;
    return;
  }

  const stagedFiles = [];
  const unstagedFiles = [];

  for (const line of lines) {
    const statusPart = line.substring(0, 2);
    const filePath = line.substring(3).trim();
    const fileName = filePath.split("/").pop();

    const stagedCode = statusPart[0];
    const unstagedCode = statusPart[1];

    if (stagedCode !== " " && stagedCode !== "?") {
      stagedFiles.push({
        path: filePath,
        name: fileName,
        status: stagedCode,
        isStaged: true
      });
    }

    if (unstagedCode !== " ") {
      unstagedFiles.push({
        path: filePath,
        name: fileName,
        status: unstagedCode === "?" ? "U" : unstagedCode,
        isStaged: false
      });
    }
  }

  if (stagedFiles.length > 0) {
    const stagedHeader = document.createElement("div");
    stagedHeader.className = "git-file-group-header";
    stagedHeader.innerHTML = `<span>Staged Changes</span><span class="git-file-group-count">${stagedFiles.length}</span>`;
    gitChangesList.appendChild(stagedHeader);

    stagedFiles.forEach(file => {
      gitChangesList.appendChild(createGitFileItem(file));
    });
  }

  if (unstagedFiles.length > 0) {
    const unstagedHeader = document.createElement("div");
    unstagedHeader.className = "git-file-group-header";
    unstagedHeader.innerHTML = `<span>Changes</span><span class="git-file-group-count">${unstagedFiles.length}</span>`;
    gitChangesList.appendChild(unstagedHeader);

    unstagedFiles.forEach(file => {
      gitChangesList.appendChild(createGitFileItem(file));
    });
  }

  // Update git badge on activity bar
  const allChangedFiles = [...stagedFiles, ...unstagedFiles];
  if (typeof updateGitBadge === 'function') {
    updateGitBadge(allChangedFiles.length);
  }
}

function createGitFileItem(file) {
  const item = document.createElement("div");
  item.className = "git-file-item";

  const icon = document.createElement("div");
  icon.className = "git-file-icon";
  icon.innerHTML = window.getFileIcon ? window.getFileIcon(file.name) : "📄";
  item.appendChild(icon);

  const info = document.createElement("div");
  info.className = "git-file-info";
  
  const name = document.createElement("span");
  name.className = "git-file-name";
  name.textContent = file.name;
  info.appendChild(name);

  const pathSpan = document.createElement("span");
  pathSpan.className = "git-file-path";
  pathSpan.textContent = file.path;
  info.appendChild(pathSpan);

  item.appendChild(info);

  const actions = document.createElement("div");
  actions.className = "git-file-actions";

  const actionBtn = document.createElement("button");
  actionBtn.className = `git-file-action-btn ${file.isStaged ? "unstage-btn" : "stage-btn"}`;
  actionBtn.title = file.isStaged ? "Unstage changes" : "Stage changes";
  actionBtn.innerHTML = file.isStaged ? "-" : "+";

  actionBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      if (file.isStaged) {
        await window.novaAPI.git.unstage(file.path);
      } else {
        await window.novaAPI.git.stage(file.path);
      }
      refreshGitPanel();
    } catch (err) {
      addChatMessage("system", `❌ Git Error: ${err.message}`);
    }
  });

  actions.appendChild(actionBtn);
  item.appendChild(actions);

  const badge = document.createElement("span");
  let statusClass = "status-untracked";
  let letter = "U";

  if (file.status === "M") {
    statusClass = "status-modified";
    letter = "M";
  } else if (file.status === "A") {
    statusClass = "status-added";
    letter = "A";
  } else if (file.status === "D") {
    statusClass = "status-deleted";
    letter = "D";
  }

  badge.className = `git-file-status-badge ${statusClass}`;
  badge.textContent = letter;
  item.appendChild(badge);

  item.addEventListener("click", () => {
    if (file.status !== "D") {
      openFile(file.path);
    }
  });

  return item;
}

async function handleBranchChange(e) {
  const branchName = e.target.value;
  if (!branchName) return;

  try {
    const res = await window.novaAPI.git.checkout(branchName);
    if (res.success) {
      addChatMessage("system", `Checked out branch <b>${branchName}</b>`);
      refreshGitPanel();
      refreshWorkspaceTree();
    } else {
      addChatMessage("system", `❌ Checkout failed: ${res.error}`);
    }
  } catch (err) {
    addChatMessage("system", `❌ Checkout failed: ${err.message}`);
  }
}

async function handleCreateBranch() {
  const branchName = prompt("Enter new branch name:");
  if (!branchName || !branchName.trim()) return;

  try {
    const res = await window.novaAPI.git.createBranch(branchName.trim());
    if (res.success) {
      addChatMessage("system", `Created and checked out branch <b>${branchName}</b>`);
      refreshGitPanel();
      refreshWorkspaceTree();
    } else {
      addChatMessage("system", `❌ Failed to create branch: ${res.error}`);
    }
  } catch (err) {
    addChatMessage("system", `❌ Failed to create branch: ${err.message}`);
  }
}

async function handleGitPull() {
  const gitPullBtn = document.getElementById("gitPullBtn");
  if (gitPullBtn) {
    gitPullBtn.disabled = true;
    gitPullBtn.textContent = "Pulling...";
  }

  try {
    const res = await window.novaAPI.git.pull();
    if (res.success) {
      addChatMessage("system", `Successfully pulled changes from remote repository.`);
      refreshGitPanel();
      refreshWorkspaceTree();
    } else {
      addChatMessage("system", `❌ Pull failed: ${res.error || res.stderr}`);
    }
  } catch (err) {
    addChatMessage("system", `❌ Pull failed: ${err.message}`);
  } finally {
    if (gitPullBtn) {
      gitPullBtn.disabled = false;
      gitPullBtn.textContent = "Pull";
    }
  }
}

async function handleGitPush() {
  const gitPushBtn = document.getElementById("gitPushBtn");
  if (gitPushBtn) {
    gitPushBtn.disabled = true;
    gitPushBtn.textContent = "Pushing...";
  }

  try {
    const res = await window.novaAPI.git.push();
    if (res.success) {
      addChatMessage("system", `Successfully pushed changes to remote repository.`);
      refreshGitPanel();
    } else {
      addChatMessage("system", `❌ Push failed: ${res.error || res.stderr}`);
    }
  } catch (err) {
    addChatMessage("system", `❌ Push failed: ${err.message}`);
  } finally {
    if (gitPushBtn) {
      gitPushBtn.disabled = false;
      gitPushBtn.textContent = "Push";
    }
  }
}

async function handleGitCommit() {
  const gitCommitInput = document.getElementById("gitCommitInput");
  const gitCommitBtn = document.getElementById("gitCommitBtn");

  if (!gitCommitInput || !gitCommitInput.value.trim()) {
    addChatMessage("system", "⚠️ Please enter a commit message first.");
    return;
  }

  const message = gitCommitInput.value.trim();

  if (gitCommitBtn) {
    gitCommitBtn.disabled = true;
    gitCommitBtn.textContent = "Committing...";
  }

  try {
    const res = await window.novaAPI.git.commit(message);
    if (res.success) {
      addChatMessage("system", `Successfully committed: "${message}"`);
      gitCommitInput.value = "";
      refreshGitPanel();
    } else {
      addChatMessage("system", `❌ Commit failed: ${res.error}`);
    }
  } catch (err) {
    addChatMessage("system", `❌ Commit failed: ${err.message}`);
  } finally {
    if (gitCommitBtn) {
      gitCommitBtn.disabled = false;
      gitCommitBtn.textContent = "Commit";
    }
  }
}

// ==================== NEW: WELCOME SEQ, ONBOARDING, BREADCRUMBS, OUTLINE, TABBED TERMINALS & GIT BRANCH SWITCHING ====================

function animateWelcomeIntroLogText() {
  const logText = document.getElementById('welcomeIntroLogText');
  if (!logText) return;
  
  const text = "Welcome to Nova IDE — AI-agent-first workspace. Type ⌘P to explore.";
  logText.textContent = "";
  
  if (window.welcomeTypingTimer) {
    clearInterval(window.welcomeTypingTimer);
  }
  
  setTimeout(() => {
    let index = 0;
    logText.textContent = "";
    window.welcomeTypingTimer = setInterval(() => {
      if (index < text.length) {
        logText.textContent += text.charAt(index);
        index++;
      } else {
        clearInterval(window.welcomeTypingTimer);
        window.welcomeTypingTimer = null;
      }
    }, 40);
  }, 600);
}

const TOUR_STEPS = [
  {
    selector: '.activity-bar',
    content: 'The Navigation bar lets you switch between the File Explorer, Git status, Terminal settings, and more. All using elegant typographic text labels instead of icons.'
  },
  {
    selector: '#explorerPanel',
    content: 'The Workspace Explorer displays your project folder structure and the new Outline panel, showing all your code symbols (functions, classes) for easy navigation.'
  },
  {
    selector: '.editor-area',
    content: 'Edit code in Monaco Editor. Use the dynamic breadcrumbs at the top to navigate file path segments and switch files seamlessly.'
  },
  {
    selector: '#aiPanel',
    content: 'The SuperNova AI Panel provides contextual assistance. Use our custom-branded SuperNova v1 multi-agent engine or the GPT OSS 20B model for real-time code execution and chatting.'
  },
  {
    selector: '#terminalPanel',
    content: 'Run and manage processes using the multi-terminal tabbed bar. Spawn multiple terminals and toggle between tabs instantly.'
  }
];

let currentTourStep = 0;
let terminalWasHiddenBeforeTour = false;

function startOnboardingTour() {
  console.log("🚀 startOnboardingTour called");
  currentTourStep = 0;
  terminalWasHiddenBeforeTour = !state.terminalVisible;
  
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';
  }
  
  showTourStep(0);
}

function showTourStep(stepIndex) {
  console.log("📋 showTourStep called with index:", stepIndex);
  currentTourStep = stepIndex;
  const step = TOUR_STEPS[stepIndex];
  
  if (step.selector === '#terminalPanel' && !state.terminalVisible) {
    state.terminalVisible = true;
    els.terminalPanel.classList.remove("hidden");
    if (state.terminals.length === 0) {
      createTerminalInstance();
    }
  }

  const contentEl = document.getElementById('onboardingContent');
  if (contentEl) {
    contentEl.innerHTML = `<div style="font-weight: 700; margin-bottom: 6px; color: var(--accent);">Step ${stepIndex + 1} of ${TOUR_STEPS.length}</div>` + step.content;
  }

  const nextBtn = document.getElementById('onboardingNextBtn');
  if (nextBtn) {
    nextBtn.textContent = stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
  }

  setTimeout(() => {
    positionHighlight(step.selector);
  }, 100);
}

function nextTourStep() {
  console.log("➡️ nextTourStep clicked. Current:", currentTourStep);
  if (currentTourStep < TOUR_STEPS.length - 1) {
    showTourStep(currentTourStep + 1);
  } else {
    endOnboardingTour();
  }
}

function endOnboardingTour() {
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.opacity = '0';
  }

  if (terminalWasHiddenBeforeTour && state.terminalVisible) {
    state.terminalVisible = false;
    els.terminalPanel.classList.add("hidden");
  }
}

function positionHighlight(selector) {
  const overlay = document.getElementById('onboardingOverlay');
  const highlight = document.getElementById('onboardingHighlight');
  const tooltip = document.getElementById('onboardingTooltip');
  const target = document.querySelector(selector);
  
  if (!target || !overlay || !highlight || !tooltip) return;

  const rect = target.getBoundingClientRect();
  
  highlight.style.top = `${rect.top}px`;
  highlight.style.left = `${rect.left}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;

  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 12;

  let tooltipLeft = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let tooltipTop = rect.bottom + padding;

  if (tooltipTop + tooltipRect.height > window.innerHeight) {
    tooltipTop = rect.top - tooltipRect.height - padding;
  }
  if (tooltipLeft + tooltipRect.width > window.innerWidth) {
    tooltipLeft = window.innerWidth - tooltipRect.width - padding;
  }
  if (tooltipLeft < 0) {
    tooltipLeft = padding;
  }

  if (selector === '.activity-bar') {
    tooltipLeft = rect.right + padding;
    tooltipTop = rect.top + padding;
  } else if (selector === '#explorerPanel') {
    tooltipLeft = rect.right + padding;
    tooltipTop = rect.top + padding;
  } else if (selector === '#aiPanel') {
    tooltipLeft = rect.left - tooltipRect.width - padding;
    tooltipTop = rect.top + padding;
  } else if (selector === '#terminalPanel') {
    tooltipLeft = rect.left + padding;
    tooltipTop = rect.top - tooltipRect.height - padding;
  }

  tooltip.style.left = `${tooltipLeft}px`;
  tooltip.style.top = `${tooltipTop}px`;
}

function findNodeByPath(rootNode, targetPath) {
  if (!rootNode) return null;
  const normalize = p => p.replace(/\\/g, '/').replace(/\/$/, '');
  const normTarget = normalize(targetPath);
  const normRoot = normalize(rootNode.path || '');
  
  if (normRoot === normTarget) {
    return rootNode;
  }
  
  if (rootNode.children) {
    for (const child of rootNode.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function renderBreadcrumbs() {
  const container = document.getElementById('breadcrumbs');
  if (!container) return;

  if (!state.activePath || !state.workspaceRoot) {
    container.innerHTML = '';
    return;
  }

  const workspaceRoot = state.workspaceRoot.replace(/\\/g, '/');
  const activePath = state.activePath.replace(/\\/g, '/');

  if (!activePath.startsWith(workspaceRoot)) {
    const fileName = activePath.split('/').pop() || activePath;
    container.innerHTML = `<span class="breadcrumb-item active" data-path="${activePath}">${fileName}</span>`;
    return;
  }

  const relativePath = activePath.substring(workspaceRoot.length).replace(/^\//, '');
  const parts = relativePath ? relativePath.split('/') : [];
  
  const rootName = workspaceRoot.split('/').pop() || 'Root';
  let segments = [{ name: rootName, path: workspaceRoot }];
  
  let currentAccumulatedPath = workspaceRoot;
  for (let i = 0; i < parts.length; i++) {
    currentAccumulatedPath += '/' + parts[i];
    segments.push({ name: parts[i], path: currentAccumulatedPath });
  }

  container.innerHTML = '';

  segments.forEach((seg, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-separator';
      sep.textContent = '>';
      container.appendChild(sep);
    }

    const item = document.createElement('span');
    item.className = 'breadcrumb-item';
    if (idx === segments.length - 1) {
      item.classList.add('active');
    }
    item.textContent = seg.name;
    item.title = seg.path;
    
    item.addEventListener('click', (e) => {
      const pathToShow = (idx === segments.length - 1 && parts.length > 0)
        ? segments[segments.length - 2].path
        : seg.path;
      showBreadcrumbMenu(e, pathToShow);
    });

    container.appendChild(item);
  });
}

function showBreadcrumbMenu(event, dirPath) {
  event.stopPropagation();
  const existing = document.querySelector('.breadcrumb-dropdown');
  if (existing) existing.remove();

  const dirNode = findNodeByPath(state.tree, dirPath);
  if (!dirNode || !dirNode.children || dirNode.children.length === 0) return;

  const menu = document.createElement('div');
  menu.className = 'breadcrumb-dropdown';
  
  const rect = event.currentTarget.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;

  const sorted = [...dirNode.children].sort(compareNodes);

  sorted.forEach(child => {
    const item = document.createElement('div');
    item.className = 'breadcrumb-dropdown-item';
    const prefix = child.type === 'folder' ? '[DIR] ' : '';
    item.textContent = prefix + child.name;
    
    item.addEventListener('click', async () => {
      menu.remove();
      if (child.type === 'file') {
        await openFile(child.path);
      } else if (child.type === 'folder') {
        state.expandedFolders.add(child.path);
        renderFileTree();
      }
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  const closeHandler = () => {
    menu.remove();
    document.removeEventListener('click', closeHandler);
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 10);
}

function parseSymbols(content, filePath) {
  if (!content) return [];
  const ext = filePath.split('.').pop().toLowerCase();
  const lines = content.split('\n');
  const symbols = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const indentMatch = lineText.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const trimmed = lineText.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) continue;

    if (ext === 'py') {
      const pyMatch = trimmed.match(/^(def|class)\s+([a-zA-Z0-9_]+)/);
      if (pyMatch) {
        const kind = pyMatch[1] === 'class' ? 'CLASS' : 'FUNC';
        symbols.push({
          name: pyMatch[2],
          line: i + 1,
          kind,
          indent
        });
      }
    } else if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
      let matched = false;
      
      const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        symbols.push({ name: classMatch[1], line: i + 1, kind: 'CLASS', indent });
        matched = true;
      }
      
      if (!matched) {
        const funcMatch = trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z0-9_]+)/);
        if (funcMatch) {
          symbols.push({ name: funcMatch[1], line: i + 1, kind: 'FUNC', indent });
          matched = true;
        }
      }

      if (!matched) {
        const arrowMatch = trimmed.match(/^(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);
        if (arrowMatch) {
          symbols.push({ name: arrowMatch[1], line: i + 1, kind: 'FUNC', indent });
          matched = true;
        }
      }

      if (!matched) {
        const methodMatch = trimmed.match(/^(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/);
        if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'let', 'const', 'var', 'return'].includes(methodMatch[1])) {
          symbols.push({ name: methodMatch[1], line: i + 1, kind: 'FUNC', indent });
        }
      }
    }
  }
  return symbols;
}

function renderOutline() {
  const container = document.getElementById('outlineTree');
  if (!container) return;

  if (!state.activePath || !state.editor) {
    container.innerHTML = '<div class="outline-empty">No active document</div>';
    return;
  }

  const content = state.editor.getValue();
  const symbols = parseSymbols(content, state.activePath);

  if (symbols.length === 0) {
    container.innerHTML = '<div class="outline-empty">No symbols found</div>';
    return;
  }

  container.innerHTML = '';
  
  symbols.forEach(sym => {
    const li = document.createElement('div');
    li.className = 'outline-node';
    const basePadding = 6;
    const indentMultiplier = 8;
    const indentPadding = Math.min(sym.indent, 40) / 4 * indentMultiplier;
    li.style.paddingLeft = `${basePadding + indentPadding}px`;
    
    const kindTag = document.createElement('span');
    kindTag.className = sym.kind === 'CLASS' ? 'outline-kind-class' : 'outline-kind-func';
    kindTag.textContent = sym.kind;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'outline-label';
    nameSpan.textContent = sym.name;

    li.appendChild(kindTag);
    li.appendChild(nameSpan);
    
    li.addEventListener('click', () => {
      if (state.editor) {
        state.editor.revealLineInCenter(sym.line);
        state.editor.setPosition({ lineNumber: sym.line, column: 1 });
        state.editor.focus();
      }
    });
    container.appendChild(li);
  });
}

async function createTerminalInstance() {
  const termId = 'term-' + Date.now();
  const index = state.terminals.length + 1;
  const name = `bash (${index})`;

  const term = new Terminal({
    cursorBlink: true,
    theme: {
      background: "#0a0d13",
      foreground: "#b9caf3",
      cursor: "#7c6aff",
      selectionBackground: "#242b3d"
    },
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 13,
    lineHeight: 1.2
  });

  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);

  const termEl = document.createElement("div");
  termEl.id = `terminal-container-${termId}`;
  termEl.className = "terminal-instance-container";
  termEl.style.width = "100%";
  termEl.style.height = "100%";
  termEl.style.display = "none";
  
  els.xtermTerminalContainer.appendChild(termEl);
  term.open(termEl);
  fit.fit();

  try {
    const backendId = await window.novaAPI.terminalCreate(term.cols, term.rows);

    term.onData((data) => {
      window.novaAPI.terminalInput(backendId, data);
    });

    const removeDataListener = window.novaAPI.onTerminalData(backendId, (data) => {
      term.write(data);
    });

    const removeExitListener = window.novaAPI.onTerminalExit(backendId, () => {
      term.write("\r\n\x1b[31m[Nova Terminal Session Closed]\x1b[0m\r\n");
      closeTerminalInstance(termId);
    });

    const termInstance = {
      id: termId,
      name,
      term,
      fit,
      termId: backendId,
      element: termEl,
      dispose: () => {
        try { removeDataListener(); } catch (e) {}
        try { removeExitListener(); } catch (e) {}
        try { term.dispose(); } catch (e) {}
        termEl.remove();
      }
    };

    state.terminals.push(termInstance);
    activateTerminalInstance(termId);
  } catch (error) {
    term.write(`\r\n\x1b[31mFailed to start native shell: ${error.message}\x1b[0m\r\n`);
    termEl.remove();
  }
}

function activateTerminalInstance(id) {
  state.activeTerminalId = id;
  
  state.terminals.forEach((termInstance) => {
    if (termInstance.id === id) {
      termInstance.element.style.display = "block";
      activeTerminal = termInstance;
      
      setTimeout(() => {
        termInstance.fit.fit();
        termInstance.term.focus();
      }, 50);
    } else {
      termInstance.element.style.display = "none";
    }
  });

  renderTerminalTabs();
}

function closeTerminalInstance(id) {
  const index = state.terminals.findIndex((t) => t.id === id);
  if (index === -1) return;

  const closedInstance = state.terminals[index];
  closedInstance.dispose();
  state.terminals.splice(index, 1);

  if (state.activeTerminalId === id) {
    const fallback = state.terminals[index] || state.terminals[index - 1] || null;
    if (fallback) {
      activateTerminalInstance(fallback.id);
    } else {
      state.activeTerminalId = null;
      activeTerminal = null;
    }
  }

  renderTerminalTabs();
}

function renderTerminalTabs() {
  const container = document.getElementById('terminalTabs');
  if (!container) return;

  container.innerHTML = '';
  state.terminals.forEach((termInfo) => {
    const tab = document.createElement('div');
    tab.className = 'terminal-tab';
    if (termInfo.id === state.activeTerminalId) {
      tab.classList.add('active');
    }

    const label = document.createElement('span');
    label.className = 'terminal-tab-label';
    label.textContent = termInfo.name;

    const closeBtn = document.createElement('span');
    closeBtn.className = 'terminal-tab-close';
    closeBtn.innerHTML = window.NOVA_ICONS?.close || '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTerminalInstance(termInfo.id);
    });

    tab.appendChild(label);
    tab.appendChild(closeBtn);

    tab.addEventListener('click', () => {
      activateTerminalInstance(termInfo.id);
    });

    container.appendChild(tab);
  });
}

async function showGitBranchQuickPick(event) {
  event.stopPropagation();
  const existing = document.querySelector('.git-branch-quickpick');
  if (existing) existing.remove();

  const branchRes = await window.novaAPI.git.getBranches();
  if (!branchRes.success) {
    alert("Failed to get branches: " + branchRes.error);
    return;
  }

  const lines = branchRes.stdout.split("\n");
  const branches = [];
  let activeBranch = "";

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    let isCurrent = false;
    if (line.startsWith("*")) {
      isCurrent = true;
      line = line.substring(1).trim();
    }
    branches.push({ name: line, isCurrent });
    if (isCurrent) activeBranch = line;
  }

  const picker = document.createElement('div');
  picker.className = 'git-branch-quickpick';
  
  const rect = event.currentTarget.getBoundingClientRect();
  picker.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  picker.style.left = `${rect.left}px`;

  const header = document.createElement('div');
  header.style.padding = '6px 12px';
  header.style.fontWeight = '700';
  header.style.fontSize = '10px';
  header.style.color = 'var(--text-muted)';
  header.style.textTransform = 'uppercase';
  header.style.borderBottom = '1px solid var(--border)';
  header.style.marginBottom = '4px';
  header.textContent = 'Switch Branch';
  picker.appendChild(header);

  branches.forEach(b => {
    const item = document.createElement('div');
    item.className = 'quickpick-item';
    item.style.color = b.isCurrent ? 'var(--accent)' : 'var(--text-secondary)';
    item.style.fontWeight = b.isCurrent ? '700' : 'normal';
    item.textContent = b.name + (b.isCurrent ? ' (current)' : '');

    item.addEventListener('click', async () => {
      picker.remove();
      try {
        const checkoutRes = await window.novaAPI.git.checkout(b.name);
        if (checkoutRes.success) {
          addChatMessage("system", `Checked out branch: ${b.name}`);
          await refreshGitPanel();
        } else {
          addChatMessage("system", `Checkout failed: ${checkoutRes.error}`);
        }
      } catch (e) {
        addChatMessage("system", `Error checking out branch: ${e.message}`);
      }
    });

    picker.appendChild(item);
  });

  const createItem = document.createElement('div');
  createItem.className = 'quickpick-item';
  createItem.style.color = 'var(--green)';
  createItem.style.borderTop = '1px solid var(--border)';
  createItem.style.marginTop = '4px';
  createItem.textContent = '+ Create New Branch...';

  createItem.addEventListener('click', async () => {
    picker.remove();
    const newBranchName = prompt("Enter new branch name:");
    if (newBranchName && newBranchName.trim()) {
      try {
        const createRes = await window.novaAPI.git.createBranch(newBranchName.trim());
        if (createRes.success) {
          addChatMessage("system", `Created branch: ${newBranchName}`);
          await refreshGitPanel();
        } else {
          addChatMessage("system", `Failed to create branch: ${createRes.error}`);
        }
      } catch (e) {
        addChatMessage("system", `Error creating branch: ${e.message}`);
      }
    }
  });

  picker.appendChild(createItem);
  document.body.appendChild(picker);

  const closeHandler = () => {
    picker.remove();
    document.removeEventListener('click', closeHandler);
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 10);
}


