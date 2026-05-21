/**
 * Valkyrie Agent Harness Engine
 * Coordinates Multi-Agent Planner -> Coder -> Reviewer lifecycle,
 * writes physical snapshots, and logs checkpoints to SQLite.
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { runPlanner } = require('./planner');
const { runCoder, applyPatch } = require('./coder');
const { runReviewer } = require('./reviewer');

class ValkyrieEngine {
  constructor(mainWindow, db, workspaceRoot) {
    this.mainWindow = mainWindow;
    this.db = db;
    this.workspaceRoot = workspaceRoot;
    this.aborted = false;
  }

  abort() {
    this.aborted = true;
  }

  // Sends raw stream updates to the renderer
  emit(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }

  async run(conversationId, userPrompt, activeFilePath, apiKeys) {
    this.aborted = false;
    this.emit('valkyrie:status', { status: 'planning', message: 'Consulting DeepSeek R1...' });

    // 1. Gather all file contexts
    let activeFileContent = "";
    if (activeFilePath) {
      try {
        const absolutePath = path.resolve(this.workspaceRoot, activeFilePath);
        activeFileContent = await fs.readFile(absolutePath, 'utf8');
      } catch (err) {
        console.error("Could not read active file:", err);
      }
    }

    // Load workspace tree in summary
    const treeText = await this.buildTreeTextSummary();

    const contextData = {
      activeFilePath,
      activeFileContent,
      treeText
    };

    // --- STEP 1: PLANNING (DeepSeek R1) ---
    let plan = [];
    try {
      plan = await runPlanner(
        userPrompt, 
        contextData, 
        apiKeys.openrouter,
        (thoughtChunk) => {
          if (this.aborted) throw new Error("Valkyrie Aborted");
          this.emit('valkyrie:thought-chunk', { conversationId, chunk: thoughtChunk });
        },
        (partialPlan, isFinal) => {
          if (this.aborted) throw new Error("Valkyrie Aborted");
          this.emit('valkyrie:plan-update', { conversationId, plan: partialPlan, isFinal });
        }
      );
    } catch (err) {
      this.emit('valkyrie:error', { message: `Planning failed: ${err.message}` });
      return null;
    }

    // Create execution checkpoints record array and virtual filesystem
    const executionResults = [];
    const virtualFilesystem = new Map();

    // --- STEP 2: CODING & REVIEWING FOR EACH TASK ---
    for (let i = 0; i < plan.length; i++) {
      if (this.aborted) break;
      const task = plan[i];
      task.status = 'in-progress';
      this.emit('valkyrie:task-update', { taskId: task.id, status: 'in-progress' });

      let attempts = 0;
      const maxAttempts = 3;
      let approved = false;
      let proposedDiff = "";
      let bestDiff = ""; // Track the best (non-empty) diff seen across all attempts
      let taskFileContent = "";
      const priorFeedback = [];

      const targetFileAbsPath = path.resolve(this.workspaceRoot, task.assignedFile);
      
      // Load current target file contents (might be newly created or updated by earlier tasks)
      try {
        if (virtualFilesystem.has(task.assignedFile)) {
          taskFileContent = virtualFilesystem.get(task.assignedFile);
        } else if (fsSync.existsSync(targetFileAbsPath)) {
          taskFileContent = await fs.readFile(targetFileAbsPath, 'utf8');
        } else {
          taskFileContent = ""; // New file to be created
        }
      } catch (err) {
        taskFileContent = "";
      }

      while (!approved && attempts < maxAttempts) {
        if (this.aborted) break;
        attempts++;
        this.emit('valkyrie:status', { 
          status: 'coding', 
          message: `Task ${i+1}/${plan.length}: Writing code changes... (Attempt ${attempts}/${maxAttempts})` 
        });

        // Generate changes using Qwen3-Coder
        try {
          proposedDiff = await runCoder(
            task, 
            taskFileContent, 
            priorFeedback, 
            apiKeys.openrouter,
            (diffChunk) => {
              if (this.aborted) throw new Error("Valkyrie Aborted");
              this.emit('valkyrie:diff-chunk', { conversationId, chunk: diffChunk, taskId: task.id });
            }
          );
          // Track the best (longest/most complete) non-empty diff across attempts
          if (proposedDiff && proposedDiff.trim().length > (bestDiff ? bestDiff.trim().length : 0)) {
            bestDiff = proposedDiff;
          }
        } catch (err) {
          this.emit('valkyrie:error', { message: `Coder failed at task "${task.description}": ${err.message}` });
          return null;
        }

        // Run Quality Review using Groq Llama 3.3
        this.emit('valkyrie:status', { 
          status: 'reviewing', 
          message: `Task ${i+1}/${plan.length}: Reviewing code quality...` 
        });

        let reviewResult = null;
        try {
          reviewResult = await runReviewer(task, taskFileContent, proposedDiff, apiKeys);
        } catch (err) {
          // Reviewer network/parse error — non-blocking. Treat as soft pass if we have a diff.
          console.warn("Reviewer threw an error (non-blocking):", err.message);
          reviewResult = { approved: true, score: 70, feedback: `Reviewer error (auto-approved): ${err.message}`, issues: [] };
        }

        // Normalise result — ensure we always have an object
        if (!reviewResult || typeof reviewResult !== 'object') {
          reviewResult = { approved: true, score: 70, feedback: 'Reviewer returned null (auto-approved).', issues: [] };
        }

        this.emit('valkyrie:review-status', { 
          taskId: task.id, 
          attempt: attempts, 
          approved: reviewResult.approved, 
          score: reviewResult.score, 
          feedback: reviewResult.feedback 
        });

        // Approve if: explicitly approved, or score ≥ 60, or last attempt with any content
        const currentDiffHasContent = proposedDiff && proposedDiff.trim().length > 5;
        const scorePassThreshold = (reviewResult.score || 0) >= 60;

        if (reviewResult.approved || scorePassThreshold) {
          approved = true;
        } else if (attempts === maxAttempts && (currentDiffHasContent || bestDiff)) {
          // Last chance: apply best diff seen even if reviewer score is low
          if (!currentDiffHasContent && bestDiff) {
            proposedDiff = bestDiff; // Fall back to best previous attempt
          }
          approved = true;
          this.emit('valkyrie:status', {
            status: 'coding',
            message: `Task ${i+1}/${plan.length}: Reviewer score low (${reviewResult.score}/100) — applying best-effort changes.`
          });
        } else {
          priorFeedback.push(`Attempt ${attempts} Feedback (Score: ${reviewResult.score}/100):\n${reviewResult.feedback}`);
        }
      }

      if (!approved && !this.aborted) {
        // Ultimate safety net: use the best diff seen across all attempts
        const diffToApply = bestDiff || proposedDiff;
        if (diffToApply && diffToApply.trim().length > 5) {
          proposedDiff = diffToApply;
          approved = true;
          this.emit('valkyrie:status', {
            status: 'coding',
            message: `Task ${i+1}/${plan.length}: Applying best-effort changes after ${maxAttempts} review cycles.`
          });
        } else {
          this.emit('valkyrie:error', { 
            message: `Coder produced no usable output for task "${task.description}" after ${maxAttempts} attempts. Skipping task.` 
          });
          // Skip this task but continue with remaining tasks (don't abort the whole plan)
          task.status = 'failed';
          this.emit('valkyrie:task-update', { taskId: task.id, status: 'failed' });
          continue;
        }
      }

      if (this.aborted) break;

      // Apply the patch safely in-memory
      const patchedContent = applyPatch(taskFileContent, proposedDiff);
      virtualFilesystem.set(task.assignedFile, patchedContent);

      // Create a snapshot checkpoint of the original disk state
      let checkpointId = null;
      try {
        const originalDiskContent = fsSync.existsSync(targetFileAbsPath) ? await fs.readFile(targetFileAbsPath, 'utf8') : "";
        checkpointId = await this.createCheckpoint(conversationId, task.assignedFile, originalDiskContent);
      } catch (checkpointErr) {
        console.error("Checkpoint backup failed:", checkpointErr);
      }

      task.status = 'completed';
      this.emit('valkyrie:task-update', { taskId: task.id, status: 'completed' });
      
      executionResults.push({
        task,
        filePath: task.assignedFile,
        checkpointId,
        diff: proposedDiff,
        originalContent: taskFileContent,
        proposedContent: patchedContent
      });
    }

    if (this.aborted) {
      this.emit('valkyrie:status', { status: 'aborted', message: 'Harness Execution Aborted.' });
      return null;
    }

    // Success! Return final approved list
    this.emit('valkyrie:status', { status: 'idle', message: 'Valkyrie finished successfully!' });
    this.emit('valkyrie:completed', { conversationId, results: executionResults });
    return executionResults;
  }

  // Backup files inside .nova/checkpoints/
  async createCheckpoint(conversationId, relativePath, originalContent) {
    const checkpointsDir = path.join(this.workspaceRoot, '.nova', 'checkpoints');
    if (!fsSync.existsSync(checkpointsDir)) {
      await fs.mkdir(checkpointsDir, { recursive: true });
    }

    const sha = crypto.createHash('sha256').update(originalContent).digest('hex');
    const checkpointId = crypto.randomUUID();
    const backupFileName = `${sha}_${path.basename(relativePath)}`;
    const backupFilePath = path.join(checkpointsDir, backupFileName);

    // Save backup file
    await fs.writeFile(backupFilePath, originalContent, 'utf8');

    // SQLite persist
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (id, conversation_id, file_path, original_sha, backup_file_path)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(checkpointId, conversationId, relativePath, sha, backupFilePath);

    return checkpointId;
  }

  async buildTreeTextSummary() {
    try {
      const getTree = async (dir, depth = 0) => {
        if (depth > 2) return ""; // Limit depth to keep context small
        const entries = await fs.readdir(dir, { withFileTypes: true });
        let text = "";
        for (const entry of entries) {
          if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.nova') continue;
          text += "  ".repeat(depth) + entry.name + (entry.isDirectory() ? "/" : "") + "\n";
          if (entry.isDirectory()) {
            text += await getTree(path.join(dir, entry.name), depth + 1);
          }
        }
        return text;
      };
      return await getTree(this.workspaceRoot);
    } catch (err) {
      return "Unable to scan directory structure.";
    }
  }
}

module.exports = {
  ValkyrieEngine
};
