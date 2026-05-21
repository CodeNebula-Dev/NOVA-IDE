# 🎨 Phase 3 UI/UX Redesign - NOVA IDE

## Executive Summary

This phase implements a **free-tier multi-agent IDE** that rivals **Cursor** through:

1. **Sticky Typing Bar** - The AI input stays pinned at the top while users interact with the editor
2. **No API Key Required** - Uses free models (Pollinations, OpenRouter free tier, Ollama local)
3. **Live Editor Integration** - AI changes appear directly in Monaco with green (add) and red (delete) highlights
4. **Cursor-Style Review Panel** - Users see diffs before accepting changes
5. **Multi-Agent Harmony** - 4 specialized LLMs working together:
   - **DeepSeek R1** (Planner) - Strategic thinking & task decomposition
   - **Qwen3-Coder 480B** (Coder) - Code generation
   - **Llama 3.3 70B** (Reviewer) - Code review & validation
   - **Gemini 2.0 Flash** (Fast Inline) - Quick suggestions

---

## 🎯 Key UI/UX Changes

### 1. **Top Sticky Agent Panel** ✅

**Current State:**
- AI agent panel is in the right sidebar (370px wide)
- Input bar scrolls with chat history
- Takes up valuable editor space

**New State:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Nova IDE | File1.js | File2.py | File3.ts          🔍 Search | Settings     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Planner] [Coder] [Reviewer] [Fast]  Status: Ready  ⚡ Active Files: 3      │
│ [Type your prompt here...              ] [⚡ Send] [+Context]  [History]     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐                      ┌─────────────────┐   ┌──────────────┐    │
│ │          │                      │                 │   │              │    │
│ │ File     │                      │                 │   │   Chat       │    │
│ │ Explorer │  Monaco Editor       │  Diff Preview   │   │   History    │    │
│ │          │  (with inline        │  (when AI       │   │              │    │
│ │ • index  │   changes)           │   proposes)     │   │ [Expand ▼]   │    │
│ │ • app    │                      │                 │   │              │    │
│ │ • test   │  ┌─────────────────┐ │                 │   │              │    │
│ │          │  │ Line 15 (Added) │ │  Accept | Reject│   │              │    │
│ │          │  │ Line 20 (Deleted)│ │                 │   │              │    │
│ │          │  └─────────────────┘ │                 │   │              │    │
│ └──────────┘                      └─────────────────┘   └──────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Terminal (⌘T to toggle)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. **No API Key Required Flow** 🔓

**Previous Problem:** 
- "Edit" option requires OpenRouter/Groq API keys
- Friction point: Users need to find & configure keys

**New Solution:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Provider:  [Pollinations (Free) ▼]                                  │
│ Model:     [Auto-Select Best] ▼  (Planner, Coder, Reviewer chosen)  │
│ Status:    ✅ All models available (Free tier)                      │
│                                                                      │
│ Usage:     0/200 req/day  |  No key needed  |  Local Fallback: ON   │
└─────────────────────────────────────────────────────────────────────┘
```

**Detection Logic:**
- Check internet connectivity → Use free API tier
- No connectivity → Fallback to local Ollama
- User can force local: Settings → Offline Mode

### 3. **Live Editor Integration (Cursor-Style)** ✏️

**Current Problem:**
- AI responses show in chat panel only
- User manually copies/pastes code
- No diff review before applying

**New Solution:**

When user sends "Refactor database connection":

1. **Planning Phase** (0.5s):
   - Editor shows `⚡ Planning...` badge at top
   - Chat displays: "DeepSeek R1 thinking through task..."

2. **Coding Phase** (2-3s):
   - Monaco editor splits into **Diff View**
   - Left side: Original code (RED for lines to delete)
   - Right side: New code (GREEN for added lines)
   - User sees changes highlighted in real-time

3. **Review Phase** (1-2s):
   - Llama 3.3 validates the diff
   - Chat shows: "✅ Review passed" or "❌ Issues found: [list]"
   - If issues: Auto-iterates (max 3 loops)

4. **User Action**:
   - `[✅ Accept All]` → Applies to editor, tab shows dirty marker (●)
   - `[Review Hunk]` → Accept specific hunks line-by-line
   - `[❌ Reject]` → Discards diff, reverts to original

### 4. **Green (Add) & Red (Delete) Diff Visualization** 🟢🔴

**Implementation:**

```javascript
// In Monaco Diff Editor:
const diffDecorations = [
  {
    range: new monaco.Range(15, 1, 15, 1),
    options: {
      isWholeLine: true,
      className: 'diff-line-added',
      glyphMarginClassName: 'codicon codicon-add',
      glyphMarginHoverMessage: { value: 'Added by Valkyrie' }
    }
  },
  {
    range: new monaco.Range(20, 1, 20, 1),
    options: {
      isWholeLine: true,
      className: 'diff-line-deleted',
      glyphMarginClassName: 'codicon codicon-remove',
      glyphMarginHoverMessage: { value: 'Deleted by Valkyrie' }
    }
  }
];

