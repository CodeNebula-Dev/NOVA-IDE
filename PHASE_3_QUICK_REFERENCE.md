# 🚀 Phase 3 Quick Reference Card

Print this or keep it handy while developing!

---

## ⚡ TL;DR (Too Long; Didn't Read)

**What:** Redesign NOVA IDE's UI/UX to rival Cursor  
**When:** 3-4 weeks  
**How:** Sticky top bar + free APIs + live diffs + 4 agents  
**Status:** Design complete, modules ready, ready for integration  

---

## 🗂️ The 5 New Components

### 1. Sticky Agent Panel (Top Bar)
```
[📝][💻][🧐][⚡] Ready 📂 3 files
[Type prompt here...              ] [⚡Send][+Context][📋]
```
**File:** `renderer/agent-panel-manager.js`  
**Purpose:** User input, status display

### 2. Diff Viewer
```
ORIGINAL (L)          │ PROPOSED (R)
─────────────────────┼──────────────
Line 1: old          │ Line 1: new   ← GREEN
                     │ Line 2: new   ← GREEN
Line 3: old ← RED    │
```
**File:** `renderer/diff-manager.js`  
**Purpose:** Show changes before accepting

### 3. Provider Detector
```
Tests: Pollinations, OpenRouter, Groq, Google, Ollama
Returns: Best provider for each agent role
Cache: 5 minutes
```
**File:** `renderer/provider-detector.js`  
**Purpose:** Auto-detect APIs (NO KEYS REQUIRED)

### 4. Main Process Agents (To Build)
- `planner.js` - DeepSeek R1 (strategic thinking)
- `coder.js` - Qwen3-Coder (code generation)
- `reviewer.js` - Llama 3.3 (code validation)
- `fast-inline.js` - Gemini Flash (quick suggestions)

### 5. IPC Bridge (To Update)
- `main.js` - Register Valkyrie IPC handlers
- `preload.js` - Expose valkyrie API to renderer

---

## 📚 Documentation Files

| File | Size | Purpose |
|------|------|---------|
| PHASE_3_UI_UX_REDESIGN.md | 450 lines | Vision & overview |
| PHASE_3_IMPLEMENTATION_GUIDE.md | 600 lines | Technical details |
| PHASE_3_VISUAL_GUIDE.md | 500 lines | Mockups & flows |
| PHASE_3_NEXT_STEPS.md | 400 lines | Action items |
| PHASE_3_COMPLETE_DOCUMENTATION_INDEX.md | 300 lines | Navigation |

**Total:** 2,250 lines of documentation

---

## ✅ What's Done

- [x] Design documents (5 files)
- [x] HTML structure (sticky panel added)
- [x] CSS styling (new components)
- [x] AgentPanelManager (230 lines, complete)
- [x] DiffManager (350 lines, complete)
- [x] ProviderDetector (300 lines, complete)

**Total:** 880 lines of production code + 2,250 lines of docs

---

## ⏳ What's Next

### This Week
- [ ] Remove old right sidebar from HTML
- [ ] Test new layout in browser
- [ ] Integrate manager modules into app.js

### Next Week  
- [ ] Create main/agents/ directory
- [ ] Build provider-manager.js
- [ ] Implement planner.js, coder.js, reviewer.js, fast-inline.js

### Week 3
- [ ] Wire IPC handlers
- [ ] End-to-end testing
- [ ] Performance tuning

### Week 4
- [ ] Error handling
- [ ] Offline fallback
- [ ] Documentation
- [ ] Release

---

## 🎨 Color Reference

**Added (Green):**
```css
background: rgba(61, 214, 113, 0.12);
border-left: 3px solid #3bd671;
```

**Deleted (Red):**
```css
background: rgba(255, 97, 112, 0.12);
border-left: 3px solid #ff6170;
```

**Modified (Yellow):**
```css
background: rgba(250, 226, 175, 0.1);
border-left: 3px solid #fae2af;
```

---

## 🔌 API Providers (Priority Order)

| Role | Primary | Secondary | Tertiary | Fallback |
|------|---------|-----------|----------|----------|
| Planner | OpenRouter | Pollinations | - | Ollama |
| Coder | OpenRouter | Pollinations | - | Ollama |
| Reviewer | Groq | OpenRouter | Pollinations | Ollama |
| Fast | Google | Groq | Pollinations | Ollama |

**Key:** All work WITHOUT API keys (free tier + no auth)

---

## 📊 Key Numbers

| Metric | Value |
|--------|-------|
| Files created | 3 JS modules |
| Lines of code | 880 lines |
| Documentation | 2,250 lines |
| HTML changes | ~50 lines |
| CSS changes | ~300 lines |
| Timeline | 3-4 weeks |
| APIs supported | 5 (+ Ollama local) |
| Agent types | 4 |
| UI components | 5 |

---

## 🎯 User Journey (TL;DR)

