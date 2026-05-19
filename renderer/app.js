const MODEL_CONFIG = {
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
  deepseek: {
    label: "DeepSeek R1",
    openrouterModel: "deepseek/deepseek-r1",
    pollinationsModel: "openai"
  }
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
  terminalVisible: false,
  chatMessages: [],
  apiMessages: [],
  savingPaths: new Set(),
  editor: null, // Monaco editor instance reference
  currentConversationId: null,
  conversations: []
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
  fileTree: document.getElementById("fileTree"),
  newFileBtn: document.getElementById("newFileBtn"),
  newFolderBtn: document.getElementById("newFolderBtn"),
  tabsBar: document.getElementById("tabsBar"),
  monacoEditorContainer: document.getElementById("monacoEditorContainer"),
  statusLanguage: document.getElementById("statusLanguage"),
  statusCursor: document.getElementById("statusCursor"),
  statusEncoding: document.getElementById("statusEncoding"),
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
  agentInput: document.getElementById("agentInput"),
  sendAgentBtn: document.getElementById("sendAgentBtn"),
  applyToFileBtn: document.getElementById("applyToFileBtn"),
  agentStatusDot: document.getElementById("agentStatusDot"),
  agentStatusText: document.getElementById("agentStatusText")
};

// Monaco AMD setup
require.config({ paths: { vs: "../node_modules/monaco-editor/min/vs" } });

init().catch((error) => {
  addChatMessage("system", `Startup error: ${error.message}`);
});

async function init() {
  renderModelOptions();
  bindEvents();
  syncProviderUI();

  // Load API Keys from Environment Variables (fallback to LocalStorage)
  try {
    const envKeys = await window.novaAPI.valkyrie.getEnvKeys();
    els.openRouterKeyInput.value = envKeys.openrouter || localStorage.getItem("openRouterKey") || "";
    if (els.groqKeyInput) {
      els.groqKeyInput.value = envKeys.groq || localStorage.getItem("groqKey") || "";
    }
  } catch (err) {
    els.openRouterKeyInput.value = localStorage.getItem("openRouterKey") || "";
    if (els.groqKeyInput) {
      els.groqKeyInput.value = localStorage.getItem("groqKey") || "";
    }
  }

  // 1. Initialize Monaco Editor
  await initMonaco();

  // 2. Load stored settings (now that Monaco is fully initialized!)
  loadSettings();

  // 3. Load conversations from database
  await loadConversations();

  // 3. Fetch File tree
  state.workspaceRoot = await window.novaAPI.getWorkspaceRoot();
  await refreshWorkspaceTree();

  // 4. Auto-open first workspace file
  const firstFile = findFirstFilePath(state.tree);
  if (firstFile) {
    await openFile(firstFile);
  } else {
    clearEditor();
  }

  // 5. Register Valkyrie events
  if (window.novaAPI.valkyrie) {
    window.novaAPI.valkyrie.onEvent("valkyrie:thought-chunk", (data) => {
      updateActiveValkyrieCard('thought', data.chunk);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:plan-update", (data) => {
      updateActiveValkyrieCard('plan', data.plan);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:task-update", (data) => {
      updateActiveValkyrieCard('task', data);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:diff-chunk", (data) => {
      updateActiveValkyrieCard('diff', data.chunk);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:review-status", (data) => {
      updateActiveValkyrieCard('review', data);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:status", (data) => {
      updateActiveValkyrieCard('status', data.message);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:completed", (data) => {
      updateActiveValkyrieCard('completed', data);
    });
    window.novaAPI.valkyrie.onEvent("valkyrie:error", (data) => {
      updateActiveValkyrieCard('error', data.message);
    });
  }

  addChatMessage("assistant", "Nova agent is ready. I'll include the active Monaco file as context in every request.");
  updateStatusBar();
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

      resolve();
    });
  });
}

/**
 * Initializes the real terminal using node-pty and xterm.js
 */