editor.deltaDecorations([], diffDecorations);
```

**CSS:**
```css
.diff-line-added {
  background-color: rgba(61, 214, 113, 0.15);
  border-left: 3px solid #3bd671;
}

.diff-line-deleted {
  background-color: rgba(255, 97, 112, 0.15);
  border-left: 3px solid #ff6170;
}

.diff-line-modified {
  background-color: rgba(250, 226, 175, 0.12);
  border-left: 3px solid #fae2af;
}
```

---

## 📋 Implementation Roadmap

### Phase 3.0: UI Architecture Refactor (Week 1)

**Files to Create/Modify:**

1. **`renderer/index.html`** - New top bar layout
   - Move AI panel to top sticky bar
   - Remove right sidebar AI controls
   - Add diff view container

2. **`renderer/styles.css`** - New component styles
   - Sticky top bar (height: 64px)
   - Split editor/diff view
   - Diff decorations (green/red)
   - Agent status badges

3. **`renderer/app.js`** - Refactor app architecture
   - `AgentPanelManager` - Top bar state & logic
   - `DiffViewManager` - Diff rendering & hunks
   - `EditorIntegration` - Monaco ↔ Diff sync
   - `ProviderManager` - Free tier detection

### Phase 3.1: Free Tier Provider Integration (Week 2)

**Files to Create:**

1. **`main/agents/provider-manager.js`**
   ```javascript
   class ProviderManager {
     async detectAvailable() {
       // Check: Pollinations free tier
       // Check: OpenRouter free tier
       // Check: Groq free tier
       // Check: Local Ollama
       // Return best available for each agent
     }
     
     async selectModelForRole(role) {
       // role: 'planner' | 'coder' | 'reviewer' | 'fast'
       // Returns: { provider, model, endpoint, rateLimit }
     }
     
     async callModel(role, prompt, context) {
       // Handles API calls with fallbacks
       // Retry logic for rate limits
       // Local Ollama fallback
     }
   }
   ```

2. **`main/agents/valkyrie-orchestrator.js`** - Multi-agent engine
   ```javascript
   class ValkyrieOrchestrator {
     async execute(userPrompt, context) {
       // 1. Planner: DeepSeek R1
       const plan = await this.planner.think(userPrompt, context);
       
       // 2. Coder: Qwen3-Coder (with retry loop)
       let diffs = await this.coder.generate(plan, context);
       
       // 3. Reviewer: Llama 3.3 (validation loop)
       let reviewed = await this.reviewer.validate(diffs, context);
       while (!reviewed.approved && reviewed.attempt < 3) {
         diffs = await this.coder.refactor(reviewed.feedback);
         reviewed = await this.reviewer.validate(diffs);
       }
       
       // 4. Return diffs to UI
       return { diffs, plan, reviewResult: reviewed };
     }
   }
   ```

### Phase 3.2: Live Editor Integration (Week 3)

**Files to Create:**

1. **`renderer/diff-manager.js`** - Diff view logic
   ```javascript
   class DiffManager {
     async showDiff(originalFile, proposedDiff) {
       // Parse diff hunks
       // Create side-by-side Monaco diff editor
       // Highlight added/deleted lines
       // Enable hunk-by-hunk acceptance
     }
     
     acceptHunk(hunkIndex) {
       // Apply specific hunk to active editor
     }
     
     acceptAll() {
       // Apply all hunks to active file
     }
     
     reject() {
       // Discard all hunks
     }
   }
   ```

2. **`renderer/editor-integration.js`** - Monaco ↔ Agent sync
   ```javascript
   class EditorIntegration {
     async getActiveFileContext() {
       // Return: { path, content, selection, language, cursorPos }
     }
     
     async applyDiff(filePath, diff) {
       // Apply diff to editor tab
       // Mark file as dirty
       // Save checkpoint
     }
     
     onEditorChange(callback) {
       // Subscribe to editor changes for context sync
     }
   }
   ```

### Phase 3.3: Multi-Agent Harmony (Week 4)

**Files to Create:**

1. **`main/agents/planner.js`**
2. **`main/agents/coder.js`**
3. **`main/agents/reviewer.js`**
4. **`main/agents/fast-inline.js`**

---

## 🔌 API/Provider Strategy

### Free Tier Sources

| Provider | Role | Model | Rate Limit | Cost |
|----------|------|-------|-----------|------|
| **Pollinations** | Any | Any | 10 req/min | Free |
| **OpenRouter** | Planner/Coder | DeepSeek R1, Qwen3 | 20 req/min | Free tier |
| **Groq** | Reviewer | Llama 3.3 70B | 30 req/min | Free |
| **Google AI Studio** | Fast Inline | Gemini 2.0 Flash | 60 req/min | Free |
| **Ollama (Local)** | Any (Fallback) | Mistral, Llama 2, Phi | Unlimited | Free (Local) |

### Fallback Chain
```
User Sends Prompt
    ↓
Try Pollinations (Fastest, free)
    ↓ (if fails/rate-limited)
Try OpenRouter free tier
    ↓ (if fails)
Try Groq directly
    ↓ (if fails)
