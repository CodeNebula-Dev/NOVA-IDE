/**
 * Planner Agent — SuperNova v1 Pipeline
 * 
 * Generates an implementation checklist based on user prompt and active file contexts.
 * Routes through the LLM Gateway for provider-agnostic operation.
 */

const { StreamParser, parsePartialJSONArray } = require('./parser');
const { callLLMStream, consumeStream } = require('./llm-gateway');

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

  onThought("SuperNova v1 is planning your implementation...\nThinking...");
  
  let jsonBuffer = "";
  let finalPlan = null;
  
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  try {
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

    const streamObj = await callLLMStream(messages, {
      purpose: 'plan',
      temperature: 0.2,
      maxTokens: 4096,
      timeout: 45000
    });

    await consumeStream(streamObj, (chunk) => {
      streamParser.feed(chunk);
    }, { heartbeatTimeout: 20000 });

    streamParser.flush();
    
    // Final plan extraction
    finalPlan = parsePartialJSONArray(jsonBuffer);
  } catch (err) {
    // If streaming fails completely, try non-streaming via gateway
    console.warn(`[Planner] Streaming failed (${err.message}), attempting non-streaming fallback...`);
    try {
      const { callLLM } = require('./llm-gateway');
      const rawText = await callLLM(messages, { purpose: 'plan', temperature: 0.2, maxTokens: 4096 });
      onThought(rawText);
      finalPlan = parsePartialJSONArray(rawText);
    } catch (fallbackErr) {
      throw new Error(`Planning failed: ${fallbackErr.message}`);
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
