# 🎨 Phase 3 Visual Implementation Reference

This document provides visual examples of how the new UI works and what users see at each step.

---

## Layout Before & After

### BEFORE (Phase 1/2)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: Nova IDE | Open Folder | Refresh | Terminal | Settings           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ ┌──────────┐ │
│  │ FILE TREE    │  │ MONACO EDITOR (center)              │ │ AI CHAT  │ │
│  │              │  │                                     │ │ PANEL    │ │
│  │ • index.js   │  │  function hello() {                 │ │          │ │
│  │ • app.js     │  │    return "world";                  │ │ Messages:│ │
│  │ • test.js    │  │  }                                  │ │ >        │ │
│  │              │  │                                     │ │          │ │
│  │              │  │                                     │ │ Input:   │ │
│  │ 280px        │  │          ∞ Flexible ∞              │ │ [......] │ │
│  │              │  │                                     │ │          │ │
│  └──────────────┘  └─────────────────────────────────────┘ └──────────┘ │
│                                                                 370px     │
├─────────────────────────────────────────────────────────────────────────┤
│ TERMINAL (hidden)                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### AFTER (Phase 3)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: Nova IDE | Open Folder | Refresh | Terminal | Settings           │
├─────────────────────────────────────────────────────────────────────────┤
│ STICKY AGENT PANEL (NEW):                                               │
│ [📝][💻][🧐][⚡] Ready 📂 3 files   ← Agent badges + status              │
│ [Type your prompt...                              ] [⚡Send][+Context][📋] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │ FILE TREE    │  │ MONACO EDITOR (Left) │  │ Monaco Diff (Right) │  │
│  │              │  │                      │  │                     │  │
│  │ • index.js   │  │  function hello() {  │  │  function hello() { │  │
│  │ • app.js     │  │    return "world";   │  │    return "world!"; │  │
│  │ • test.js    │  │  }                   │  │  }                  │  │
│  │              │  │                      │  │                     │  │
│  │ 280px        │  │    50% width         │  │    50% width        │  │
│  │              │  │                      │  │                     │  │
│  └──────────────┘  └──────────────────────┘  └─────────────────────┘  │
│                                                  (shows when AI active)  │
├─────────────────────────────────────────────────────────────────────────┤
│ TERMINAL (⌘T toggle)                                                    │
└─────────────────────────────────────────────────────────────────────────┘

CHAT HISTORY PANEL (slides in from right when clicked)
```

---

## User Interaction Flow

### Step 1: User Types Prompt (No Key Required!)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [📝][💻][🧐][⚡] Ready 📂 3 files                                        │
│ [Refactor this database module to use connection pooling] [⚡Send]       │
└─────────────────────────────────────────────────────────────────────────┘

Status: No provider selected yet
→ Click Send
```