async function initTerminal() {
  if (activeTerminal) return;

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
  term.open(els.xtermTerminalContainer);
  fit.fit();

  try {
    // Spawn back-end shell via IPC
    const termId = await window.novaAPI.terminalCreate(term.cols, term.rows);

    // Keystrokes -> Native Shell
    term.onData((data) => {
      window.novaAPI.terminalInput(termId, data);
    });

    // Native Shell -> Keystrokes
    const removeDataListener = window.novaAPI.onTerminalData(termId, (data) => {
      term.write(data);
    });

    const removeExitListener = window.novaAPI.onTerminalExit(termId, () => {
      term.write("\r\n\x1b[31m[Nova Terminal Session Closed]\x1b[0m\r\n");
      activeTerminal = null;
    });

    activeTerminal = {
      term,
      fit,
      termId,
      dispose: () => {
        removeDataListener();
        removeExitListener();
        term.dispose();
      }
    };

    // Keep size synchronous
    window.addEventListener("resize", handleTerminalResize);
  } catch (error) {
    term.write(`\r\n\x1b[31mFailed to start native shell: ${error.message}\x1b[0m\r\n`);
  }
}

function handleTerminalResize() {
  if (activeTerminal && state.terminalVisible) {
    activeTerminal.fit.fit();
    window.novaAPI.terminalResize(activeTerminal.termId, activeTerminal.term.cols, activeTerminal.term.rows);
  }
}

function bindEvents() {
  els.openWorkspaceBtn.addEventListener("click", handleSelectWorkspace);
  els.refreshWorkspaceBtn.addEventListener("click", refreshWorkspaceTree);
  els.newFileBtn.addEventListener("click", handleCreateFile);
  els.newFolderBtn.addEventListener("click", handleCreateFolder);

  els.providerSelect.addEventListener("change", () => {
    state.provider = els.providerSelect.value;
    syncProviderUI();
  });
  els.modelSelect.addEventListener("change", () => {
    state.modelKey = els.modelSelect.value;
    syncProviderUI();
  });
  els.modeSelect.addEventListener("change", () => {
    state.mode = els.modeSelect.value;
    syncProviderUI();
  });
  els.sendAgentBtn.addEventListener("click", handleSendToAgent);
  els.agentInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSendToAgent();
    }
  });
  els.applyToFileBtn.addEventListener("click", applySuggestedContentToFile);
  els.newConversationBtn.addEventListener("click", createNewConversation);
  els.settingsBtn.addEventListener("click", () => {
    els.settingsModal.classList.remove("hidden");
  });
  els.closeSettingsBtn.addEventListener("click", () => {
    els.settingsModal.classList.add("hidden");
  });
  els.saveSettingsBtn.addEventListener("click", saveSettings);

  els.terminalToggleBtn.addEventListener("click", () => {
    state.terminalVisible = !state.terminalVisible;
    els.terminalPanel.classList.toggle("hidden", !state.terminalVisible);
    
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
  });

  els.openRouterKeyInput.addEventListener("input", () => {
    localStorage.setItem("openRouterKey", els.openRouterKeyInput.value);
  });
  if (els.groqKeyInput) {
    els.groqKeyInput.addEventListener("input", () => {
      localStorage.setItem("groqKey", els.groqKeyInput.value);
    });
  }

  els.acceptDiffBtn.addEventListener("click", () => {
    hideDiffEditor();
    addChatMessage("system", "Proposed changes accepted and committed.");
  });

  els.rejectDiffBtn.addEventListener("click", async () => {
    if (valkyrieSession.activeFilePath && valkyrieSession.originalContent !== null) {
      try {
        await window.novaAPI.writeFile(valkyrieSession.activeFilePath, valkyrieSession.originalContent);
        
        // Restore tab state and editor state
        const activeTab = getActiveTab();
        if (activeTab && activeTab.path === valkyrieSession.activeFilePath) {
          activeTab.content = valkyrieSession.originalContent;
          activeTab.dirty = false;
          renderTabs();
        }
        addChatMessage("system", "Proposed changes rejected and rolled back.");
      } catch (err) {
        addChatMessage("system", `Failed to roll back changes: ${err.message}`);
      }
    }
    hideDiffEditor();
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

async function handleSelectWorkspace() {
  try {
    state.workspaceRoot = await window.novaAPI.selectWorkspaceRoot();
    state.tabs = [];
    state.activePath = null;
    state.selectedPath = "";
    
    // Dispose terminal to reset root
    if (activeTerminal) {
      activeTerminal.dispose();
      activeTerminal = null;
      window.removeEventListener("resize", handleTerminalResize);
    }

    clearEditor();
    await refreshWorkspaceTree();
    const firstFile = findFirstFilePath(state.tree);
    if (firstFile) {
      await openFile(firstFile);
    }
    addChatMessage("system", "Workspace switched.");
  } catch (error) {
    addChatMessage("system", `Workspace switch failed: ${error.message}`);
  }
}

async function refreshWorkspaceTree() {
  try {
    state.tree = await window.novaAPI.readTree();
    state.workspaceRoot = await window.novaAPI.getWorkspaceRoot();
    state.expandedFolders.add("");
    els.workspaceLabel.textContent = state.workspaceRoot;
    renderFileTree();
    renderTabs();
    updateContextLabel();
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
}

function renderTreeNode(node, depth) {
  const li = document.createElement("li");
  const row = document.createElement("div");
  row.className = "tree-row";
  row.style.paddingLeft = `${8 + depth * 14}px`;

  const caret = document.createElement("span");
  caret.className = "caret";
  if (node.type === "folder") {
    caret.textContent = state.expandedFolders.has(node.path) ? "▾" : "▸";
  } else {
    caret.textContent = " ";
  }

  const icon = document.createElement("span");
  icon.className = "icon";
  icon.textContent = getNodeIcon(node);

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = node.name;

  if (node.path === state.activePath) {
    row.classList.add("active-file");
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
    return "📁";
  }
  const ext = getExtension(node.name);
  return ICON_BY_EXT[ext] || "📄";
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
    title.textContent = fileName;

    const closeBtn = document.createElement("button");
    closeBtn.className = "close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(tab.path);
    });

    tabButton.addEventListener("click", () => {
      activateTab(tab.path);
    });

    tabButton.append(title, closeBtn);
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
}

function closeTab(path) {
  const index = state.tabs.findIndex((tab) => tab.path === path);
  if (index === -1) {
    return;
  }

  state.tabs.splice(index, 1);
  
  // Dispose the Monaco model to keep memory safe
  const fileUri = monaco.Uri.parse(`file:///${path}`);
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
  } catch (error) {
    addChatMessage("system", `Failed to open ${normalizedPath}: ${error.message}`);
  }
}

