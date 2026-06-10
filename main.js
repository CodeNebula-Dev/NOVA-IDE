const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const pty = require("node-pty");
const os = require("os");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { SuperNovaEngine } = require("./main/agents/supernova");
const llmGateway = require("./main/agents/llm-gateway");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

let mainWindow;
let activeSupernova = null;
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
    icon: path.join(__dirname, "assets/icon.png"),
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

ipcMain.handle("fs:rename", async (_event, oldRelativePath, newRelativePath) => {
  const oldNormalized = normalizeRelativePath(oldRelativePath);
  const newNormalized = normalizeRelativePath(newRelativePath);
  if (!oldNormalized || !newNormalized) {
    throw new Error("Source and target paths are required.");
  }
  const oldAbsPath = resolveInWorkspace(oldNormalized);
  const newAbsPath = resolveInWorkspace(newNormalized);
  await fs.rename(oldAbsPath, newAbsPath);
  return true;
});

ipcMain.handle("fs:delete", async (_event, relativePath) => {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (!normalizedPath) {
    throw new Error("Path is required for deletion.");
  }
  const absolutePath = resolveInWorkspace(normalizedPath);
  await fs.rm(absolutePath, { recursive: true, force: true });
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


ipcMain.handle("supernova:execute", async (event, conversationId, prompt, activeFilePath, activeFileContent, openFiles) => {
  if (activeSupernova) {
    activeSupernova.abort();
  }
  activeSupernova = new SuperNovaEngine(mainWindow, db, workspaceRoot);
  try {
    const results = await activeSupernova.run(conversationId, prompt, activeFilePath, activeFileContent, openFiles);
    return results;
  } finally {
    activeSupernova = null;
  }
});

ipcMain.handle("supernova:abort", async () => {
  if (activeSupernova) {
    activeSupernova.abort();
    activeSupernova = null;
  }
  return true;
});

const { runReviewer } = require("./main/agents/reviewer");
ipcMain.handle("supernova:review-selection", async (event, text, activeFilePath) => {
  try {
    const task = { description: "Analyze the following code selection for bugs, syntax errors, or potential optimizations." };
    const review = await runReviewer(task, text, text);
    return review;
  } catch (err) {
    return { error: err.message };
  }
});


// ── Single-agent chat (Chat / Edit / Explain / Debug) ──────────────────────
// Exclusively uses LLM Gateway (automatically detects Ollama / Groq / Pollinations).
ipcMain.handle("agent:chat", async (event, { prompt, filePath, fileContent, mode }) => {
  // Check if query can be handled locally (offline)
  const cleanPrompt = prompt.toLowerCase().trim().replace(/[?.,!]/g, "");
  const helpTriggers = [
    "what are you", "what can you do", "who are you", "help", 
    "supernova help", "about", "about supernova", "what is this",
    "tell me about yourself", "capabilities", "features"
  ];
  if (helpTriggers.some(t => cleanPrompt.includes(t) || (t.includes(cleanPrompt) && cleanPrompt.length > 3))) {
    return {
      text: `⚡ **SuperNova v1 AI Engine** ⚡

I am your built-in, zero-setup AI assistant inside Nova IDE!

Here is what I can do for you:
1. **Multi-Agent Coding Tasks**: Put me in **SuperNova v1** mode and describe complex coding tasks. I will:
   - **Plan**: Break down your task into step-by-step checklists.
   - **Code**: Automatically write patch files using high-precision code models.
   - **Review**: Review code quality, logic correctness, and syntax validity.
   - **Apply**: Safely verify patches and save changes to disk with automatic checkpoint backups.
2. **Simple Chat & Code QA**: Select **GPT OSS 20B** to ask coding questions, explain code snippets, or draft algorithms.
3. **Workspace-Wide Context**: I scan your open directory automatically to understand imports, configuration files, and project layout.
4. **Resiliency**: If default servers rate-limit or fail, I dynamically alternate between multiple alternative free models (Qwen-Coder, Llama 3.3, Mistral, Gemma) to bypass overloads.

No API keys are required. What should we build today?`,
      code: null,
      raw: ""
    };
  }

  const greetingTriggers = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"];
  if (greetingTriggers.some(t => cleanPrompt === t)) {
    return {
      text: `Hello! I am SuperNova v1, your built-in AI assistant. How can I help you write or debug code today?`,
      code: null,
      raw: ""
    };
  }

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

  // Truncation detection logic for single agent
  function checkSingleAgentTruncation(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;

    // Check <nova-code> tags
    const novaCodeStartCount = (trimmed.match(/<nova-code>/g) || []).length;
    const novaCodeEndCount = (trimmed.match(/<\/nova-code>/g) || []).length;
    if (novaCodeStartCount > novaCodeEndCount) return true;

    // Check markdown code blocks
    const fences = (trimmed.match(/```/g) || []).length;
    if (fences % 2 !== 0) return true;

    return false;
  }

  let rawText = "";
  let continuationCount = 0;
  const maxContinuations = 3;

  while (true) {
    let currentChunkText = "";
    try {
      currentChunkText = await llmGateway.callLLM(messages, {
        purpose: 'chat',
        temperature: 0.7,
        maxTokens: 4096
      });
    } catch (err) {
      console.error("[Agent Chat] LLM call failed:", err);
      break;
    }
    
    rawText += currentChunkText;

    if (checkSingleAgentTruncation(rawText) && continuationCount < maxContinuations) {
      continuationCount++;
      console.log(`[Agent Chat] Output detected as truncated. Triggering continuation ${continuationCount}...`);

      // Feed back the partial assistant answer
      messages.push({ role: "assistant", content: currentChunkText });
      messages.push({
        role: "user",
        content: "Your previous response was truncated/cut off. Please CONTINUE writing the rest of the response EXACTLY where you left off. Do NOT repeat any code or text you already wrote, and do NOT output introductory text. Start immediately with the next characters/lines."
      });
    } else {
      break;
    }
  }

  // Extract code block if present
  let codeMatch = rawText.match(/<nova-code>([\s\S]*?)<\/nova-code>/) ||
                  rawText.match(/```[\w]*\r?\n([\s\S]*?)\r?\n```/);
  
  let code = null;
  if (codeMatch) {
    code = codeMatch[1].trim();
  } else {
    // Try unclosed blocks
    const unclosedCodeMatch = rawText.match(/<nova-code>([\s\S]*)$/) ||
                              rawText.match(/```[\w]*\r?\n([\s\S]*)$/);
    if (unclosedCodeMatch) {
      code = unclosedCodeMatch[1].trim();
      console.log("[Agent Chat] Extracted unclosed code block content due to final truncation.");
    }
  }

  const text = rawText
    .replace(/<nova-code>[\s\S]*?<\/nova-code>/g, "")
    .replace(/```[\w]*\r?\n[\s\S]*?\r?\n```/g, "")
    .replace(/<nova-code>[\s\S]*$/g, "")
    .replace(/```[\w]*\r?\n[\s\S]*$/g, "")
    .trim();

  return { text: text || (code ? "Here is the updated code:" : ""), code, raw: rawText };
});

ipcMain.handle("agent:inline-edit", async (event, { instruction, selectedCode, fullFileContent, filePath }) => {
  const systemPrompt = `You are Nova, a precise code editor. The user selected code in ${filePath || 'their file'} and wants you to edit it. Return ONLY the replacement code — no explanations, no markdown fences, no extra text. Just the code that should replace the selection.`;
  
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Selected code:\n\`\`\`\n${selectedCode}\n\`\`\`\n\nInstruction: ${instruction}` }
  ];

  let result = "";
  try {
    result = await llmGateway.callLLM(messages, {
      purpose: 'code',
      temperature: 0.2,
      maxTokens: 4096
    });
  } catch (err) {
    console.error("[Agent Inline Edit] LLM call failed:", err);
    throw err;
  }

  // Clean up: remove markdown fences if present
  result = result.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();
  return { code: result };
});

// ── AI Provider & Ollama Setup IPC Handlers ──
ipcMain.handle("ai:get-config", async () => {
  // Fire off a non-blocking check to keep availability status reasonably fresh
  llmGateway.checkOllama().catch(() => {});
  return llmGateway.getProviderConfig();
});

ipcMain.handle("ai:set-config", async (event, config) => {
  const updated = llmGateway.setProviderConfig(config);
  try {
    const configPath = path.join(app.getPath("userData"), "ai-config.json");
    await fs.writeFile(configPath, JSON.stringify(updated, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save AI config:", e);
  }
  return updated;
});

ipcMain.handle("ai:check-ollama", async () => {
  return await llmGateway.checkOllama();
});

ipcMain.handle("ai:pull-model", async (event, modelName) => {
  return await llmGateway.pullOllamaModel(modelName, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("ai:pull-progress", { modelName, ...progress });
    }
  });
});

// ── Git Command Runner Helper ──
async function runGitCommand(args) {
  if (!workspaceRoot) {
    return { success: false, error: "No open workspace. Please open a folder first." };
  }
  try {
    const { stdout, stderr } = await execPromise(`git ${args}`, {
      cwd: workspaceRoot,
      maxBuffer: 10 * 1024 * 1024
    });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      stdout: error.stdout?.trim() || "", 
      stderr: error.stderr?.trim() || "" 
    };
  }
}

// ── Git IPC Handlers ──
ipcMain.handle("git:status", async () => {
  return await runGitCommand("status --porcelain");
});

ipcMain.handle("git:stage", async (_event, filePath) => {
  const relative = path.relative(workspaceRoot, filePath);
  return await runGitCommand(`add "${relative.replace(/"/g, '\\"')}"`);
});

ipcMain.handle("git:unstage", async (_event, filePath) => {
  const relative = path.relative(workspaceRoot, filePath);
  return await runGitCommand(`restore --staged "${relative.replace(/"/g, '\\"')}"`);
});

ipcMain.handle("git:commit", async (_event, message) => {
  const sanitizedMsg = message.replace(/"/g, '\\"');
  return await runGitCommand(`commit -m "${sanitizedMsg}"`);
});

ipcMain.handle("git:push", async () => {
  return await runGitCommand("push");
});

ipcMain.handle("git:pull", async () => {
  return await runGitCommand("pull");
});

ipcMain.handle("git:get-branches", async () => {
  return await runGitCommand("branch -a");
});

ipcMain.handle("git:checkout", async (_event, branchName) => {
  return await runGitCommand(`checkout "${branchName.replace(/"/g, '\\"')}"`);
});

ipcMain.handle("git:create-branch", async (_event, branchName) => {
  return await runGitCommand(`checkout -b "${branchName.replace(/"/g, '\\"')}"`);
});

app.name = "Nova IDE";
app.setName("Nova IDE");

app.whenReady().then(() => {
  // Load saved AI config on startup
  try {
    const configPath = path.join(app.getPath("userData"), "ai-config.json");
    if (fsSync.existsSync(configPath)) {
      const saved = JSON.parse(fsSync.readFileSync(configPath, "utf8"));
      llmGateway.setProviderConfig(saved);
    }
  } catch (e) {
    console.error("Failed to load saved AI config:", e);
  }

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
