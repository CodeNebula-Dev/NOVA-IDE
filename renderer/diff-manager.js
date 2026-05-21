/**
 * renderer/diff-manager.js
 * 
 * Manages the diff viewer panel that displays code changes
 * Shows differences between original and proposed code side-by-side
 * Allows hunk-by-hunk acceptance/rejection
 * 
 * This integrates with Monaco Editor's built-in diff viewer
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
      files: {},           // {filePath: {original, proposed, language}}
      currentFile: null,
      diffEditor: null,
      hunks: [],
      selectedHunkIndex: 0,
      acceptedHunks: new Set(),
      rejectedHunks: new Set()
    };

    this.init();
  }

  /**
   * Initialize the diff manager
   */
  init() {
    this.validateElements();
    this.bindEvents();
    console.log('✅ DiffManager initialized');
  }

  /**
   * Validate required DOM elements
   */
  validateElements() {
    const required = ['controlBar', 'container', 'monacoContainer', 'acceptBtn', 'rejectBtn'];
    for (const key of required) {
      if (!this.elements[key]) {
        console.warn(`⚠️  DiffManager: Element "${key}" not found in DOM`);
      }
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.elements.acceptBtn?.addEventListener('click', () => this.acceptAllChanges());
    this.elements.rejectBtn?.addEventListener('click', () => this.rejectChanges());
  }

  /**
   * Show diff viewer with files and changes
   * 
   * @param {Object} filesWithDiffs - { filePath: {original, proposed, language?} }
   * @example
   * await diffManager.show({
   *   'src/db.js': { 
   *     original: 'const pool = new Pool(...)',
   *     proposed: 'const pool = new Pool({...})'
   *   }
   * });
   */
  async show(filesWithDiffs) {
    if (!filesWithDiffs || Object.keys(filesWithDiffs).length === 0) {
      console.warn('⚠️  No diffs to display');
      return;
    }

    console.log('📂 DiffManager.show() - Files:', Object.keys(filesWithDiffs));

    this.state.files = filesWithDiffs;
    this.state.isOpen = true;

    // Show control bar and container
    if (this.elements.controlBar) this.elements.controlBar.classList.remove('hidden');
    if (this.elements.container) this.elements.container.classList.remove('hidden');

    // Populate file list
    this.renderFileList();

    // Show first file by default
    const firstFile = Object.keys(filesWithDiffs)[0];
    await this.selectFile(firstFile);
  }

  /**
   * Render the list of modified files in the sidebar
   */
  renderFileList() {
    if (!this.elements.fileList) return;

    this.elements.fileList.innerHTML = '';

    Object.keys(this.state.files).forEach((filePath, index) => {
      const li = document.createElement('li');
      li.className = 'diff-file-item';
      if (index === 0) li.classList.add('active');

      // File icon
      const icon = this.getIconForFile(filePath);
      const fileName = filePath.split('/').pop();

      li.innerHTML = `
        <span class="icon">${icon}</span>
        <span class="name">${fileName}</span>
        <span class="status">◆</span>
      `;

      li.title = filePath;
      li.addEventListener('click', () => this.selectFile(filePath));

      this.elements.fileList.appendChild(li);
    });

    console.log('✅ File list rendered:', Object.keys(this.state.files).length, 'files');
  }

  /**
   * Select a file to display in the diff editor
   * 
   * @param {string} filePath - Path to file to display
   */
  async selectFile(filePath) {
    if (!this.state.files[filePath]) {
      console.error('❌ File not found in diffs:', filePath);
      return;
    }

    console.log('🔄 Selecting file for diff:', filePath);

    this.state.currentFile = filePath;
    const fileData = this.state.files[filePath];
    const { original, proposed, language } = fileData;

    // Infer language from extension if not provided
    const lang = language || this.getLanguageFromPath(filePath);

    // Create or update Monaco diff editor
    await this.createDiffEditor(original, proposed, lang);

    // Update file list UI
    this.updateFileListUI(filePath);

    // Parse hunks for review
    this.parseHunks(original, proposed);
  }

  /**
   * Create or update the Monaco diff editor
   * 
   * @param {string} original - Original code
   * @param {string} proposed - Proposed code
   * @param {string} language - Language for syntax highlighting
   */
  async createDiffEditor(original, proposed, language = 'plaintext') {
    if (!this.elements.monacoContainer) {
      console.error('❌ Monaco container not found');
      return;
    }

    // Dispose old editor if exists
    if (this.state.diffEditor) {
      this.state.diffEditor.dispose();
    }

    console.log('📝 Creating Monaco diff editor for', language);

    try {
      // Create diff editor
      this.state.diffEditor = monaco.editor.createDiffEditor(
        this.elements.monacoContainer,
        {
          enableSplitViewResizing: true,
          renderSideBySide: true,
          theme: 'vs-dark',
          automaticLayout: true,
          readOnly: true,
          fontSize: 13,
          fontFamily: '"JetBrains Mono", monospace',
          fontLigatures: true,
          lineHeight: 1.5,
          padding: { top: 10, bottom: 10 },
          renderWhitespace: 'selection',
          diffWordWrap: 'off'
        }
      );

      // Dispose existing models to avoid "Model already exists for Uri" error
      const origUri = monaco.Uri.parse('file:///original');
      const propUri = monaco.Uri.parse('file:///proposed');
      
      const existingOrig = monaco.editor.getModel(origUri);
      if (existingOrig) existingOrig.dispose();
      
      const existingProp = monaco.editor.getModel(propUri);
      if (existingProp) existingProp.dispose();

      // Create models for original and proposed code
      const originalModel = monaco.editor.createModel(original, language, origUri);
      const proposedModel = monaco.editor.createModel(proposed, language, propUri);

      // Set models on diff editor
      this.state.diffEditor.setModel({
        original: originalModel,
        modified: proposedModel
      });

      console.log('✅ Diff editor created successfully');

    } catch (error) {
      console.error('❌ Failed to create diff editor:', error);
    }
  }

  /**
   * Parse hunks (lines of changes) for review
   * Uses simple line-by-line comparison
   * For production, consider using diff-match-patch library
   * 
   * @param {string} original - Original code
   * @param {string} proposed - Proposed code
   */
  parseHunks(original, proposed) {
    const originalLines = original.split('\n');
    const proposedLines = proposed.split('\n');

    const hunks = [];
    let i = 0, j = 0;

    while (i < originalLines.length || j < proposedLines.length) {
      const origLine = originalLines[i] || '';
      const propLine = proposedLines[j] || '';

      if (origLine === propLine) {
        // Lines match, no change
        i++;
        j++;
      } else if (i >= originalLines.length) {
        // Only proposed has remaining lines (additions)
        hunks.push({
          type: 'added',
          originalLine: i,
          proposedLine: j,
          content: propLine
        });
        j++;
      } else if (j >= proposedLines.length) {
        // Only original has remaining lines (deletions)
        hunks.push({
          type: 'deleted',
          originalLine: i,
          proposedLine: j,
          content: origLine
        });
        i++;
      } else {
        // Lines differ
        hunks.push({
          type: 'changed',
          originalLine: i,
          proposedLine: j,
          originalContent: origLine,
          proposedContent: propLine
        });
        i++;
        j++;
      }
    }

    this.state.hunks = hunks;
    console.log(`📊 Parsed ${hunks.length} hunks`);
  }

  /**
   * Update the file list UI to highlight selected file
   * 
   * @param {string} filePath - Currently selected file
   */
  updateFileListUI(filePath) {
    if (!this.elements.fileList) return;

    const items = this.elements.fileList.querySelectorAll('.diff-file-item');
    items.forEach(item => {
      if (item.title === filePath) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Accept all changes and apply to editor
   */
  async acceptAllChanges() {
    const files = this.state.files;
    if (!files || Object.keys(files).length === 0) {
      console.error('❌ No files to accept');
      return;
    }

    console.log('✅ Accepting all changes for', Object.keys(files).length, 'files');

    const failed = [];
    for (const [filePath, fileData] of Object.entries(files)) {
      try {
        await this.applyChangesToFile(filePath, fileData.proposed);
      } catch (error) {
        console.error(`❌ Failed to apply changes to ${filePath}:`, error);
        failed.push(filePath);
      }
    }

    if (failed.length > 0) {
      addChatMessage('system', `⚠️ Some files could not be saved: ${failed.join(', ')}`);
    } else {
      const count = Object.keys(files).length;
      addChatMessage('system', `✅ Applied changes to ${count} file${count > 1 ? 's' : ''}`);
    }

    this.hide();
  }

  /**
   * Apply proposed changes to a file
   * Updates Monaco editor and writes to disk
   * 
   * @param {string} filePath - Relative or absolute path to file
   * @param {string} content - New content to apply
   */
  async applyChangesToFile(filePath, content) {
    // Resolve to absolute path — Valkyrie sends relative paths
    const workspaceRoot = (typeof state !== 'undefined' && state.workspaceRoot) ||
                          await window.novaAPI.getWorkspaceRoot();
    
    let absPath = filePath;
    if (workspaceRoot && !filePath.startsWith('/')) {
      absPath = `${workspaceRoot}/${filePath}`;
    }

    console.log('💾 Applying changes to', absPath, '(relative:', filePath, ')');

    // Find or create a tab for this file
    let tab = state.tabs?.find(t => t.path === absPath || t.path === filePath);

    if (!tab) {
      // File not currently open — open it first so Monaco can display the result
      console.log('📂 File not in tabs, opening:', absPath);
      try {
        await openFile(absPath);
        tab = state.tabs?.find(t => t.path === absPath);
      } catch (e) {
        console.warn('⚠️  Could not open file before applying changes:', e.message);
      }
    }

    // Update Monaco editor if this is the active file
    if (state.activePath === absPath && state.editor) {
      const model = state.editor.getModel();
      if (model) {
        model.setValue(content);
        console.log('✅ Updated active editor');
      }
    } else if (tab && state.editor) {
      // Update the tab's cached content and switch to it
      tab.content = content;
      // Switch to this file so the user sees the result
      try {
        await openFile(absPath);
        const model = state.editor?.getModel();
        if (model) model.setValue(content);
      } catch (e) {
        console.warn('⚠️  Could not switch to file:', e.message);
      }
    }

    // Mark tab dirty (unsaved indicator)
    if (tab) {
      tab.isDirty = true;
      if (typeof renderTabs === 'function') renderTabs();
    }

    // Write to filesystem via IPC — use absolute path
    try {
      await window.novaAPI.writeFile(absPath, content);
      console.log('✅ Written to disk:', absPath);
    } catch (error) {
      // Try relative path as fallback
      try {
        await window.novaAPI.writeFile(filePath, content);
        console.log('✅ Written to disk (relative):', filePath);
      } catch (err2) {
        console.error('❌ Could not write to disk:', err2);
        throw new Error(`Failed to write file: ${err2.message}`);
      }
    }
  }

  /**
   * Reject changes and close diff viewer
   */
  rejectChanges() {
    console.log('❌ Rejecting all changes');
    this.hide();
    addChatMessage('system', '❌ Changes rejected and discarded');
  }

  /**
   * Hide the diff viewer
   */
  hide() {
    console.log('🚪 Hiding diff viewer');

    this.state.isOpen = false;

    // Hide UI
    if (this.elements.controlBar) this.elements.controlBar.classList.add('hidden');
    if (this.elements.container) this.elements.container.classList.add('hidden');

    // Dispose editor
    if (this.state.diffEditor) {
      this.state.diffEditor.dispose();
      this.state.diffEditor = null;
    }

    // Reset state
    this.state.files = {};
    this.state.currentFile = null;
    this.state.hunks = [];
  }

  /**
   * Get language for syntax highlighting from file extension
   * 
   * @param {string} filePath - Path to file
   * @returns {string} Language identifier for Monaco
   */
  getLanguageFromPath(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return LANGUAGE_BY_EXT[ext] || 'plaintext';
  }

  /**
   * Get visual icon for file type
   * 
   * @param {string} filePath - Path to file
   * @returns {string} Emoji icon
   */
  getIconForFile(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return ICON_BY_EXT[ext] || '📄';
  }

  /**
   * Cleanup and teardown
   */
  destroy() {
    if (this.state.diffEditor) {
      this.state.diffEditor.dispose();
    }
    console.log('🗑️  DiffManager destroyed');
  }
}

window.DiffManager = DiffManager;

// Clean initialization function exposed to app.js
window.initDiffManager = function() {
  if (!window.diffManager && typeof monaco !== 'undefined') {
    window.diffManager = new DiffManager();
  }
};