function clearEditor() {
  if (state.editor) {
    state.editor.setValue("");
  }
  updateStatusBar();
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

  const fileUri = monaco.Uri.parse(`file:///${filePath}`);
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
  els.contextFileLabel.textContent = state.activePath || "No file selected";
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
  const basePath = getSuggestedBasePath();
  const suggestion = basePath ? `${basePath}/` : "";
  const rawPath = window.prompt("New file path (e.g. src/index.ts):", suggestion);
  if (!rawPath) {
    return;
  }

  const filePath = normalizePath(rawPath);
  if (!filePath) {
    return;
  }

  try {
    await window.novaAPI.createFile(filePath);
    await refreshWorkspaceTree();
    await openFile(filePath);
  } catch (error) {
    addChatMessage("system", `Could not create file: ${error.message}`);
  }
}

async function handleCreateFolder() {
  const basePath = getSuggestedBasePath();
  const suggestion = basePath ? `${basePath}/` : "";
  const rawPath = window.prompt("New folder path (e.g. src/components):", suggestion);
  if (!rawPath) {
    return;
  }

  const folderPath = normalizePath(rawPath);
  if (!folderPath) {
    return;
  }

  try {
    await window.novaAPI.createFolder(folderPath);
    state.expandedFolders.add(folderPath);
    await refreshWorkspaceTree();
  } catch (error) {
    addChatMessage("system", `Could not create folder: ${error.message}`);
  }
}

function renderModelOptions() {
  els.modelSelect.innerHTML = "";
  for (const [key, config] of Object.entries(MODEL_CONFIG)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = config.label;
    els.modelSelect.appendChild(option);
  }
  els.modelSelect.value = state.modelKey;
  els.modeSelect.value = state.mode;
  els.providerSelect.value = state.provider;
}

