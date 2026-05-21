/**
 * renderer/agent-panel-manager.js
 * 
 * Lightweight UI manager for the AI Agent panel.
 * Designed to prevent double event listener registration with app.js.
 */

class AgentPanelManager {
  constructor() {
    this.elements = {
      panel: document.getElementById('aiPanel'),
      badges: document.querySelectorAll('.agent-badge'),
      statusDot: document.getElementById('agentStatusDot'),
      statusText: document.getElementById('agentStatusText'),
      fileCount: document.getElementById('activeFilesCount'),
      sidebarStatusDot: document.getElementById('sidebarAgentStatusDot'),
      sidebarStatusText: document.getElementById('sidebarAgentStatusText')
    };
    this.init();
  }

  init() {
    console.log('✅ AgentPanelManager initialized (Passive Mode)');
  }

  /**
   * Update the status display in both main and sidebar indicators
   */
  setStatus(status, text) {
    const statusClass = status === 'active' ? 'thinking' : status;
    
    // Update main status
    if (this.elements.statusDot) {
      this.elements.statusDot.className = `status-dot ${statusClass}`;
    }
    if (this.elements.statusText) {
      this.elements.statusText.textContent = text || status;
    }

    // Update sidebar status
    if (this.elements.sidebarStatusDot) {
      this.elements.sidebarStatusDot.className = `status-dot ${statusClass}`;
    }
    if (this.elements.sidebarStatusText) {
      this.elements.sidebarStatusText.textContent = text || status;
    }
  }

  /**
   * Update badges UI based on active role
   */
  setActiveBadge(role) {
    this.elements.badges?.forEach(badge => {
      const isActive = badge.dataset.role === role;
      badge.classList.toggle('active', isActive);
      badge.classList.toggle('inactive', !isActive);
    });
  }

  updateActiveFileCount(count) {
    if (this.elements.fileCount) {
      this.elements.fileCount.textContent = `📂 ${count} file${count !== 1 ? 's' : ''}`;
    }
  }
}

// Initialize on DOM load if element exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('aiPanel')) {
    window.agentPanelManager = new AgentPanelManager();
  }
});
