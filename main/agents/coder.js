/**
 * Coder Agent (Qwen2.5-Coder-32B/72B via OpenRouter)
 * Executes a single planning task and outputs clean unified git-style diffs.
 */

async function runCoder(task, fileContent, priorFeedback, apiKey, onDiffChunk) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OpenRouter API Key is missing. Please type a valid OpenRouter API Key in the settings sidebar to use the Edit agent.");
  }

  const model = "qwen/qwen-2.5-coder-32b-instruct:free"; // Default free coder tier
  const apiURL = "https://openrouter.ai/api/v1/chat/completions";

  const systemPrompt = `You are the Lead Software Engineer Agent inside NOVA IDE. Your task is to execute the active architecture plan task and write file modifications.
You MUST output ONLY unified git-style diff format. No other explanations, no markdown wrapper around the diff except standard unified diff format starting with --- and +++ lines.

Format:
--- [relativePath]
+++ [relativePath]
@@ -[startLine],[lineCount] +[startLine],[lineCount] @@
- [old code]
+ [new code]

Ensure your edits are syntax-clean, compile-ready, and preserve existing style and comments.
Crucial: Do not output the entire file content, only output the surgical diff hunks.`;

  let userContent = `Active Task: ${task.description}
Target File: ${task.assignedFile}

Current File Content:
\`\`\`
${fileContent || ""}
\`\`\``;

  if (priorFeedback && priorFeedback.length > 0) {
    userContent += `\n\nPrior Review Feedback (FAILED VERIFICATION):
${priorFeedback.join("\n")}
Please rewrite the changes to fully resolve all these issues.`;
  }

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
    throw new Error(`Coder API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullDiff = "";

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
          fullDiff += text;
          onDiffChunk(text);
        }
      } catch (e) {
        // Ignore JSON error
      }
    }
  }

  return fullDiff.trim();
}

/**
 * Applies a unified diff string to a source string, returning the modified source string.
 * This is a lightweight robust patch utility for the agent environment.
 */
function applyPatch(source, patch) {
  const lines = source.split("\n");
  const patchLines = patch.split("\n");
  
  let currentLine = 0;
  const result = [];
  
  let i = 0;
  // Locate the first hunk header
  while (i < patchLines.length) {
    const line = patchLines[i];
    if (line.startsWith("@@")) {
      break;
    }
    i++;
  }

  if (i >= patchLines.length) {
    // If no hunk header is found, the coder might have just returned the new code.
    // Try to strip backticks and return if it looks like full content.
    let cleaned = patch.trim();
    if (cleaned.startsWith("```")) {
      const match = cleaned.match(/```(?:[\w.+-]+)?\n([\s\S]*?)```/);
      if (match) cleaned = match[1];
    }
    return cleaned;
  }

  let originalIndex = 0; // index in lines array
  
  while (i < patchLines.length) {
    const header = patchLines[i];
    if (!header.startsWith("@@")) {
      i++;
      continue;
    }

    // Parse @@ -start,count +start,count @@
    const match = header.match(/@@\s*-(\d+),?(\d*)\s*\+(\d+),?(\d*)\s*@@/);
    if (!match) {
      i++;
      continue;
    }

    const startOld = parseInt(match[1]) - 1; // 0-indexed
    const countOld = parseInt(match[2] || "1");
    
    // Add all lines from current index to startOld
    while (originalIndex < startOld && originalIndex < lines.length) {
      result.push(lines[originalIndex]);
      originalIndex++;
    }

    i++; // Move past @@ header
    
    const hunkOld = [];
    const hunkNew = [];
    
    while (i < patchLines.length && !patchLines[i].startsWith("@@")) {
      const line = patchLines[i];
      if (line.startsWith("-")) {
        hunkOld.push(line.slice(1));
      } else if (line.startsWith("+")) {
        hunkNew.push(line.slice(1));
      } else if (line.startsWith(" ")) {
        hunkOld.push(line.slice(1));
        hunkNew.push(line.slice(1));
      } else {
        // Fallback for lines without prefix (neutral context)
        hunkOld.push(line);
        hunkNew.push(line);
      }
      i++;
    }

    // Replace old lines with new lines
    result.push(...hunkNew);
    originalIndex += countOld;
  }

  // Append remaining original lines
  while (originalIndex < lines.length) {
    result.push(lines[originalIndex]);
    originalIndex++;
  }

  return result.join("\n");
}

module.exports = {
  runCoder,
  applyPatch
};
