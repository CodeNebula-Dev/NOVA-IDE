/**
 * renderer/agent-panel-manager.js
 * 
 * Manages the sticky agent panel at the top of the IDE
 * Handles input, sending prompts, status updates, and agent badges
 * 
 * This is the primary interface for users to interact with the Valkyrie orchestrator
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
      isStreaming: false,
      currentPrompt: '',
      contextualSelection: null
    };

    this.messageListeners = [];
    this.init();
  }

  /**
   * Initialize the agent panel manager
   * Setup event listeners and initial UI state
   */
  init() {
    this.validateElements();
    this.bindEvents();
    this.setStatus('ready');
    this.updateActiveFileCount(state.tabs?.length || 0);
    console.log('✅ AgentPanelManager initialized');
  }

  /**
   * Validate that all required DOM elements exist
   */
  validateElements() {
    const required = ['promptInput', 'sendBtn', 'statusDot', 'statusText'];
    for (const key of required) {
      if (!this.elements[key]) {
        console.warn(`⚠️  AgentPanelManager: Element "${key}" not found in DOM`);
      }
    }
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    // Send button click
    this.elements.sendBtn?.addEventListener('click', () => this.sendPrompt());

    // Cmd+Enter or Ctrl+Enter to send
    this.elements.promptInput?.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        this.sendPrompt();
      }

      // Tab to next element (but allow indentation in prompt)
      if (e.key === 'Tab') {
        e.preventDefault();
        this.elements.promptInput.value += '\t';
      }
    });

    // Context button
    this.elements.contextBtn?.addEventListener('click', () => this.addContextToPrompt());

    // History button
    this.elements.historyBtn?.addEventListener('click', () => this.toggleChatHistory());

    // Badge clicks for agent selection
    this.elements.badges?.forEach(badge => {
      badge.addEventListener('click', () => {
        const role = badge.dataset.role;
        this.selectAgent(role);
      });
    });
  }

  /**
   * Main handler: Send prompt to Valkyrie orchestrator
   */
  async sendPrompt() {
    const prompt = this.elements.promptInput.value.trim();
    if (!prompt) {
      console.warn('⚠️  Empty prompt submitted');
      return;
    }

    // Store original prompt
    this.state.currentPrompt = prompt;

    // Clear input and disable
    this.elements.promptInput.value = '';
    this.elements.sendBtn.disabled = true;

    // Update UI state
    this.setStatus('active');

    try {
      console.log('📨 Sending prompt to Valkyrie:', prompt.substring(0, 50) + '...');

      // Collect context
      const context = await this.collectContext();

      // Send to main process Valkyrie engine
      const result = await window.novaAPI.valkyrie.execute({
        prompt,
        context,
        workspace: state.workspaceRoot,
        selectedAgent: this.state.activeAgent
      });

      console.log('✅ Valkyrie result received:', result);

      // Handle the response (show diffs, update chat, etc.)
      await this.handleValkyrieResult(result);

    } catch (error) {
      console.error('❌ Valkyrie execution failed:', error);
      this.setStatus('error');
      addChatMessage('system', `Error: ${error.message}`);
    } finally {
      this.elements.sendBtn.disabled = false;
      this.setStatus('ready');
    }
  }

  /**
   * Collect contextual information for the prompt
   * Includes active file, selection, file tree, etc.
   */
  async collectContext() {
    const context = {
      activeFile: state.activePath,
      activeFileContent: state.editor?.getValue?.() || '',
      selection: state.editor?.getSelectedText?.() || '',
      cursorPosition: state.editor?.getPosition?.() || { lineNumber: 1, column: 1 },
      openTabs: state.tabs?.map(t => ({
        path: t.path,
        isDirty: t.isDirty,
        language: LANGUAGE_BY_EXT[t.path?.split('.')?.pop()] || 'plaintext'
      })) || [],
      workspaceRoot: state.workspaceRoot,
      timestamp: new Date().toISOString()
    };

    return context;
  }

  /**
   * Handle Valkyrie orchestrator result
   * This includes planned tasks, proposed diffs, and review results
   */
  async handleValkyrieResult(result) {
    const { plan, diffs, reviewResult, error } = result;

    if (error) {
      addChatMessage('assistant', `❌ Valkyrie error: ${error}`);
      return;
    }

    // Show planning phase
    if (plan) {
      console.log('📋 Showing plan:', plan);
      addChatMessage('assistant', `📝 Plan:\n\n${plan.tasks?.map(t => `• ${t}`).join('\n') || plan}`);
    }

    // Show diffs in editor
    if (diffs && Object.keys(diffs).length > 0) {
      console.log('🔄 Showing diffs for', Object.keys(diffs).length, 'files');
      
      // Create or get diff manager
      if (!window.diffManager) {
        window.diffManager = new DiffManager();
      }

      // Show the diff view
      await window.diffManager.show(diffs);

      // Show review status
      if (reviewResult) {
        if (reviewResult.approved) {
          addChatMessage('assistant', `✅ Review passed! Ready to apply changes.`);
        } else {
          addChatMessage('assistant', `⚠️  Review feedback:\n\n${reviewResult.feedback}`);
        }
      }
    }

    // Show in chat
    addChatMessage('assistant', result.summary || 'Done!');
  }

  /**
   * Add selected text from editor to the prompt
   */
  addContextToPrompt() {
    const selection = state.editor?.getSelectedText?.();
    if (selection) {
      const currentPrompt = this.elements.promptInput.value;
      const separator = currentPrompt ? '\n\n' : '';
      const contextBlock = `\`\`\`\n${selection}\n\`\`\``;
      this.elements.promptInput.value = currentPrompt + separator + contextBlock;
      this.elements.promptInput.focus();
      console.log('✅ Context added to prompt:', selection.substring(0, 30) + '...');
    } else {
      console.warn('⚠️  No selection to add');
    }
  }

  /**
   * Toggle the chat history panel visibility
   */
  toggleChatHistory() {
    document.dispatchEvent(new CustomEvent('toggle-chat-history'));
    console.log('📋 Toggling chat history panel');
  }

  /**
   * Select a specific agent role
   * This allows users to route prompts to specific agents if desired
   */
  selectAgent(role) {
    this.state.activeAgent = role;
    this.syncBadges();
    console.log(`🎯 Selected agent: ${role}`);
  }

  /**
   * Update the status indicator and text
   */
  setStatus(status) {
    this.state.status = status;
    
    if (this.elements.statusDot) {
      this.elements.statusDot.className = `status-dot ${status}`;
    }

    if (this.elements.statusText) {
      const statusLabels = {
        'ready': 'Ready',
        'active': 'Processing...',
        'thinking': 'Thinking...',
        'error': 'Error'
      };
      this.elements.statusText.textContent = statusLabels[status] || status;
    }
  }

  /**
   * Sync badge UI with selected agent
   */
  syncBadges() {
    this.elements.badges?.forEach(badge => {
      const role = badge.dataset.role;
      if (role === this.state.activeAgent) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    });
  }

  /**
   * Update the active file counter
   */
  updateActiveFileCount(count) {
    if (this.elements.fileCount) {
      this.elements.fileCount.textContent = `📂 ${count} file${count !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Set streaming status for real-time updates
   */
  setStreaming(isStreaming) {
    this.state.isStreaming = isStreaming;
    this.elements.sendBtn.disabled = isStreaming;
    this.elements.promptInput.disabled = isStreaming;
  }

  /**
   * Add a listener for custom messages
   */
  onMessage(callback) {
    this.messageListeners.push(callback);
  }

  /**
   * Emit a custom message to all listeners
   */
  emit(eventType, data) {
    this.messageListeners.forEach(cb => cb({ eventType, data }));
  }

  /**
   * Cleanup and teardown
   */
  destroy() {
    this.messageListeners = [];
    console.log('🗑️  AgentPanelManager destroyed');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.agentPanelManager) {
      window.agentPanelManager = new AgentPanelManager();
    }
  });
} else {
  if (!window.agentPanelManager) {
    window.agentPanelManager = new AgentPanelManager();
  }
}