Fall back to Local Ollama
    ↓ (if none available)
Show error: "All backends unavailable. Try again later."
```

---

## 🎬 User Flow Example

### Scenario: "Refactor this database module to use connection pooling"

1. **User Types in Top Bar:**
   ```
   [Planner] [Coder] [Reviewer] Status: Ready  ⚡
   [Refactor this database module to use connection pooling] [⚡ Send]
   ```

2. **Click Send → Valkyrie Executes:**

   ```
   ⏱ 0.5s  — Planning (DeepSeek R1):
            DeepSeek R1 is thinking...
            ✅ Plan ready
            
   ⏱ 2.0s  — Coding (Qwen3-Coder):
            Generating code changes...
            
   ⏱ 1.5s  — Review (Llama 3.3):
            Validating proposed changes...
            ✅ Review passed!
   ```

3. **Monaco Editor Splits into Diff View:**
   ```
   ORIGINAL (Left)              |  PROPOSED (Right)
   ────────────────────────────┼───────────────────
   1  const pool =             |  1  const pool =
   2    new Pool({             |  2    new Pool({
   3      max: 10              |  3      max: 100    ← MODIFIED (yellow)
   4    });                    |  4      idle: 30000 ← ADDED (green)
   5                           |  5      reapInterval: 1000 ← ADDED (green)
   6  connection.query(sql)    |  6    });
   7                           |  7
   8                           |  8  pool.query(sql)  ← MODIFIED (yellow)
   ```

4. **User Reviews & Decides:**
   - **Green (+)**: New code being added
   - **Red (-)**: Old code being removed
   - **Yellow (*)**: Modified code
   
   ```
   [✅ Accept All]  [👁️ Review Hunk]  [❌ Reject]
   ```

5. **Click Accept All:**
   - File tab shows dirty marker (●)
   - Original checkpoint saved to `.nova/checkpoints/`
   - User can undo via Cmd+Z or Ctrl+Z
   - Chat shows: "Changes applied! Save with Cmd+S"

---

## 🏗️ Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      NOVA IDE v1.0                              │
├─────────────────────────────────────────────────────────────────┤
│
│  ┌─ Renderer Process (renderer/)                               │
│  │  ├─ index.html                (DOM structure)                │
│  │  ├─ styles.css               (Styling for new layout)        │
│  │  ├─ app.js                   (Main orchestration)            │
│  │  ├─ agent-panel-manager.js   (Top sticky bar)                │
│  │  ├─ diff-manager.js          (Diff view logic)               │
│  │  ├─ editor-integration.js    (Monaco sync)                   │
│  │  └─ provider-detector.js     (Free tier detection)           │
│  │
│  ├─ Main Process (main/)                                        │
│  │  ├─ agents/                                                   │
│  │  │  ├─ valkyrie.js           (Orchestrator core)             │
│  │  │  ├─ planner.js            (DeepSeek R1)                   │
│  │  │  ├─ coder.js              (Qwen3-Coder)                   │
│  │  │  ├─ reviewer.js           (Llama 3.3)                     │
│  │  │  ├─ fast-inline.js        (Gemini Flash)                  │
│  │  │  └─ provider-manager.js   (API orchestration)             │
│  │  │
│  │  └─ checkpoint-manager.js    (Diff snapshots & rollbacks)    │
│  │
│  └─ Storage                                                      │
│     ├─ .nova/checkpoints/       (Pre-apply snapshots)           │
│     ├─ .nova/history.db         (SQLite: chat history)          │
│     └─ IndexedDB                (Client-side cache)             │
│
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

- [ ] **No API keys required** - App works with free tier APIs
- [ ] **Sticky top bar** - Chat input always accessible
- [ ] **Live diffs in editor** - Changes visible before accepting
- [ ] **Green/Red highlighting** - Clear visual diff feedback
- [ ] **4-agent orchestration** - All agents contribute in harmony
- [ ] **Rate-limit fallbacks** - Graceful degradation on API limits
- [ ] **Offline mode** - Local Ollama fallback when offline
- [ ] **Checkpoint system** - Instant undo/rollback of changes
- [ ] **< 2 min response time** - Fast enough for interactive work

---

## 📊 Timeline

| Phase | Week | Deliverable |
|-------|------|-------------|
| 3.0 | Week 1 | UI refactor + sticky top bar |
| 3.1 | Week 2 | Free tier provider integration |
| 3.2 | Week 3 | Live editor diff integration |
| 3.3 | Week 4 | Multi-agent orchestration |
| 3.4 | Week 5 | Testing + optimization |

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Run in dev mode
npm start

# Build for production
npm run build

# Run tests
npm test
```

---

## 📝 Notes for Implementation

1. **Don't require API keys upfront** - Detect available backends on startup
2. **Use Pollinations as primary** - Simple REST API, no auth needed
3. **Stream responses to UI** - Real-time progress updates via IPC
4. **Save checkpoints atomically** - Use file locks for concurrent access
5. **Honor offline mode** - Test with Ollama running locally
6. **Graceful degradation** - If all APIs fail, show helpful error message

