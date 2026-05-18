const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const pty = require("node-pty");
const os = require("os");

let mainWindow;
const ptyProcesses = new Map();

let workspaceRoot = process.cwd();

const IGNORED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: "#0d0f14",
    title: "Nova IDE",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
}

function compareNodes(a, b) {
  if (a.type !== b.type) {
    return a.type === "folder" ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

function normalizeRelativePath(input = "") {
  return input.replace(/\\/g, "/").split("/").filter(Boolean).join("/");
}

function resolveInWorkspace(relativePath = "") {
  const safeRelativePath = normalizeRelativePath(relativePath);
  const resolvedPath = path.resolve(workspaceRoot, safeRelativePath);
  const normalizedRoot = path.resolve(workspaceRoot);
  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : `${normalizedRoot}${path.sep}`;

  if (resolvedPath !== normalizedRoot && !resolvedPath.startsWith(rootWithSep)) {
    throw new Error("Path escapes the workspace root.");
  }

  return resolvedPath;
}

async function buildTreeNode(absolutePath, relativePath = "") {
  const stats = await fs.stat(absolutePath);
  const nodeName = relativePath ? path.basename(absolutePath) : path.basename(workspaceRoot) || workspaceRoot;

  if (!stats.isDirectory()) {
    return {
      type: "file",
      name: nodeName,
      path: relativePath
    };
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name) || entry.isSymbolicLink()) {
      continue;
    }

    const childAbsolutePath = path.join(absolutePath, entry.name);
    const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childNode = await buildTreeNode(childAbsolutePath, childRelativePath);
    children.push(childNode);
  }

  children.sort(compareNodes);

  return {
    type: "folder",
    name: nodeName,
    path: relativePath,
    children
  };
}

ipcMain.handle("workspace:get-root", async () => workspaceRoot);

ipcMain.handle("workspace:select-root", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Workspace Folder",
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return workspaceRoot;
  }

  workspaceRoot = result.filePaths[0];
  return workspaceRoot;
});

ipcMain.handle("fs:read-tree", async () => {
  return buildTreeNode(workspaceRoot, "");
});

ipcMain.handle("fs:read-file", async (_event, relativePath) => {
  const absolutePath = resolveInWorkspace(relativePath);
  return fs.readFile(absolutePath, "utf8");
});

ipcMain.handle("fs:write-file", async (_event, relativePath, content) => {
  const absolutePath = resolveInWorkspace(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
  return true;
});

ipcMain.handle("fs:create-file", async (_event, relativePath) => {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (!normalizedPath) {
    throw new Error("File path is required.");
  }

  const absolutePath = resolveInWorkspace(normalizedPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  try {
    await fs.access(absolutePath);
    throw new Error("File already exists.");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(absolutePath, "", "utf8");
  return true;
});

ipcMain.handle("fs:create-folder", async (_event, relativePath) => {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (!normalizedPath) {
    throw new Error("Folder path is required.");
  }

  const absolutePath = resolveInWorkspace(normalizedPath);
  await fs.mkdir(absolutePath, { recursive: true });
  return true;
});

// Native Terminal handlers using node-pty
ipcMain.handle("terminal:create", (event, cols, rows) => {
  const shell = process.env.SHELL || (os.platform() === "win32" ? "powershell.exe" : "zsh");
  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: cols || 80,
    rows: rows || 24,
    cwd: workspaceRoot,
    env: process.env
  });

  const id = `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  ptyProcesses.set(id, ptyProcess);

  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`terminal:data:${id}`, data);
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`terminal:exit:${id}`, { exitCode, signal });
    }
    ptyProcesses.delete(id);
  });

  return id;
});

ipcMain.handle("terminal:input", (event, id, data) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.handle("terminal:resize", (event, id, cols, rows) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
});


app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
