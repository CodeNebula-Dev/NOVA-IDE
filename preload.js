const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("novaAPI", {
  // Workspace API
  getWorkspaceRoot: () => ipcRenderer.invoke("workspace:get-root"),
  selectWorkspaceRoot: () => ipcRenderer.invoke("workspace:select-root"),
  
  // File System API
  readTree: () => ipcRenderer.invoke("fs:read-tree"),
  readFile: (relativePath) => ipcRenderer.invoke("fs:read-file", relativePath),
  writeFile: (relativePath, content) => ipcRenderer.invoke("fs:write-file", relativePath, content),
  createFile: (relativePath) => ipcRenderer.invoke("fs:create-file", relativePath),
  createFolder: (relativePath) => ipcRenderer.invoke("fs:create-folder", relativePath),

  // Native Terminal API (node-pty integration)
  terminalCreate: (cols, rows) => ipcRenderer.invoke("terminal:create", cols, rows),
  terminalInput: (id, data) => ipcRenderer.invoke("terminal:input", id, data),
  terminalResize: (id, cols, rows) => ipcRenderer.invoke("terminal:resize", id, cols, rows),
  onTerminalData: (id, callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on(`terminal:data:${id}`, listener);
    return () => ipcRenderer.removeListener(`terminal:data:${id}`, listener);
  },
  onTerminalExit: (id, callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on(`terminal:exit:${id}`, listener);
    return () => ipcRenderer.removeListener(`terminal:exit:${id}`, listener);
  },

  // Chat Database API
  chat: {
    createConversation: (title) => ipcRenderer.invoke("chat:create-conversation", title),
    getConversations: () => ipcRenderer.invoke("chat:get-conversations"),
    getConversation: (conversationId) => ipcRenderer.invoke("chat:get-conversation", conversationId),
    updateConversationTitle: (conversationId, title) => ipcRenderer.invoke("chat:update-conversation-title", conversationId, title),
    deleteConversation: (conversationId) => ipcRenderer.invoke("chat:delete-conversation", conversationId),
    addMessage: (conversationId, role, content, modelName) => ipcRenderer.invoke("chat:add-message", conversationId, role, content, modelName),
    getMessages: (conversationId) => ipcRenderer.invoke("chat:get-messages", conversationId),
    deleteMessage: (messageId) => ipcRenderer.invoke("chat:delete-message", messageId)
  },

  // Valkyrie Agent Harness API
  valkyrie: {
    execute: (conversationId, prompt, activeFilePath, apiKeys) => 
      ipcRenderer.invoke("valkyrie:execute", conversationId, prompt, activeFilePath, apiKeys),
    abort: () => ipcRenderer.invoke("valkyrie:abort"),
    getEnvKeys: () => ipcRenderer.invoke("valkyrie:get-env-keys"),
    
    // Global Orchestration Streaming Events
    onEvent: (channel, callback) => {
      const allowedChannels = [
        "valkyrie:thought-chunk",
        "valkyrie:plan-update",
        "valkyrie:task-update",
        "valkyrie:diff-chunk",
        "valkyrie:review-status",
        "valkyrie:status",
        "valkyrie:completed",
        "valkyrie:error"
      ];
      if (!allowedChannels.includes(channel)) return () => {};
      
      const listener = (event, data) => callback(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  }
});