function syncProviderUI() {
  const model = MODEL_CONFIG[state.modelKey];
  const isOpenRouter = state.provider === "openrouter";
  const isEditMode = state.mode === "edit";
  
  const showKeys = isOpenRouter || isEditMode;

  els.openRouterKeyWrap.classList.toggle("hidden", !showKeys);
  if (els.groqKeyWrap) {
    els.groqKeyWrap.classList.toggle("hidden", !showKeys);
  }
  
  if (isEditMode) {
    els.modelHint.textContent = "⚡ Edit mode activates the Valkyrie Multi-Agent cohort (DeepSeek R1 + Qwen Coder + Llama 3.3). API Keys are required.";
  } else {
    els.modelHint.textContent = isOpenRouter
      ? `OpenRouter model: ${model.openrouterModel} (free-tier availability can vary).`
      : `Pollinations model: ${model.pollinationsModel} (no API key required).`;
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
      content: msg.content
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

function addChatMessage(role, content) {
  state.chatMessages.push({ role, content });
  renderChatMessages();
}

function renderChatMessages() {
  els.chatMessages.innerHTML = "";
  for (const message of state.chatMessages) {
    const bubble = document.createElement("div");
    bubble.className = `message ${message.role}`;
    bubble.textContent = message.content;
    els.chatMessages.appendChild(bubble);
  }
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function setAgentBusy(isBusy) {
  els.agentStatusDot.classList.toggle("busy", isBusy);
  els.agentStatusText.textContent = isBusy ? "Thinking..." : "Ready";
  els.sendAgentBtn.disabled = isBusy;
}

function buildModeInstruction() {
  switch (state.mode) {
    case "edit":
      return "You are in EDIT mode. Return the full updated content of the file in one fenced code block.";
    case "explain":
      return "You are in EXPLAIN mode. Explain the code and the reasoning clearly.";
    case "debug":
      return "You are in DEBUG mode. Identify likely bugs and provide corrected code if needed.";
    default:
      return "You are in CHAT mode. Provide concise coding help and suggestions.";
  }
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

function buildCurrentFileContext() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return "No file is currently open.";
  }

  const language = getLanguageForPath(activeTab.path);
  const cursor = getCursorPosition();
  const selection = state.editor ? state.editor.getSelection() : null;
  let selectedText = "";

  if (selection && !selection.isEmpty()) {
    selectedText = state.editor.getModel().getValueInRange(selection);
  }

  const content = activeTab.content.length > 12000
    ? `${activeTab.content.slice(0, 12000)}\n...[truncated]`
    : activeTab.content;

  const contextParts = [
    buildFileTreeContext(),
    "",
    `Current file: ${activeTab.path}`,
    `Language: ${language}`,
    `Cursor position: Line ${cursor.line}, Column ${cursor.column}`
  ];

  if (selectedText) {
    contextParts.push(
      "Selected text:",
      "```",
      selectedText,
      "```"
    );
  }

  contextParts.push(
    "File content:",
    `\`\`\`${language}`,
    content,
    "```"
  );

  return contextParts.join("\n");
}

function buildSystemPrompt() {
  return "You are Nova IDE's coding agent. Be precise, practical, and produce production-quality code changes.";
}

async function handleSendToAgent() {
  const prompt = els.agentInput.value.trim();
  if (!prompt) {
    return;
  }

  addChatMessage("user", prompt);
  els.agentInput.value = "";

  if (state.mode === "edit") {
    if (state.currentConversationId) {
      try {
        await window.novaAPI.chat.addMessage(state.currentConversationId, "user", prompt, "Valkyrie");
        state.conversations = await window.novaAPI.chat.getConversations();
        renderConversationList();
      } catch (dbError) {
        console.error("Failed to save user message to database:", dbError);
      }
    }

    setAgentBusy(true);
    createValkyrieCard(prompt);

    const activeTab = getActiveTab();
    const activeFilePath = activeTab ? activeTab.path : null;
    
    // Capture initial state for side-by-side diffing and rollback capability
    valkyrieSession.activeFilePath = activeFilePath;
    valkyrieSession.originalContent = activeTab ? activeTab.content : "";
    
    const apiKeys = {
      openrouter: els.openRouterKeyInput.value.trim(),
      groq: els.groqKeyInput ? els.groqKeyInput.value.trim() : ""
    };

    try {
      
      const results = await window.novaAPI.valkyrie.execute(
        state.currentConversationId,
        prompt,
        activeFilePath,
        apiKeys
      );

      if (results && results.length > 0) {
        const summary = `⚡ Valkyrie multi-agent completed execution:\n` + 
          results.map(r => `- ${r.task.description} in \`${r.filePath}\``).join("\n");
          
        addChatMessage("assistant", summary);
        
        if (state.currentConversationId) {
          await window.novaAPI.chat.addMessage(state.currentConversationId, "assistant", summary, "Valkyrie");
          state.conversations = await window.novaAPI.chat.getConversations();
          renderConversationList();
        }
      }
    } catch (error) {
      updateActiveValkyrieCard('error', error.message);
      addChatMessage("system", `Valkyrie failed: ${error.message}`);
    } finally {
      setAgentBusy(false);
    }
    return;
  }

  setAgentBusy(true);

  // Save user message to database immediately
  if (state.currentConversationId) {
    try {
      await window.novaAPI.chat.addMessage(state.currentConversationId, "user", prompt, MODEL_CONFIG[state.modelKey].label);
      // Reload conversations list to update timestamp
      state.conversations = await window.novaAPI.chat.getConversations();
      renderConversationList();
    } catch (dbError) {
      console.error("Failed to save user message to database:", dbError);
    }
  }

  const composedPrompt = [
    buildModeInstruction(),
    "",
    buildCurrentFileContext(),
    "",
    "User request:",
    prompt
  ].join("\n");

  state.apiMessages.push({
    role: "user",
    content: composedPrompt
  });

  try {
    const apiMessages = [
      { role: "system", content: buildSystemPrompt() },
      ...state.apiMessages.slice(-18)
    ];

    const response = state.provider === "openrouter"
      ? await callOpenRouter(apiMessages)
      : await callPollinations(apiMessages);

    state.apiMessages.push({
      role: "assistant",
      content: response
    });

    addChatMessage("assistant", response);
    state.pendingApplyContent = extractCodeFromResponse(response);
    updateApplyButtonState();

    // Save assistant message to database
    if (state.currentConversationId) {
      try {
        await window.novaAPI.chat.addMessage(state.currentConversationId, "assistant", response, MODEL_CONFIG[state.modelKey].label);
        // Reload conversations list to update timestamp
        state.conversations = await window.novaAPI.chat.getConversations();
        renderConversationList();
      } catch (dbError) {
        console.error("Failed to save assistant message to database:", dbError);
      }
    }
  } catch (error) {
    addChatMessage("system", `Agent request failed: ${error.message}`);
  } finally {
    setAgentBusy(false);
  }
}


async function callPollinations(messages) {
  // Anonymous pollinations text API only supports 'openai-fast' (aliased as 'openai')
  const model = "openai"; 
  const response = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages,
      model,
      seed: 42
    })
  });

  if (!response.ok) {
    throw new Error(`Pollinations error (${response.status})`);
  }

  const text = await response.text();
  return text.trim();
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
  const fencedMatch = text.match(/```(?:[\w.+-]+)?\n([\s\S]*?)```/);
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
  
  if (settings.theme) {
    els.themeSelect.value = settings.theme;
    applyTheme(settings.theme);
  }
  
  if (settings.fontSize) {
    els.fontSizeSelect.value = settings.fontSize;
    applyFontSize(settings.fontSize);
  }
  
  if (settings.panelWidth) {
    els.panelWidthSelect.value = settings.panelWidth;
    applyPanelWidth(settings.panelWidth);
  }
}

