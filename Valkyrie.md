# ⚡ Valkyrie — The Multi-Agent Harness

> The brain behind NOVA IDE's autonomous coding engine.

---

## What is Valkyrie?

**Valkyrie** is NOVA IDE's multi-agent orchestration system. When you send a prompt in Valkyrie mode, three specialised AI models collaborate to plan, write, and review code changes — automatically, without you touching a file.

It works like a software engineering team inside a single prompt:

| Role | Model | Job |
|------|-------|-----|
| **Architect / Planner** | DeepSeek R1 (via OpenRouter) | Reads your request, analyses the codebase, breaks the work into a list of atomic tasks |
| **Lead Engineer / Coder** | Qwen 2.5 Coder 32B (via OpenRouter) | Receives each task one at a time, writes the actual code change (diff or full file) |
| **QA Reviewer** | Llama 3.3 70B (via Groq) | Evaluates every code change before it's applied — scores it 0–100, flags issues |

---

## Full Lifecycle: What Happens When You Hit Send

```
User prompt
    │
    ▼
┌──────────────────────────────────┐
│  1. PLANNER  (DeepSeek R1)       │
│  "What needs to change, and why?"│
└──────────────┬───────────────────┘
               │  Outputs: JSON array of tasks
               │  e.g. [
               │    { id: 1, description: "Add FileEventHandler", assignedFile: "daemon.py" },
               │    { id: 2, description: "Replace polling loop", assignedFile: "daemon.py" },
               │    ...
               │  ]
               ▼
┌──────────────────────────────────────────────────────────────┐
│  FOR EACH TASK (sequentially):                               │
│                                                              │
│  2. CODER (Qwen 2.5 Coder)                                   │
│     Receives: task description + current file content        │
│     Outputs: a code diff in one of three formats:            │
│       • Option A: <<<<<<< SEARCH / ======= / >>>>>>> REPLACE │
│       • Option B: full file replacement (```python ... ```)  │
│       • Option C: unified diff (--- / +++ / @@ format)       │
│                                                              │
│  3. REVIEWER (Llama 3.3 70B via Groq)                        │
│     Receives: task + original file + proposed diff           │
│     Outputs: { approved: true/false, score: 0-100,           │
│               feedback: "...", issues: [...] }               │
│                                                              │
│     ┌─ If approved OR score ≥ 60 ──────────────────────┐    │
│     │  → Patch is applied to in-memory virtual FS      │    │
│     │  → Checkpoint (backup) saved to .nova/checkpoints│    │
│     │  → Next task begins                              │    │
│     └────────────────────────────────────────────────────┘   │
│                                                              │
│     ┌─ If rejected AND score < 60 ─────────────────────┐    │
│     │  → Reviewer feedback is sent back to Coder       │    │
│     │  → Coder retries (up to 3 attempts total)        │    │
│     │  → On retry: if diff was malformed → forces full │    │
│     │    file replacement mode                         │    │
│     └────────────────────────────────────────────────────┘   │
│                                                              │
│     ┌─ After 3 failed attempts ────────────────────────┐    │
│     │  → Best non-empty diff across attempts is used   │    │
│     │  → Or task is skipped, next task continues       │    │
│     │  → The pipeline NEVER aborts the whole plan      │    │
│     └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  4. PATCH APPLICATION            │
│  applyPatch() merges all changes │
│  into the virtual filesystem     │
│  then writes to disk             │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  5. DIFF VIEWER (UI)             │
│  Monaco side-by-side diff shown  │
│  User clicks "Accept Changes" →  │
│  All files written to disk &     │
│  opened in the editor            │
└──────────────────────────────────┘
```

---

## The Three Models In Detail

### 🧠 DeepSeek R1 — The Architect
- **When it runs:** Once, at the very start of every Valkyrie prompt.
- **What it gets:** Your natural language request + the active file path.
- **What it does:** Thinks deeply (you see "planning…" in the status) and produces a **structured JSON task list**. Each task has a description, an assigned file, and a priority.
- **Key strength:** Chain-of-thought reasoning. It figures out the *order* of operations (e.g. "create the class first, then wire it in the main block").
- **Fallback:** If JSON parsing fails, Valkyrie uses a partial-JSON extractor to rescue as many tasks as possible.