### Step 2: Auto-Detect Providers (0.5s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [📝][💻][🧐][⚡] Processing ⏳ | Free APIs Detected                     │
│ • Planner: Pollinations (Free, No Key)                                   │
│ • Coder: OpenRouter Free Tier                                            │
│ • Reviewer: Groq (Free)                                                  │
│ • Fast: Google AI Studio (Free)                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Planning Phase (0.5-1s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [📝✨][💻][🧐][⚡] Thinking 💭 | DeepSeek R1 reasoning...               │
│ [Refactor this database...                     ] [⚡Send] ← Input locked  │
├─────────────────────────────────────────────────────────────────────────┤
│ CHAT HISTORY:                                                            │
│ You: "Refactor this database module to use connection pooling"           │
│ Nova: "📝 Planning: DeepSeek R1 thinking...                             │
│        1. Analyze current connection pattern                             │
│        2. Design pool initialization                                     │
│        3. Update queries to use pool                                     │
│        4. Add pool lifecycle management                                  │
│        ✅ Plan ready"                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 4: Coding Phase (1-2s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [📝][💻✨][🧐][⚡] Coding 📝 | Qwen3-Coder generating changes...        │
│ [Refactor this database...                     ] [⚡Send] ← Input locked  │
├─────────────────────────────────────────────────────────────────────────┤
│ EDITOR SPLITS - Diff View Appears:                                       │
│                                                                           │
│  ORIGINAL (Left)              │  PROPOSED (Right)                       │
│  ────────────────────────────┼──────────────────────                   │
│  1  const db = require()     │  1  const pg = require()                │
│  2  const pool = null        │  2  const Pool = pg.Pool                │
│  3                           │  3  const pool = new Pool({  ← ADDED    │
│  4                           │  4    host: 'localhost',   ← ADDED      │
│  5                           │  5    port: 5432,          ← ADDED      │
│  6  db.connect(...)  [DEL]  │  6    max: 20,             ← ADDED      │
│  7                           │  7    idleTimeout: 30000   ← ADDED      │
│  8                           │  8  });                    ← ADDED      │
│  9  db.query('SELECT...')    │  9  pool.query('SELECT...') ← MODIFIED  │
│                              │                                          │
│  COLOR LEGEND:                                                           │
│  🟢 GREEN = Added lines                                                  │
│  🔴 RED = Deleted lines                                                  │
│  🟡 YELLOW = Modified lines                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 5: Review Phase (1.5s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [📝][💻][🧐✨][⚡] Reviewing 🔍 | Llama 3.3 validating changes...      │
├─────────────────────────────────────────────────────────────────────────┤
│ CHAT:                                                                    │
│ Nova: "🔍 Review Phase: Llama 3.3 checking...                          │
│        ✅ Syntax valid                                                   │
│        ✅ No logic errors                                                │
│        ✅ Performance OK                                                 │
│        ✅ Security review passed                                         │
│        ✅ APPROVED! Confidence: 95%"                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ DIFF CONTROL BAR APPEARS:                                               │
│ ⚡ Proposed Valkyrie Changes                                             │
│                                          [✅ Accept All] [❌ Reject]    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 6: User Accepts (1-2s)
```
User sees:
┌──────────────────────────────┐
│ [✅ Accept All] [❌ Reject]  │
└──────────────────────────────┘

Clicks: [✅ Accept All]
```

### Step 7: Changes Applied
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [📝][💻][🧐][⚡] Ready 📂 3 files                                        │
│ [Type your prompt...                              ] [⚡Send][+Context][📋] │
├─────────────────────────────────────────────────────────────────────────┤
│ EDITOR (Diff closed, normal view)                                        │
│                                                                           │
│  ┌──────────────┐  ┌─────────────────────────────────────┐              │
│  │ • index.js   │  │  const pg = require('pg');          │ ← MODIFIED   │
│  │ • app.js ●   │  │  const Pool = pg.Pool;              │              │
│  │ • test.js    │  │  const pool = new Pool({            │ ← NEW        │
│  │              │  │    host: 'localhost',               │              │
│  │              │  │    port: 5432,                      │              │
│  │              │  │    max: 20,                         │              │
│  │              │  │    idleTimeout: 30000               │              │
│  │              │  │  });                                │              │
│  │              │  │  pool.query('SELECT...')            │ ← MODIFIED   │
│  │              │  │                                     │              │
│  └──────────────┘  └─────────────────────────────────────┘              │
│  ● = Dirty marker (unsaved)                                             │
│                                                                           │
│  CHAT:                                                                   │
│  Nova: "✅ Changes applied to app.js"                                   │
│        "💾 Save with Cmd+S or the file will sync"                       │
│        "Use Cmd+Z to undo if needed"                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme Reference

### Diff Colors (for Green/Red highlighting)

**Added Lines (Green)**
```css
.diff-line-added {
  background-color: rgba(61, 214, 113, 0.12);  /* Subtle green tint */
  border-left: 3px solid #3bd671;              /* Bright green border */
}
```
Visual: Lines added show with `🟢` green highlight

**Deleted Lines (Red)**
```css
.diff-line-deleted {
  background-color: rgba(255, 97, 112, 0.12); /* Subtle red tint */
  border-left: 3px solid #ff6170;             /* Bright red border */
}
```
Visual: Lines removed show with `🔴` red highlight

**Modified Lines (Yellow)**
```css
.diff-line-modified {
  background-color: rgba(250, 226, 175, 0.1); /* Subtle yellow tint */
  border-left: 3px solid #fae2af;             /* Bright yellow border */
}
```
Visual: Changed lines show with `🟡` yellow highlight

---

## Agent Badge States

### Ready (Idle)
```
[📝] [💻] [🧐] [⚡]
```
All badges inactive, waiting for prompt

### Active (During Execution)
```
[📝✨] [💻] [🧐] [⚡]    → Planning
[📝] [💻✨] [🧐] [⚡]    → Coding
[📝] [💻] [🧐✨] [⚡]    → Reviewing
[📝] [💻] [🧐] [⚡✨]    → Quick Suggestion
```

The active agent badge glows with animation

---

## Status Indicators

### Ready (Green dot)
```
● Ready
```
All systems operational, waiting for input

### Processing (Yellow pulsing dot)
```
● Processing...
```
Request in flight, agent thinking/generating

### Error (Red dot)
```
● Error
```
Something went wrong, check console

### Offline (Gray dot)
```
● Offline
```
Using local Ollama only

---

## Chat History Panel (Collapsible)

### Closed (Right edge)
```
IDE Grid takes full width
(No visible chat history)
```

### Open (Slides in from right)
```
┌─────────────────────────────────────────────┐
│ Chat History              [X]               │
├─────────────────────────────────────────────┤
│ > You: "refactor database..."   ← Click    │
│   Nova: "Planning..."                       │
│                                             │
│ > You: "explain this function"              │
│   Nova: "This function does..."             │
│                                             │
│ > You: "add error handling"                 │
│   Nova: "Sure, adding try-catch..."         │
│                                             │
│ [Load More...]                              │
└─────────────────────────────────────────────┘
        ↓ (280px wide panel)
```

Click message to reload context

---

## Free Tier Provider Status

When user sends first prompt, they see:

```
DETECTION PHASE (0.2s):
Testing available providers...

RESULT SCREEN:
✅ Planner      → Pollinations (Free, No Auth)
✅ Coder        → OpenRouter Free Tier
✅ Reviewer     → Groq (Free)
✅ Fast         → Google AI Studio (Free)

Usage Today:    0/200 requests
Status:         ✅ All systems go!
Internet:       ✅ Online
Local Fallback: Enabled (Ollama)

"No API keys required. Using free-tier models."
```

---

## Error Scenarios

### Scenario 1: All APIs Unavailable
```
❌ Error: No providers available
  
Suggestions:
1. Check internet connection
2. Install Ollama: https://ollama.ai
3. Run: ollama pull mistral

Fallback Mode: OFFLINE
Using local Ollama if available
```

### Scenario 2: Rate Limited
```
⚠️  Rate limit hit (20/20 requests used)

Retry Available In: 47 seconds
Fallback: Using local Ollama for this request
```

### Scenario 3: Network Error
```
❌ Network error: Connection timeout

Retrying...
[█████░░░░░░░░░░░░░░] 25% (Attempt 2 of 3)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | Send prompt (from input bar) |
| `Cmd+T` | Toggle terminal |
| `Cmd+Z` | Undo changes |
| `Cmd+S` | Save file |
| `Cmd+/` | Comment selection |
| `Cmd+D` | Select word |
| `Cmd+L` | Select line |
| `Cmd+Shift+L` | Select all occurrences |
| `Tab` | In prompt: insert tab (not move focus) |
| `Escape` | Close diff view (reject) |

---

## Mobile/Narrow Screen Layout

When window < 1200px wide:

```
┌──────────────────────────┐
│ TOPBAR (Mobile)          │
├──────────────────────────┤
│ AGENT PANEL (full width) │
├──────────────────────────┤
│ MOBILE LAYOUT:           │
│ Tabs                     │
│ ├─ File Tree (drawer)    │
│ ├─ Editor (full)         │
│ └─ [📋] Chat History     │
├──────────────────────────┤
│ Terminal (below)         │
└──────────────────────────┘
```

File tree and chat become drawers/modals

---

## Terminal Integration

### Normal View
```
┌─────────────────────────────────────────────────────┐
│ Editor + Diff                                       │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Terminal (⌘T to toggle)                            │
│ $ npm test                                          │
│ > passing: 24, failing: 0                          │
│ $ _                                                 │
└─────────────────────────────────────────────────────┘
```

### Terminal Hidden (Default)
```
┌─────────────────────────────────────────────────────┐
│ Editor + Diff (full height)                         │
│                                                     │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Tips for Users

### 1. Adding Context
```
Click [+Context] button
↓
Selected text from editor added to prompt
↓
Send normally
```

### 2. Reviewing Before Accept
```
See diff appears
↓
Read green/red highlights
↓
Click file in sidebar to see specific file
↓
Accept or Reject
```

### 3. Using Without Internet
```
Install Ollama: https://ollama.ai
↓
Run: ollama pull mistral
↓
Nova auto-detects and uses local Ollama
↓
Works offline!
```

### 4. Undoing Changes
```
Changes made? See file marked with ●
↓
Cmd+Z to undo
↓
Or manual revert via terminal: git checkout app.js
```

---

## Success Indicators

When Phase 3 is working properly, you'll see:

✅ **New sticky top bar** with agent badges
✅ **No right sidebar** (was 370px, now gone)
✅ **Diffs appear in-editor** when AI generates code
✅ **Green/Red highlights** for added/deleted lines
✅ **No API key prompts** (works with free tiers)
✅ **Fast response** (< 2 minutes per request)
✅ **All 4 agents visible** in badges
✅ **Works offline** (with local Ollama)

---

## Troubleshooting Visual Issues

| Issue | Solution |
|-------|----------|
| Agent panel not sticky | Check `.agent-panel-sticky { position: sticky }` in CSS |
| Diff not showing | Click [⚡ Send], wait for "Coding..." status |
| Colors not right | Update color values in `styles.css` |
| Text cut off | Check `overflow` and `text-overflow` properties |
| Panel layout broken | Verify `grid-template-columns: 280px 1fr` (was `280px 1fr 370px`) |
| Badges not glowing | Add `animation: pulse 1.5s infinite` to `.agent-badge.active` |

---

This visual guide should help you see what the UI/UX looks like and how users interact with it!

