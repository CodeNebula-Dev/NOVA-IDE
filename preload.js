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
  }
});
