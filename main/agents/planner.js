/**
 * Planner Agent (Pollinations Free API)
 * Generates an implementation checklist based on user prompt and active file contexts.
 * Part of the SuperNova v1 engine — no API keys required.
 */

const { StreamParser, parsePartialJSONArray } = require('./parser');

async function runPlanner(userPrompt, contextData, onThought, onPlanReady) {
  const systemPrompt = `You are the Lead Architect Agent inside NOVA IDE, powered by SuperNova v1.
Your objective is to inspect the codebase context and developer request, and construct a precise plan of tasks as a JSON array.

CRITICAL GUIDELINES FOR PLANNING:
1. Divide complex developer requests into a sequential list of 3 to 8 atomic, high-granularity tasks.
2. DO NOT create a single massive task to rewrite or implement everything at once. Smaller, step-by-step tasks allow the coding agent to succeed with perfect formatting, correct structure, and syntax correctness.
3. Even if changes target a single file (e.g., "bachi_daemon.py"), split the implementation into separate logical steps. For example:
   - Task 1: Define core configuration schemas, imports, and global constants.
   - Task 2: Implement utility helper functions and structural classes.
   - Task 3: Implement core system event handlers or event listener classes.
   - Task 4: Set up the main program entrypoint and initialization loop.
4. Each task in the array MUST specify:
   - "id": unique string, e.g. "task-1", "task-2", etc.
   - "description": clear, actionable explanation of modifications to make in this specific step.
   - "assignedFile": relative file path that needs editing (e.g. "bachi_daemon.py").

Return a raw JSON array matching this schema:
[
  { "id": "task-1", "description": "Define configuration logic and imports", "assignedFile": "bachi_daemon.py" },
  { "id": "task-2", "description": "Implement the core file organizer class", "assignedFile": "bachi_daemon.py" }
]

CRITICAL: Return ONLY the raw JSON array. No other text, no markdown backticks, no explanations. Just the JSON array.`;

  let workspaceFilesText = "";
  if (contextData.workspaceFiles && contextData.workspaceFiles.length > 0) {
    workspaceFilesText = "\n\nWorkspace Files Content:\n" + contextData.workspaceFiles.map(f => {
      return `File: ${f.relativePath}\n\`\`\`\n${f.content}\n\`\`\``;
    }).join("\n\n");
  }

  const userContent = `Workspace Tree:
${contextData.treeText || "No file tree available"}${workspaceFilesText}

Current File: ${contextData.activeFilePath || "None"}
File Content:
\`\`\`
${contextData.activeFileContent || ""}
\`\`\`

User Request:
${userPrompt}`;

  // Use Pollinations free API — no API key needed
  const apiURL = "https://text.pollinations.ai/v1/chat/completions";
  
  onThought("SuperNova v1 is planning your implementation...\nThinking...");
  
  const maxRetries = 5;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  let response;
  let jsonBuffer = "";
  let finalPlan = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const initialTimeout = setTimeout(() => {
      console.warn("[Planner] Pollinations initial request timed out.");
      controller.abort();
    }, 45000);
    
    // Choose model dynamically to handle rate limits (429)
    const modelToUse = attempt === 1 ? "openai" : (attempt % 2 === 0 ? "llama" : "mistral");
    const body = JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      model: modelToUse,
      seed: 42,
      private: true,
      stream: true
    });
    
    try {
      response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal
      });
      
      clearTimeout(initialTimeout);
      
      if (!response.ok) {
        throw new Error(`Pollinations free API error ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";
      
      const streamParser = new StreamParser(
        (thoughtChunk) => {
          onThought(thoughtChunk);
        },
        (contentChunk) => {
          jsonBuffer += contentChunk;
          const partialPlan = parsePartialJSONArray(jsonBuffer);
          if (partialPlan && partialPlan.length > 0) {
            onPlanReady(partialPlan, false);
          }
        }
      );
      
      let heartbeatTimer = setTimeout(() => {
        console.warn("[Planner] Pollinations stream stalled. Aborting.");
        controller.abort();
      }, 20000);
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          clearTimeout(heartbeatTimer);
          if (done) break;
          
          heartbeatTimer = setTimeout(() => {
            console.warn("[Planner] Pollinations stream stalled. Aborting.");
            controller.abort();
          }, 20000);
          
          streamBuffer += decoder.decode(value, { stream: true });
          
          let lineIndex;
          while ((lineIndex = streamBuffer.indexOf("\n")) !== -1) {
            const line = streamBuffer.slice(0, lineIndex).trim();
            streamBuffer = streamBuffer.slice(lineIndex + 1);
            
            if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              if (dataStr === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(dataStr);
                const text = parsed?.choices?.[0]?.delta?.content || parsed?.choices?.[0]?.delta?.reasoning || "";
                if (text) {
                  streamParser.feed(text);
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      } finally {
        clearTimeout(heartbeatTimer);
        try {
          reader.releaseLock();
        } catch (e) {}
      }
      
      streamParser.flush();
      
      // Final plan extraction
      finalPlan = parsePartialJSONArray(jsonBuffer);
      break; // Success
    } catch (err) {
      clearTimeout(initialTimeout);
      if (attempt === maxRetries) {
        throw err;
      }
      const isRateLimitOrServerErr = err.message && (
        err.message.includes("429") || 
        err.message.includes("502") || 
        err.message.includes("503") || 
        err.message.includes("504") ||
        err.message.includes("timeout") ||
        err.message.includes("aborted")
      );
      const retryDelay = isRateLimitOrServerErr ? (attempt * 8000) : (attempt * 3000);
      onThought(`\n[Planner Warning: Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${retryDelay / 1000}s...]`);
      await delay(retryDelay);
    }
  }
  
  if (!finalPlan || finalPlan.length === 0) {
    console.warn("SuperNova Planner parsing failed, synthesizing default task.");
    const activeFile = contextData.activeFilePath || "main.js";
    finalPlan = [
      {
        id: "task-1",
        description: userPrompt,
        assignedFile: activeFile
      }
    ];
    onThought("\n[Note: Planner JSON extraction was malformed. Auto-synthesized single-task execution plan to proceed.]");
  }
  
  onPlanReady(finalPlan, true);
  return finalPlan;
}

module.exports = {
  runPlanner
};
