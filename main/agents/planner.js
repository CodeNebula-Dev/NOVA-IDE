/**
 * Planner Agent (DeepSeek R1 via OpenRouter)
 * Generates an implementation checklist based on user prompt and active file contexts.
 */

const { StreamParser, parsePartialJSONArray } = require('./parser');

async function runPlanner(userPrompt, contextData, apiKey, onThought, onPlanReady) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OpenRouter API Key is missing. Please type a valid OpenRouter API Key in the settings sidebar to use the Edit agent.");
  }

  // Use DeepSeek R1 via OpenRouter
  const model = "deepseek/deepseek-r1:free"; // Default to free tier
  const apiURL = "https://openrouter.ai/api/v1/chat/completions";

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

  const userContent = `Workspace Tree:
${contextData.treeText || "No file tree available"}

Current File: ${contextData.activeFilePath || "None"}
File Content:
\`\`\`
${contextData.activeFileContent || ""}
\`\`\`

User Request:
${userPrompt}`;

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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(line => line.trim().startsWith("data:"));
    
    for (const line of lines) {
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
        // Ignore lines that aren't valid JSON chunk events
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