function saveSettings() {
  const settings = {
    theme: els.themeSelect.value,
    fontSize: els.fontSizeSelect.value,
    panelWidth: els.panelWidthSelect.value
  };
  
  localStorage.setItem("novaSettings", JSON.stringify(settings));
  
  applyTheme(settings.theme);
  applyFontSize(settings.fontSize);
  applyPanelWidth(settings.panelWidth);
  
  els.settingsModal.classList.add("hidden");
  addChatMessage("system", "Settings saved successfully.");
}

function applyTheme(theme) {
  if (state.editor) {
    monaco.editor.setTheme(theme);
  }
}

function applyFontSize(fontSize) {
  if (state.editor) {
    state.editor.updateOptions({ fontSize: parseInt(fontSize) });
  }
}

function applyPanelWidth(panelWidth) {
  const width = parseInt(panelWidth);
  document.querySelector(".ide-grid").style.gridTemplateColumns = `${width}px 1fr ${width}px`;
}

// --- Valkyrie Agent Harness UI Management ---
let activeValkyrieCard = null;
let valkyrieThoughtBuffer = "";
let valkyrieDiffBuffer = "";

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
    <div class="valkyrie-thought-section closed">
      <div class="thought-title">▶ Thought Logs (DeepSeek R1)</div>
      <div class="thought-content"></div>
    </div>
    <div class="valkyrie-plan-section hidden">
      <div class="section-title">📋 Execution Plan</div>
      <ul class="plan-list"></ul>
    </div>
    <div class="valkyrie-diff-section hidden">
      <div class="section-title">🔍 Surgical Diffs</div>
      <div class="diff-content"></div>
    </div>
    <div class="valkyrie-status-bar">
      <span class="status-dot pulsing"></span>
      <span class="status-text">Orchestrator preparing...</span>
    </div>
  `;
  
  // Thought toggle
  const thoughtTitle = card.querySelector(".thought-title");
  const thoughtSection = card.querySelector(".valkyrie-thought-section");
  thoughtTitle.addEventListener("click", () => {
    const isClosed = thoughtSection.classList.toggle("closed");
    thoughtTitle.textContent = isClosed ? "▶ Thought Logs (DeepSeek R1)" : "▼ Thought Logs (DeepSeek R1)";
  });
  
  // Abort button
  const abortBtn = card.querySelector(".abort-btn");
  abortBtn.addEventListener("click", async () => {
    abortBtn.disabled = true;
    abortBtn.textContent = "Aborting...";
    await window.novaAPI.valkyrie.abort();
  });
  
  els.chatMessages.appendChild(card);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  
  activeValkyrieCard = card;
}

function updateActiveValkyrieCard(type, data) {
  if (!activeValkyrieCard) return;
  
  if (type === 'thought') {
    const thoughtSection = activeValkyrieCard.querySelector(".valkyrie-thought-section");
    const thoughtContent = activeValkyrieCard.querySelector(".thought-content");
    
    // Automatically open thought section if it's the first chunk
    if (thoughtSection.classList.contains("closed") && valkyrieThoughtBuffer === "") {
      thoughtSection.classList.remove("closed");
      activeValkyrieCard.querySelector(".thought-title").textContent = "▼ Thought Logs (DeepSeek R1)";
    }
    
    valkyrieThoughtBuffer += data;
    thoughtContent.textContent = valkyrieThoughtBuffer;
    thoughtContent.scrollTop = thoughtContent.scrollHeight;
  }
  
  else if (type === 'plan') {
    const planSection = activeValkyrieCard.querySelector(".valkyrie-plan-section");
    const planList = activeValkyrieCard.querySelector(".plan-list");
    planSection.classList.remove("hidden");
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
  }
  
  else if (type === 'diff') {
    const diffSection = activeValkyrieCard.querySelector(".valkyrie-diff-section");
    const diffContent = activeValkyrieCard.querySelector(".diff-content");
    diffSection.classList.remove("hidden");
    
    valkyrieDiffBuffer += data;
    diffContent.textContent = valkyrieDiffBuffer;
    diffContent.scrollTop = diffContent.scrollHeight;
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
  }
  
  else if (type === 'status') {
    const statusBarText = activeValkyrieCard.querySelector(".status-text");
    statusBarText.textContent = data;
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
    
    // Trigger updates
    refreshWorkspaceTree();
    
    // Reload active file in editor as a side-by-side interactive Diff Review
    const activeTab = getActiveTab();
    if (activeTab) {
      window.novaAPI.readFile(activeTab.path).then(newContent => {
        showDiffEditor(valkyrieSession.originalContent, newContent, activeTab.path);
        
        // Update standard active tab content in memory
        activeTab.content = newContent;
        activeTab.dirty = false;
        renderTabs();
      });
    }
  }
  
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

// --- Diff Editor State & Management ---
let valkyrieSession = {
  activeFilePath: null,
  originalContent: ""
};

function showDiffEditor(originalCode, modifiedCode, filePath) {
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

  const language = getLanguageForPath(filePath);
  const originalModel = monaco.editor.createModel(originalCode, language);
  const modifiedModel = monaco.editor.createModel(modifiedCode, language);

  state.diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel
  });

  els.monacoEditorContainer.classList.add("hidden");
  els.monacoDiffContainer.classList.remove("hidden");
  els.diffControlBar.classList.remove("hidden");
}

function hideDiffEditor() {
  els.monacoDiffContainer.classList.add("hidden");
  els.monacoEditorContainer.classList.remove("hidden");
  els.diffControlBar.classList.add("hidden");

  // Load the new accepted content back into the main Monaco editor
  const activeTab = getActiveTab();
  if (activeTab) {
    setEditorContent(activeTab.content, activeTab.path);
  }

  if (state.diffEditor) {
    const models = state.diffEditor.getModel();
    if (models) {
      if (models.original) models.original.dispose();
      if (models.modified) models.modified.dispose();
    }
  }
}

function getLanguageForPath(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  return LANGUAGE_BY_EXT[ext] || "plaintext";
}
