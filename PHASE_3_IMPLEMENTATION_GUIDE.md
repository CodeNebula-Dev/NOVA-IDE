# 🚀 Phase 3 Implementation Guide - Step by Step

This document provides the detailed implementation steps to move from Phase 1/2 to Phase 3 with the new UI/UX.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [UI Components to Build](#ui-components-to-build)
3. [New JavaScript Modules](#new-javascript-modules)
4. [Integration Checklist](#integration-checklist)
5. [Testing Strategy](#testing-strategy)
6. [Rollout Plan](#rollout-plan)

---

## Architecture Overview

### Current State (Phase 1/2)
```
┌─────────────────────────────────┐
│    Topbar (52px)                │
├─────────────────────────────────┤
│ Grid: Left (280px) | Center | Right (370px) │
│  File Tree | Monaco Editor | AI Chat Panel   │
├─────────────────────────────────┤
│ Terminal (hidden by default)    │
└─────────────────────────────────┘
```

### Target State (Phase 3)
```
┌─────────────────────────────────────────────────┐
│    Topbar (52px) - File & Workspace Controls    │
├─────────────────────────────────────────────────┤
│ Sticky Agent Panel (64px)                       │
│ [Planner][Coder][Reviewer][Fast]  Status Ready  │
│ [Type prompt...] [⚡Send][+Context][History]    │
├─────────────────────────────────────────────────┤
│ Grid: Left (280px) | Center                    │
│  File Tree      | Monaco + Diff View           │
│                 | (Overlay mode when active)   │
├─────────────────────────────────────────────────┤
│ Terminal (toggle with ⌘T)                      │
├─────────────────────────────────────────────────┤
│ Chat History (Collapsible Panel - Right)       │
└─────────────────────────────────────────────────┘
```

---

## UI Components to Build

### 1. **Sticky Agent Panel** (`agent-panel-sticky`)

**Location:** Between topbar and main grid

**Elements:**
- Agent status badges (Planner, Coder, Reviewer, Fast)
- Status dot (Ready/Active/Error)
- Active files counter
- Prompt input field
- Send button
- Context button
- History button

**State Variables:**
```javascript
state.agentPanel = {
  isOpen: true,
  activeAgent: null,      // 'planner', 'coder', 'reviewer', 'fast', or null
  status: 'ready',         // 'ready', 'active', 'thinking', 'error'
  activeFileCount: 0,
  currentPrompt: '',
  isStreaming: false
};
```

### 2. **Diff Viewer Panel**

**Location:** Overlays Monaco editor when diff is available

**Elements:**
- File list sidebar (left)
- Diff editor (right, Monaco diff view)
- Control bar (Accept/Reject buttons)
- Hunk review buttons

**State Variables:**
```javascript
state.diffView = {
  isOpen: false,
  currentFile: null,
  originalContent: '',
  proposedContent: '',
  hunks: [],              // Array of {startLine, endLine, type, content}
  acceptedHunks: new Set(),
  rejectedHunks: new Set(),
  selectedHunkIndex: 0
};
```

### 3. **Chat History Panel** (Collapsible)

**Location:** Right side, slides in from edge

**Elements:**
- Header (title + close button)
- Scrollable list of chat messages
- Load older conversations option

**State Variables:**
```javascript
state.chatHistory = {
  isOpen: false,
  messages: [],          // Array of {id, role, content, timestamp}
  selectedConvId: null,
  isLoading: false
};
```

---

## New JavaScript Modules

### 1. **`renderer/agent-panel-manager.js`** (NEW)

```javascript
/**
 * Manages the sticky agent panel at the top of the IDE
 * Handles input, sending prompts, status updates, and agent badges
 */
class AgentPanelManager {
  constructor() {
    this.elements = {
      panel: document.querySelector('.agent-panel-sticky'),
      statusBar: document.querySelector('.agent-status-bar'),
      badges: document.querySelectorAll('.agent-badge'),
      promptInput: document.getElementById('agentPromptInput'),
      sendBtn: document.getElementById('sendAgentPromptBtn'),
      contextBtn: document.getElementById('addContextBtn'),
      historyBtn: document.getElementById('toggleChatHistoryBtn'),
      statusDot: document.getElementById('agentStatusDot'),
      statusText: document.getElementById('agentStatusText'),
      fileCount: document.getElementById('activeFilesCount')
    };

    this.state = {
      activeAgent: null,
      status: 'ready',
      isStreaming: false
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.syncProviderUI();
  }

  bindEvents() {
    // Send button
    this.elements.sendBtn.addEventListener('click', () => this.sendPrompt());

    // Cmd+Enter to send
    this.elements.promptInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        this.sendPrompt();
      }
    });

    // Context button
    this.elements.contextBtn.addEventListener('click', () => this.addContextToPrompt());

    // History button
    this.elements.historyBtn.addEventListener('click', () => this.toggleChatHistory());

    // Badge clicks for agent selection
    this.elements.badges.forEach(badge => {
      badge.addEventListener('click', () => {
        const role = badge.dataset.role;
        this.selectAgent(role);
      });
    });
  }

  async sendPrompt() {
    const prompt = this.elements.promptInput.value.trim();
    if (!prompt) return;

    // Clear input
    this.elements.promptInput.value = '';

    // Mark as streaming
    this.setStatus('active');
    this.elements.sendBtn.disabled = true;

    try {
      // Get active file context
      const context = await window.novaAPI.getActiveFileContext();

      // Send to Valkyrie engine
      const result = await window.novaAPI.valkyrie.execute({
        prompt,
        context,
        workspace: state.workspaceRoot
      });

      // Handle result (show diff, etc)
      await this.handleValkyrieResult(result);
    } catch (error) {
      this.setStatus('error');
      console.error('Valkyrie execution failed:', error);
    } finally {
      this.elements.sendBtn.disabled = false;
      this.setStatus('ready');
    }
  }

  async handleValkyrieResult(result) {
    // Show diff in editor
    // Update chat history
    // Show review panel
    // etc.
  }

  addContextToPrompt() {
    // Get current selection from Monaco editor
    const selection = state.editor?.getSelectedText?.();
    if (selection) {
      this.elements.promptInput.value += `\n\`\`\`\n${selection}\n\`\`\``;
      this.elements.promptInput.focus();
    }
  }

  toggleChatHistory() {
    // Emit event to open/close chat history panel
    document.dispatchEvent(new CustomEvent('toggle-chat-history'));
  }

  selectAgent(role) {
    this.state.activeAgent = role;
    this.syncBadges();
  }

  setStatus(status) {
    this.state.status = status;
    this.elements.statusDot.className = `status-dot ${status}`;
    this.elements.statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }

  syncBadges() {
    this.elements.badges.forEach(badge => {
      const role = badge.dataset.role;
      if (role === this.state.activeAgent) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    });
  }

  syncProviderUI() {
    // Show provider info, rate limits, etc.
  }

  updateActiveFileCount(count) {
    this.elements.fileCount.textContent = `📂 ${count} file${count !== 1 ? 's' : ''}`;
  }
}
```

### 2. **`renderer/diff-manager.js`** (NEW)

```javascript
/**
 * Manages the diff viewer panel
 * Shows differences between original and proposed code
 * Allows hunk-by-hunk acceptance/rejection
 */
class DiffManager {
  constructor() {
    this.elements = {
      controlBar: document.getElementById('diffControlBar'),
      container: document.getElementById('diffViewerWrapper'),
      monacoContainer: document.getElementById('monacoDiffContainer'),
      fileList: document.getElementById('diffFileList'),
      acceptBtn: document.getElementById('acceptDiffBtn'),
      rejectBtn: document.getElementById('rejectDiffBtn')
    };

    this.state = {
      isOpen: false,
      files: {},           // {filePath: {original, proposed}}
      currentFile: null,
      diffEditor: null,
      hunks: []
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    this.elements.acceptBtn?.addEventListener('click', () => this.acceptAllChanges());
    this.elements.rejectBtn?.addEventListener('click', () => this.rejectChanges());
  }

  async show(filesWithDiffs) {
    // filesWithDiffs = {
    //   'src/db.js': { original: '...', proposed: '...' },
    //   'src/pool.js': { original: '...', proposed: '...' }
    // }

    this.state.files = filesWithDiffs;
    this.state.isOpen = true;

    // Show control bar
    this.elements.controlBar.classList.remove('hidden');
    this.elements.container.classList.remove('hidden');

    // Populate file list
    this.renderFileList();

    // Show first file
    const firstFile = Object.keys(filesWithDiffs)[0];
    await this.selectFile(firstFile);
  }

  renderFileList() {
    this.elements.fileList.innerHTML = '';
    Object.keys(this.state.files).forEach(filePath => {
      const li = document.createElement('li');
      li.className = 'diff-file-item';
      li.textContent = filePath.split('/').pop();
      li.title = filePath;
      li.addEventListener('click', () => this.selectFile(filePath));
      this.elements.fileList.appendChild(li);
    });
  }

  async selectFile(filePath) {
    this.state.currentFile = filePath;
    const { original, proposed } = this.state.files[filePath];

    // Create Monaco diff editor
    if (!this.state.diffEditor) {
      this.state.diffEditor = monaco.editor.createDiffEditor(this.elements.monacoContainer, {
        enableSplitViewResizing: true,
        renderSideBySide: true,
        theme: 'vs-dark',
        automaticLayout: true,
        readOnly: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", monospace'
      });
    }

    // Set models
    const originalModel = monaco.editor.createModel(original, this.getLanguageFromPath(filePath));
    const proposedModel = monaco.editor.createModel(proposed, this.getLanguageFromPath(filePath));

    this.state.diffEditor.setModel({
      original: originalModel,
      modified: proposedModel
    });

    // Parse and display hunks
    this.parseHunks(original, proposed);
  }

  parseHunks(original, proposed) {
    // Simple line-by-line diff
    const originalLines = original.split('\n');
    const proposedLines = proposed.split('\n');

    // Use a simple diff algorithm (could use diff-match-patch for better results)
    const hunks = [];
    let i = 0, j = 0;

    while (i < originalLines.length || j < proposedLines.length) {
      if (originalLines[i] === proposedLines[j]) {
        i++;
        j++;
      } else {
        const hunk = {
          type: 'changed',
          originalStart: i,
          originalEnd: i + 1,
          proposedStart: j,
          proposedEnd: j + 1
        };
        hunks.push(hunk);
        i++;
        j++;
      }
    }

    this.state.hunks = hunks;
  }

  getLanguageFromPath(filePath) {
    const ext = filePath.split('.').pop();
    return LANGUAGE_BY_EXT[ext] || 'plaintext';
  }

  async acceptAllChanges() {
    const filePath = this.state.currentFile;
    const { proposed } = this.state.files[filePath];

    // Apply to editor
    await this.applyChangesToFile(filePath, proposed);

    // Close diff view
    this.hide();

    // Show success message
    addChatMessage('system', `✅ Changes applied to ${filePath.split('/').pop()}`);
  }

  async applyChangesToFile(filePath, content) {
    // Find matching tab in editor and update
    const tab = state.tabs.find(t => t.path === filePath);
    if (tab) {
      // Update tab content via IPC
      await window.novaAPI.writeFile(filePath, content);

      // Update Monaco editor
      if (state.activePath === filePath) {
        const model = state.editor.getModel();
        model.setValue(content);
      }

      // Mark file as dirty
      tab.isDirty = true;
      renderTabs();
    }
  }

  rejectChanges() {
    this.hide();
    addChatMessage('system', '❌ Changes rejected');
  }

  hide() {
    this.state.isOpen = false;
    this.elements.controlBar.classList.add('hidden');
    this.elements.container.classList.add('hidden');

    if (this.state.diffEditor) {
      this.state.diffEditor.dispose();
      this.state.diffEditor = null;
    }
  }
}
```

### 3. **`renderer/chat-history-panel.js`** (NEW)

```javascript
/**
 * Manages the collapsible chat history panel on the right
 */
class ChatHistoryPanel {
  constructor() {
    this.elements = {
      panel: document.getElementById('chatHistoryPanel'),
      header: document.querySelector('.chat-history-header'),
      content: document.querySelector('.chat-history-content'),
      closeBtn: document.querySelector('.chat-history-close')
    };

    this.state = {
      isOpen: false,
      messages: [],
      selectedConvId: null
    };

    this.init();
  }

  init() {
    this.bindEvents();
    document.addEventListener('toggle-chat-history', () => this.toggleOpen());
  }

  bindEvents() {
    this.elements.closeBtn?.addEventListener('click', () => this.close());
  }

  toggleOpen() {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.state.isOpen = true;
    this.elements.panel?.classList.add('open');
    this.render();
  }

  close() {
    this.state.isOpen = false;
    this.elements.panel?.classList.remove('open');
  }

  render() {
    // Render chat messages
    this.elements.content.innerHTML = '';

    state.chatMessages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `chat-message-item ${msg.role}`;
      div.textContent = msg.content.substring(0, 60) + '...';
      div.addEventListener('click', () => this.loadMessage(msg.id));
      this.elements.content.appendChild(div);
    });
  }

  loadMessage(messageId) {
    // Load message and show in editor/diff view
  }
}
```

### 4. **`renderer/provider-detector.js`** (NEW)

```javascript
/**
 * Detects available free-tier LLM providers
 * Selects best provider based on availability and rate limits
 */
class ProviderDetector {
  static async detectAvailable() {
    const available = {
      planner: null,
      coder: null,
      reviewer: null,
      fast: null
    };

    // Try Pollinations first (no auth)
    if (await this.isPollinations Available()) {
      available.planner = 'pollinations';
      available.coder = 'pollinations';
      available.reviewer = 'pollinations';
      available.fast = 'pollinations';
    }

    // Try OpenRouter free tier
    if (await this.isOpenRouterAvailable()) {
      available.planner = 'openrouter';
      available.coder = 'openrouter';
    }

    // Try Groq
    if (await this.isGroqAvailable()) {
      available.reviewer = 'groq';
    }

    // Try Google AI Studio
    if (await this.isGoogleStudioAvailable()) {
      available.fast = 'google';
    }

    // Try local Ollama as fallback
    if (await this.isOllamaAvailable()) {
      if (!available.planner) available.planner = 'ollama';
      if (!available.coder) available.coder = 'ollama';
      if (!available.reviewer) available.reviewer = 'ollama';
      if (!available.fast) available.fast = 'ollama';
    }

    return available;
  }

  static async isPollinationsAvailable() {
    try {
      const response = await fetch('https://api.pollinations.ai/health', { timeout: 3000 });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isOpenRouterAvailable() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        timeout: 3000,
        headers: { 'HTTP-Referer': 'https://nova-ide.local' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isGroqAvailable() {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        timeout: 3000,
        headers: { 'Authorization': 'Bearer test' }
      });
      return response.status === 401; // Auth required, but API is up
    } catch {
      return false;
    }
  }

  static async isGoogleStudioAvailable() {
    try {
      // Google AI Studio doesn't require auth for basic health check
      return true;
    } catch {
      return false;
    }
  }

  static async isOllamaAvailable() {
    try {
      const response = await fetch('http://localhost:11434/api/tags', { timeout: 1000 });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## Integration Checklist

### Phase 3A: UI Refactor (Week 1)

- [ ] Update `renderer/index.html` structure
  - [ ] Remove right sidebar AI controls
  - [ ] Add sticky agent panel HTML
  - [ ] Add diff viewer container
  - [ ] Add chat history panel

- [ ] Update `renderer/styles.css`
  - [ ] New agent panel sticky styles
  - [ ] Diff viewer styles
  - [ ] Chat history panel styles
  - [ ] Update grid layout (remove right column)

- [ ] Create `renderer/agent-panel-manager.js`
  - [ ] Prompt input handling
  - [ ] Send button logic
  - [ ] Agent badge selection
  - [ ] Status updates

- [ ] Create `renderer/diff-manager.js`
  - [ ] Monaco diff editor creation
  - [ ] File list rendering
  - [ ] Hunk parsing
  - [ ] Accept/reject logic

### Phase 3B: Provider Integration (Week 2)

- [ ] Create `renderer/provider-detector.js`
  - [ ] Detect available APIs
  - [ ] Test connectivity
  - [ ] Select best provider per role

- [ ] Update `main/agents/valkyrie.js`
  - [ ] Integrate provider detection
  - [ ] Handle free tier rate limits
  - [ ] Implement fallback chain

- [ ] Create `main/agents/provider-manager.js`
  - [ ] API orchestration
  - [ ] Rate limit tracking
  - [ ] Retry logic

### Phase 3C: Agent Orchestration (Week 3)

- [ ] Create `main/agents/planner.js` (DeepSeek R1)
- [ ] Create `main/agents/coder.js` (Qwen3-Coder)
- [ ] Create `main/agents/reviewer.js` (Llama 3.3)
- [ ] Create `main/agents/fast-inline.js` (Gemini Flash)

### Phase 3D: End-to-End Integration (Week 4)

- [ ] Wire AgentPanelManager → Valkyrie engine
- [ ] Wire Valkyrie → DiffManager display
- [ ] Add streaming updates to UI
- [ ] Test multi-agent orchestration
- [ ] Performance optimization

---

## Testing Strategy

### Unit Tests

```javascript
// test/agent-panel-manager.test.js
describe('AgentPanelManager', () => {
  test('sendPrompt() collects context and calls Valkyrie', async () => {
    const manager = new AgentPanelManager();
    manager.elements.promptInput.value = 'Refactor this function';
    await manager.sendPrompt();
    // Assert: Valkyrie.execute was called
  });

  test('addContextToPrompt() appends selected text', () => {
    // Mock editor selection
    // Call addContextToPrompt()
    // Assert: prompt includes selected text
  });
});

// test/diff-manager.test.js
describe('DiffManager', () => {
  test('show() renders file list and displays first file', async () => {
    const manager = new DiffManager();
    const files = {
      'src/db.js': { original: 'old', proposed: 'new' }
    };
    await manager.show(files);
    // Assert: file list contains 'db.js'
    // Assert: diff editor is visible
  });

  test('acceptAllChanges() applies proposed code to editor', async () => {
    // Mock Monaco editor
    // Call acceptAllChanges()
    // Assert: File tab marked as dirty
  });
});

// test/provider-detector.test.js
describe('ProviderDetector', () => {
  test('detectAvailable() returns available providers', async () => {
    const available = await ProviderDetector.detectAvailable();
    // Assert: available has planner, coder, reviewer, fast
    // Assert: At least one provider is available for each role
  });
});
```

### Integration Tests

```javascript
// test/e2e/full-workflow.test.js
describe('Full Workflow: Prompt → Diff → Accept', () => {
  test('User sends prompt and sees diff', async () => {
    // 1. Type in agent panel
    // 2. Click send
    // 3. Wait for diff to appear
    // 4. Assert: diff view is visible
    // 5. Assert: changes are highlighted
  });

  test('User accepts changes and file is updated', async () => {
    // 1. Show diff
    // 2. Click accept
    // 3. Assert: file tab is dirty
    // 4. Assert: Monaco editor content updated
  });

  test('Fallback to Ollama when APIs unavailable', async () => {
    // Mock network error
    // Call detectAvailable()
    // Assert: Returns ollama as fallback
  });
});
```

---

## Rollout Plan

### Phase 3.0 Launch (Week 1)

**Target:** New UI available, old panels removed

**Changes:**
1. Update HTML structure
2. Update CSS layout
3. Deploy new agent panel manager
4. Hide old right sidebar

**User Impact:** UI looks different, same functionality

### Phase 3.1 Launch (Week 2)

**Target:** Free tier APIs working, no keys required

**Changes:**
1. Add provider detector
2. Auto-select best API
3. Show provider status in agent panel

**User Impact:** Can send prompts without API keys

### Phase 3.2 Launch (Week 3)

**Target:** Live diff viewer working

**Changes:**
1. Deploy diff manager
2. Show diffs in-editor
3. Accept/reject hunk buttons

**User Impact:** Can see changes before applying

### Phase 3.3 Launch (Week 4)

**Target:** Multi-agent orchestration

**Changes:**
1. Deploy planner, coder, reviewer, fast agents
2. Full agent harmony working
3. Rate limit fallbacks active

**User Impact:** Professional-grade multi-agent IDE

---

## Key Files to Create/Modify

| File | Type | Status |
|------|------|--------|
| `PHASE_3_UI_UX_REDESIGN.md` | Doc | ✅ Created |
| `renderer/index.html` | Update | 🔄 In progress |
| `renderer/styles.css` | Update | ✅ Created (new styles) |
| `renderer/agent-panel-manager.js` | New | 📋 Ready to create |
| `renderer/diff-manager.js` | New | 📋 Ready to create |
| `renderer/chat-history-panel.js` | New | 📋 Ready to create |
| `renderer/provider-detector.js` | New | 📋 Ready to create |
| `main/agents/valkyrie.js` | Update | 🔄 In progress |
| `main/agents/provider-manager.js` | New | 📋 Ready to create |
| `main/agents/planner.js` | New | 📋 Ready to create |
| `main/agents/coder.js` | New | 📋 Ready to create |
| `main/agents/reviewer.js` | New | 📋 Ready to create |
| `main/agents/fast-inline.js` | New | 📋 Ready to create |

---

## Next Steps

1. **Review this document** with the team
2. **Start Week 1 tasks** (UI refactor)
3. **Weekly sync-ups** to track progress
4. **User testing** after each phase launch
5. **Gather feedback** and iterate

---

## Questions & Support

- **UI Questions:** Check `PHASE_3_UI_UX_REDESIGN.md`
- **Architecture Questions:** Check `implementation_plan.md`
- **Code Templates:** See individual module sections above
- **Testing Questions:** See testing strategy section