### 💻 Qwen 2.5 Coder 32B — The Engineer
- **When it runs:** Once per task, per attempt (up to 3×).
- **What it gets:** The task description, the full current file content, and any reviewer feedback from prior failed attempts.
- **What it does:** Writes actual code. It can:
  - Surgically replace specific blocks (Search/Replace format)
  - Rewrite an entire file (full-file format)
  - Produce a unified diff
- **Smart retry:** If the reviewer said "your diff was malformed", the retry prompt forces Qwen into full-file mode so it can't produce partial/corrupt diffs.
- **Streaming:** The diff is streamed token-by-token to the UI so you see it being written in real time.

### 🦙 Llama 3.3 70B — The Reviewer
- **When it runs:** After every Coder output, before any file is touched.
- **What it gets:** The task spec, original file, and proposed diff.
- **What it does:** Evaluates the code change against:
  - Correctness (does it compile? are imports present?)
  - Completeness (are functions fully implemented?)
  - Task adherence (does it actually do what was asked?)
  - Style (does it match the surrounding code?)
- **Output:** `{ approved, score (0–100), feedback, issues[] }`
- **Thresholds:**
  - `approved: true` → immediate pass
  - `score ≥ 60` → pass (confident enough, even if not perfect)
  - `score < 60` → reject, send feedback to Coder for retry
  - Parse failure → **auto-approve** (non-blocking, pipeline keeps running)

---

## The Virtual Filesystem

Valkyrie never writes to disk mid-task. Instead it maintains a **virtual filesystem** in memory:

```
virtualFilesystem: Map<relativePath, string>
```

Each task reads from this map (getting the *already-patched* version from previous tasks) and writes back the new version. Only when **all tasks complete** are the final contents committed to disk and shown in the diff viewer.

This means if task 3 modifies a file that task 1 already changed, task 3 sees task 1's output — not the stale disk version.

---

## Checkpoints & Rollback

Before writing any file to disk, Valkyrie saves a checkpoint:

```
.nova/checkpoints/<sha256>_<filename>
```

- The SHA-256 is computed from the **original content** before any changes
- The checkpoint path is saved to SQLite (`checkpoints` table)
- If you reject changes, the checkpoint lets you restore the exact pre-Valkyrie state
- Checkpoints are linked to a conversation ID so you can roll back a specific session

---

## Why 12 Tasks?

DeepSeek R1 breaks work down into **atomic, single-responsibility tasks** — one task per logical change. This is intentional:

- Each task is independently reviewable
- If one task fails, others can still succeed
- The reviewer has a clear spec to evaluate against
- Smaller tasks = smaller diffs = fewer merge conflicts

For a complex refactor (like replacing polling with watchdog observers), 8–15 tasks is normal and means the model genuinely understood the scope of work.

---

## API Keys & Providers

| Model | Provider | Key needed |
|-------|----------|-----------|
| DeepSeek R1 | OpenRouter | `OPENROUTER_API_KEY` (or enter in Config panel) |
| Qwen 2.5 Coder | OpenRouter | same key |
| Llama 3.3 70B | Groq | `GROQ_API_KEY` (or enter in Config panel) |
| Free fallback | Pollinations | No key needed (rate-limited, may fail under load) |

When no API key is set, Valkyrie falls back to the **Pollinations free API** — which works but is slower and can return `502` errors under load. Each 502 is retried 3× with 3-second backoff before failing.

---

## Status Messages Decoded

| Status shown in UI | What it means |
|-------------------|---------------|
| `Planning with DeepSeek R1…` | Architect is producing the task list |
| `Writing code changes… (Attempt 1/3)` | Coder is generating the diff |
| `Reviewing code quality…` | Llama 3.3 is scoring the output |
| `Reviewer score low (45/100) — applying best-effort changes.` | Score was borderline; Valkyrie applied anyway |
| `Applying best-effort changes after 3 review cycles.` | Used the best diff seen across all 3 attempts |
| `Coder produced no usable output… Skipping task.` | All 3 attempts returned empty output; task skipped, plan continues |
| `Valkyrie finished successfully!` | All tasks complete, diff viewer shown |
