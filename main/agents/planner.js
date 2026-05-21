/**
 * Planner Agent (DeepSeek R1 via OpenRouter)
 * Generates an implementation checklist based on user prompt and active file contexts.
 */

const { StreamParser, parsePartialJSONArray } = require('./parser');

async function runPlanner(userPrompt, contextData, apiKey, onThought, onPlanReady) {
  const systemPrompt = `You are the Lead Architect Agent inside NOVA IDE. Your objective is to analyze a developer's request, inspect the codebase context, and construct a highly precise, actionable planning checklist of tasks.

Each task MUST specify:
1. id: unique string, e.g. "task-1"
2. description: what exactly needs to be modified
3. assignedFile: the relative file path that needs editing (e.g. "renderer/app.js" or "main.js")

Return your thought process fully inside <think>...</think> tags.
At the very end of your response, output a raw JSON array matching this typescript schema:
[
  { "id": "task-1", "description": "Create SQLite checkpoints table", "assignedFile": "main.js" }
]
Do not write markdown backticks or explanation texts outside the think tags except for the raw JSON payload.`;

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

  if (!apiKey || apiKey.trim() === "") {
    // Fall back to free Pollinations API
    const apiURL = "https://text.pollinations.ai/v1/chat/completions";
    const systemPromptFallback = `You are the Lead Architect Agent inside NOVA IDE.
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

    const body = JSON.stringify({
      messages: [
        { role: "system", content: systemPromptFallback },
        { role: "user", content: userContent }
      ],
      model: "openai",
      seed: 42,
      private: true
    });
    
    onThought("No API Key detected. Using free Pollinations fallback...\nThinking...");
    
    const response = await fetch(apiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    
    if (!response.ok) {
      throw new Error(`Pollinations free API error ${response.status}`);
    }
    
    const resText = await response.text();
    let resultText = "";
    try {
      const data = JSON.parse(resText);
      const msg = data?.choices?.[0]?.message;
      if (msg) {
        resultText = msg.content || "";
        const reasoning = msg.reasoning || "";
        if (reasoning) {
          onThought(reasoning);
          if (!resultText) {
            resultText = reasoning;
          }
        }
      } else {
        resultText = resText;
      }
    } catch (e) {
      resultText = resText;
    }
    
    // Extract thought logs inside <think>...</think>
    let thought = "";
    const thinkMatch = resultText.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thought = thinkMatch[1].trim();
      onThought(thought);
      resultText = resultText.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    } else {
      // If no think tag was found and we didn't output deep reasoning either, send completion notice
      if (!resText.includes('"reasoning"')) {
        onThought("Pollinations planning complete.");
      }
    }
    
    // Extract JSON payload using the new robust index matching
    let parsedPlan = null;
    const firstBracket = resultText.indexOf("[");
    const lastBracket = resultText.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const jsonStr = resultText.slice(firstBracket, lastBracket + 1);
      try {
        parsedPlan = JSON.parse(jsonStr.trim());
      } catch (e) {
        parsedPlan = parsePartialJSONArray(jsonStr);
      }
    }

    if (!parsedPlan || !Array.isArray(parsedPlan) || parsedPlan.length === 0) {
      // Try parsing the entire resultText just in case it didn't use brackets
      try {
        parsedPlan = JSON.parse(resultText.trim());
      } catch (e) {
        parsedPlan = parsePartialJSONArray(resultText);
      }
    }
    
    if (!parsedPlan || !Array.isArray(parsedPlan) || parsedPlan.length === 0) {
      console.warn("Valkyrie Planner fallback parsing failed, synthesizing default task.");
      const activeFile = contextData.activeFilePath || "main.js";
      parsedPlan = [
        {
          id: "task-1",
          description: userPrompt,
          assignedFile: activeFile
        }
      ];
      onThought("\n[Note: Planner JSON extraction was malformed. Auto-synthesized single-task execution plan to proceed.]");
    }
    
    onPlanReady(parsedPlan, true);
    return parsedPlan;
  }

  // Use DeepSeek R1 via OpenRouter
  const model = "deepseek/deepseek-r1:free"; // Default to free tier
  const apiURL = "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/CodeNebula-Dev/NOVA-IDE",
      "X-Title": "Nova IDE"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Planner API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullContent = "";
  let jsonBuffer = "";

  const streamParser = new StreamParser(
    (thoughtChunk) => {
      onThought(thoughtChunk);
    },
    (contentChunk) => {
      jsonBuffer += contentChunk;
      // Periodically try to parse partial array and stream to UI
      const partialPlan = parsePartialJSONArray(jsonBuffer);
      if (partialPlan && partialPlan.length > 0) {
        onPlanReady(partialPlan, false);
      }
    }
  );

  let streamBuffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

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
          const text = parsed?.choices?.[0]?.delta?.content || "";
          if (text) {
            fullContent += text;
            streamParser.feed(text);
          }
        } catch (e) {
          // Ignore JSON error
        }
      }
    }
  }

  streamParser.flush();
  
  // Final parse
  const finalPlan = parsePartialJSONArray(jsonBuffer);
  if (!finalPlan || finalPlan.length === 0) {
    throw new Error("Failed to extract a structured plan from Planner model response.");
  }

  onPlanReady(finalPlan, true);
  return finalPlan;
}

module.exports = {
  runPlanner
};
