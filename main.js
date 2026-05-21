const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const pty = require("node-pty");
const os = require("os");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { ValkyrieEngine } = require("./main/agents/valkyrie");

let mainWindow;
let activeValkyrie = null;
const ptyProcesses = new Map();

let workspaceRoot = ""; // Empty by default — no auto-open on startup
let db;

const IGNORED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);

function initializeDatabase(root) {
  if (!root) return; // Don't init DB without a workspace
  const novaDir = path.join(root, ".nova");
  if (!fsSync.existsSync(novaDir)) {
    fsSync.mkdirSync(novaDir, { recursive: true });
  }
  
  const dbPath = path.join(novaDir, "history.db");
  db = new Database(dbPath);
  
  db.pragma("journal_mode = WAL");
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
      content TEXT NOT NULL,
      model_name TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      file_path TEXT NOT NULL,
      original_sha TEXT NOT NULL,
      backup_file_path TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_file ON checkpoints(file_path);
  `);
  
  console.log("Database initialized at:", dbPath);
}

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

  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    try {
      console.log(`[Renderer] ${message} (at ${sourceId}:${line})`);
    } catch (e) {
      // Ignore EPIPE and other write errors — happens when stdout pipe is closed
    }
  });
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
  let resolvedPath;
  if (path.isAbsolute(relativePath)) {
    resolvedPath = path.resolve(relativePath);
  } else {
    const safeRelativePath = normalizeRelativePath(relativePath);
    resolvedPath = path.resolve(workspaceRoot, safeRelativePath);
  }
  
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
  // Lazily init DB for the newly selected workspace
  if (!db) {
    initializeDatabase(workspaceRoot);
  }
  return workspaceRoot;
});

ipcMain.handle("fs:read-tree", async () => {
  // Return an empty root when no workspace is set
  if (!workspaceRoot) {
    return { type: "folder", name: "", path: "", children: [] };
  }
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

// Chat Database IPC Handlers
ipcMain.handle("chat:create-conversation", (event, title) => {
  if (!db) return null;
  const id = crypto.randomUUID();
  const stmt = db.prepare("INSERT INTO conversations (id, title) VALUES (?, ?)");
  stmt.run(id, title);
  return id;
});

ipcMain.handle("chat:get-conversations", () => {
  if (!db) return [];
  const stmt = db.prepare("SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC");
  return stmt.all();
});

ipcMain.handle("chat:get-conversation", (event, conversationId) => {
  if (!db) return null;
  const stmt = db.prepare("SELECT * FROM conversations WHERE id = ?");
  return stmt.get(conversationId);
});

ipcMain.handle("chat:update-conversation-title", (event, conversationId, title) => {
  if (!db) return false;
  const stmt = db.prepare("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  stmt.run(title, conversationId);
  return true;
});

ipcMain.handle("chat:delete-conversation", (event, conversationId) => {
  if (!db) return false;
  const stmt = db.prepare("DELETE FROM conversations WHERE id = ?");
  stmt.run(conversationId);
  return true;
});

ipcMain.handle("chat:add-message", (event, conversationId, role, content, modelName) => {
  if (!db) return null;
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, conversationId, role, content, modelName);
  
  const updateStmt = db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  updateStmt.run(conversationId);
  
  return id;
});

ipcMain.handle("chat:get-messages", (event, conversationId) => {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT id, role, content, model_name, prompt_tokens, completion_tokens, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(conversationId);
});

ipcMain.handle("chat:delete-message", (event, messageId) => {
  if (!db) return false;
  const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
  stmt.run(messageId);
  return true;
});


ipcMain.handle("valkyrie:execute", async (event, conversationId, prompt, activeFilePath, apiKeys) => {
  if (activeValkyrie) {
    activeValkyrie.abort();
  }
  activeValkyrie = new ValkyrieEngine(mainWindow, db, workspaceRoot);
  try {
    const results = await activeValkyrie.run(conversationId, prompt, activeFilePath, apiKeys);
    return results;
  } finally {
    activeValkyrie = null;
  }
});

ipcMain.handle("valkyrie:abort", async () => {
  if (activeValkyrie) {
    activeValkyrie.abort();
    activeValkyrie = null;
  }
  return true;
});

ipcMain.handle("valkyrie:get-env-keys", () => {
  return {
    openrouter: process.env.OPENROUTER_API_KEY || "",
    groq: process.env.GROQ_API_KEY || ""
  };
});

const { runReviewer } = require("./main/agents/reviewer");
ipcMain.handle("valkyrie:review-selection", async (event, text, activeFilePath, apiKeys) => {
  try {
    const task = { description: "Analyze the following code selection for bugs, syntax errors, or potential optimizations." };
    const review = await runReviewer(task, text, text, apiKeys);
    return review;
  } catch (err) {
    return { error: err.message };
  }
});


// ── Single-agent chat (Chat / Edit / Explain / Debug) ──────────────────────
// Uses Pollinations by default (no API key). Falls back to OpenRouter if key present.
ipcMain.handle("agent:chat", async (event, { agent, prompt, filePath, fileContent, apiKeys, mode }) => {
  const https = require("https");

  const modePrompts = {
    chat:    (f, l) => `You are Nova, an expert AI coding assistant. The user has ${f} open. Be concise and precise.`,
    edit:    (f, l) => `You are Nova, a code-editing agent. Return ONLY the COMPLETE updated file content for ${f} inside a <nova-code> block, with a one-line explanation before it.`,
    explain: (f, l) => `You are Nova, a code explainer. Explain the code in ${f} clearly. Short paragraphs, plain language.`,
    debug:   (f, l) => `You are Nova, a debugging agent for ${f}. Find bugs, explain each one briefly, then provide the COMPLETE fixed file inside a <nova-code> block.`
  };

  const systemPrompt = (modePrompts[mode] || modePrompts.chat)(filePath || "the file", "code");

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: filePath
        ? `Active file: \`${filePath}\`\n\`\`\`\n${(fileContent || "").slice(0, 6000)}\n\`\`\`\n\n${prompt}`
        : prompt
    }
  ];

  const orKey = apiKeys?.openrouter || "";

  // --- Call OpenRouter if key present, otherwise Pollinations ---
  let rawText = "";

  if (orKey) {
    const modelMap = {
      deepseek: "deepseek/deepseek-r1:free",
      qwen:     "qwen/qwen3-coder:free",
      llama:    "meta-llama/llama-3.3-70b-instruct:free",
      gemma:    "google/gemma-3-27b-it:free"
    };
    const model = modelMap[agent] || "meta-llama/llama-3.3-70b-instruct:free";
    const body = JSON.stringify({ model, messages, max_tokens: 2048 });

    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${orKey}`,
        "HTTP-Referer": "https://github.com/CodeNebula-Dev/NOVA-IDE",
        "X-Title": "Nova IDE"
      },
      body
    });
    if (!orResponse.ok) {
      const errText = await orResponse.text();
      throw new Error(`OpenRouter error ${orResponse.status}: ${errText.slice(0, 200)}`);
    }
    const data = await orResponse.json();
    rawText = data?.choices?.[0]?.message?.content || "";
  } else {
    // Pollinations — completely free, no key
    const polBody = JSON.stringify({ messages, model: "openai", seed: 42, private: true });
    const polResponse = await fetch("https://text.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: polBody
    });
    if (!polResponse.ok) throw new Error(`Pollinations error ${polResponse.status}`);
    const resText = await polResponse.text();
    try {
      const data = JSON.parse(resText);
      rawText = data?.choices?.[0]?.message?.content || resText;
    } catch (e) {
      rawText = resText;
    }
  }

  // Extract code block if present
  const codeMatch = rawText.match(/<nova-code>([\s\S]*?)<\/nova-code>/) ||
                    rawText.match(/```[\w]*\r?\n([\s\S]*?)\r?\n```/);
  const code = codeMatch ? codeMatch[1].trim() : null;
  const text = rawText
    .replace(/<nova-code>[\s\S]*?<\/nova-code>/g, "")
    .replace(/```[\w]*\r?\n[\s\S]*?\r?\n```/g, "")
    .trim();

  return { text: text || (code ? "Here is the updated code:" : ""), code, raw: rawText };
});

ipcMain.handle("agent:inline-edit", async (event, { instruction, selectedCode, fullFileContent, filePath, apiKeys }) => {
  const orKey = apiKeys?.openrouter || "";
  const systemPrompt = `You are Nova, a precise code editor. The user selected code in ${filePath || 'their file'} and wants you to edit it. Return ONLY the replacement code — no explanations, no markdown fences, no extra text. Just the code that should replace the selection.`;
  
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Selected code:\n\`\`\`\n${selectedCode}\n\`\`\`\n\nInstruction: ${instruction}` }
  ];

  let result = "";
  if (orKey) {
    const body = JSON.stringify({ model: "qwen/qwen3-coder:free", messages, max_tokens: 2048 });
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${orKey}`, "HTTP-Referer": "https://github.com/CodeNebula-Dev/NOVA-IDE", "X-Title": "Nova IDE" },
      body
    });
    if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
    const data = await response.json();
    result = data?.choices?.[0]?.message?.content || "";
  } else {
    const body = JSON.stringify({ messages, model: "openai", seed: 42, private: true });
    const response = await fetch("https://text.pollinations.ai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (!response.ok) throw new Error(`Pollinations error ${response.status}`);
    const resText = await response.text();
    try {
      const data = JSON.parse(resText);
      result = data?.choices?.[0]?.message?.content || resText;
    } catch (e) {
      result = resText;
    }
  }

  // Clean up: remove markdown fences if present
  result = result.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();
  return { code: result };
});

app.whenReady().then(() => {
  // DB is NOT initialized here — it's deferred to when a workspace is selected
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