```
1. User types: "refactor database"
2. Click: [⚡Send]
3. System: Auto-detects free APIs (0.5s)
4. Planner: Thinks through task (0.5-1s)
5. Coder: Generates changes (1-2s)
6. Reviewer: Validates changes (1.5s)
7. User: Sees green/red diff in editor
8. User: Clicks [✅Accept]
9. File: Marked dirty, can undo
```

**Total Time:** ~4-6 seconds (vs. manual coding: 10-20 min)

---

## 🔑 Key Features

✨ **No API Keys** - Free tier APIs + local Ollama fallback  
✨ **Sticky Input** - Always accessible prompt bar  
✨ **Live Diffs** - See changes in-editor with green/red  
✨ **4 Agents** - Planner, Coder, Reviewer, Fast  
✨ **Auto-Detect** - Finds best available API for each role  
✨ **Offline Mode** - Works with local Ollama  
✨ **Professional UX** - Rivals Cursor, paid competitors  

---

## 💻 Running Locally

```bash
# Install dependencies
npm install

# Run in development
npm start

# Should see:
# 1. New sticky agent panel at top
# 2. File explorer on left (280px)
# 3. Monaco editor in center
# 4. NO right sidebar
# 5. Terminal at bottom (toggle with ⌘T)
```

---

## 🐛 Debugging

### Check Browser Console
```javascript
// Test AgentPanelManager
window.agentPanelManager → shows state

// Test DiffManager  
window.diffManager → shows state

// Test ProviderDetector
await ProviderDetector.detectAvailable() → shows APIs
```

### Check Electron Logs
```bash
# Main process logs appear in terminal
# Renderer logs in DevTools
```

### View Network Activity
```javascript
// In app.js init():
window.novaAPI.valkyrie.onEvent('valkyrie:status', (data) => {
  console.log('Valkyrie status:', data);
});
```

---

## 📁 File Structure (After Phase 3A)

```
renderer/
├── index.html                    (updated)
├── styles.css                    (updated)
├── app.js                        (needs updates)
├── agent-panel-manager.js        (NEW)
├── diff-manager.js              (NEW)
└── provider-detector.js         (NEW)

main/agents/                      (to create in 3B)
├── planner.js
├── coder.js  
├── reviewer.js
├── fast-inline.js
├── valkyrie.js
└── provider-manager.js
```

---

## 🎓 Key Concepts

**Sticky Panel**
- Component that stays at top while scrolling
- Uses `position: sticky; top: 52px`

**Diff Viewer**  
- Monaco diff editor with split pane
- Left: original, Right: proposed

**Provider Detection**
- HTTP health checks to detect available APIs
- Cached for 5 minutes
- Falls back to next provider if fails

**Multi-Agent Orchestration**
- Sequential: Planner → Coder → Reviewer
- Each agent streams output to UI
- Reviewer can reject, trigger coder to retry

**No API Keys**
- Uses free tier of public APIs
- Pollinations, OpenRouter, Groq, Google all have free tiers
- Local Ollama for complete offline

---

## 🚨 Common Pitfalls to Avoid

❌ Don't require API keys upfront  
✅ Auto-detect and prompt only if needed

❌ Don't show diffs in chat only  
✅ Show diffs in Monaco editor

❌ Don't make right sidebar wide  
✅ Use full-width center editor

❌ Don't forget offline scenario  
✅ Always support local Ollama

❌ Don't mix agent responsibilities  
✅ Keep each agent focused on one task

---

## 📞 Quick Links

- **Design Overview:** PHASE_3_UI_UX_REDESIGN.md
- **Implementation:** PHASE_3_IMPLEMENTATION_GUIDE.md  
- **Visuals:** PHASE_3_VISUAL_GUIDE.md
- **Next Steps:** PHASE_3_NEXT_STEPS.md
- **Navigation:** PHASE_3_COMPLETE_DOCUMENTATION_INDEX.md

---

## ⚙️ Configuration

No configuration needed! The app:
- Auto-detects available APIs
- Caches results
- Falls back intelligently
- Stores chat history in SQLite

---

## 🏁 Success Checklist

- [ ] New sticky panel visible
- [ ] Old right sidebar removed
- [ ] Diffs display in Monaco
- [ ] Green/red highlighting works
- [ ] Status badges show
- [ ] No API key prompts
- [ ] All 4 agents active
- [ ] Works offline with Ollama
- [ ] < 2 min response time
- [ ] Can undo changes (Cmd+Z)

When all checked: **Phase 3 is complete! 🎉**

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Prompt → Diff | < 2 min | TBD |
| API Detection | < 1 sec | TBD |
| Monaco Load | < 500ms | ✅ |
| Terminal Spawn | < 300ms | ✅ |
| File Tree Render | < 100ms | ✅ |

---

## 🎬 Ready to Start?

1. **Read:** PHASE_3_NEXT_STEPS.md (5 min)
2. **Open:** renderer/index.html (in editor)
3. **Remove:** Old right sidebar code
4. **Run:** npm start (test in browser)
5. **Check:** Browser console for logs
6. **Continue:** Follow PHASE_3_IMPLEMENTATION_GUIDE.md

---

Keep this card handy! 🚀

Last updated: May 21, 2026

