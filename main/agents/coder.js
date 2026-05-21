/**
 * Coder Agent (Qwen2.5-Coder-32B/72B via OpenRouter)
 * Executes a single planning task and outputs clean unified git-style diffs.
 */

async function runCoder(task, fileContent, priorFeedback, apiKey, onDiffChunk) {
  const systemPrompt = `You are the Lead Software Engineer Agent inside NOVA IDE. Your task is to execute the active architecture plan task and write file modifications.
You MUST output surgical or full-file code modifications using ONE of these three formats:

Option A: Search-and-Replace Blocks (Highly recommended for surgical edits). Use this format to specify blocks of code you want to replace:
<<<<<<< SEARCH
[exact existing lines of code to modify]
=======
[new replacement code lines]
>>>>>>> REPLACE

Option B: Full-File Replacement (Use this if the target file is corrupted, severely truncated, or has pre-existing syntax errors that need fixing). Output the ENTIRE syntax-clean file inside a standard markdown code block:
\`\`\`[language]
[entire file content]
\`\`\`

Option C: Unified git-style diff format:
--- [relativePath]
+++ [relativePath]
@@ -[startLine],[lineCount] +[startLine],[lineCount] @@
- [old code]
+ [new code]

Ensure your edits are syntax-clean, compile-ready, and preserve existing style and comments.
Choose the format that is safest and least error-prone for the target task. If the existing file has syntax errors, Option B (Full-File) is highly recommended.`;

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

  if (!apiKey || apiKey.trim() === "") {
    // Fall back to free Pollinations API
    const apiURL = "https://text.pollinations.ai/v1/chat/completions";
    
    onDiffChunk("No API Key detected. Using free Pollinations fallback...\n");
    
    const maxRetries = 3;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(apiURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
            model: "openai",
            seed: 42,
            private: true,
            stream: true
          })
        });
        
        if (!response.ok) {
          throw new Error(`Pollinations free API error ${response.status}`);
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
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
        
        return fullDiff.trim();
      } catch (err) {
        if (attempt === maxRetries) {
          throw err;
        }
        onDiffChunk(`[Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in 3 seconds...]\n`);
        await delay(3000);
      }
    }
  }

  const model = "qwen/qwen-2.5-coder-32b-instruct:free"; // Default free coder tier
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
 * Applies a search-and-replace block patch to a source string.
 */
function applySearchReplaceBlocks(source, patch) {
  // 1. Robust state-based parsing of blocks
  const lines = patch.split(/\r?\n/);
  const blocks = [];
  let currentBlock = null;
  let inSearch = false;
  let inReplace = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith("<<<<<<< SEARCH")) {
      inSearch = true;
      inReplace = false;
      currentBlock = { search: [], replace: [] };
    } else if (trimmedLine.startsWith("=======") && inSearch) {
      inSearch = false;
      inReplace = true;
    } else if (trimmedLine.startsWith(">>>>>>> REPLACE") && inReplace) {
      inReplace = false;
      blocks.push({
        search: currentBlock.search.join("\n"),
        replace: currentBlock.replace.join("\n")
      });
      currentBlock = null;
    } else {
      if (inSearch) {
        currentBlock.search.push(line);
      } else if (inReplace) {
        currentBlock.replace.push(line);
      }
    }
  }

  if (blocks.length === 0) return null;

  // 2. Normalize source and blocks to LF line endings for robust replacement
  const hasCRLF = source.includes("\r\n");
  let currentSource = source.replace(/\r\n/g, "\n");

  for (const block of blocks) {
    const searchNormalized = block.search.replace(/\r\n/g, "\n");
    const replaceNormalized = block.replace.replace(/\r\n/g, "\n");

    // Skip empty search blocks if they don't make sense
    if (searchNormalized.trim() === "") {
      if (currentSource.trim() === "") {
        currentSource = replaceNormalized;
      } else {
        currentSource = currentSource + "\n" + replaceNormalized;
      }
      continue;
    }

    // Try exact match first
    if (currentSource.includes(searchNormalized)) {
      currentSource = currentSource.replace(searchNormalized, replaceNormalized);
    } else {
      // Try exact match with trimmed spaces
      const searchStr = searchNormalized.trim();
      if (currentSource.includes(searchStr)) {
        currentSource = currentSource.replace(searchStr, replaceNormalized);
      } else {
        // Line-by-line fuzzy match (ignoring leading/trailing whitespace on each line)
        const searchLines = searchNormalized.split("\n").map(l => l.trim()).filter(Boolean);
        if (searchLines.length > 0) {
          const sourceLines = currentSource.split("\n");
          let foundStart = -1;
          for (let i = 0; i < sourceLines.length; i++) {
            if (sourceLines[i].trim() === searchLines[0]) {
              let match = true;
              for (let j = 0; j < searchLines.length; j++) {
                if (i + j >= sourceLines.length || sourceLines[i + j].trim() !== searchLines[j]) {
                  match = false;
                  break;
                }
              }
              if (match) {
                foundStart = i;
                break;
              }
            }
          }
          if (foundStart !== -1) {
            let sourceLineIndex = foundStart;
            let matchedSearchCount = 0;
            const linesToReplace = [];
            while (sourceLineIndex < sourceLines.length && matchedSearchCount < searchLines.length) {
              if (sourceLines[sourceLineIndex].trim() === searchLines[matchedSearchCount]) {
                matchedSearchCount++;
              }
              linesToReplace.push(sourceLineIndex);
              sourceLineIndex++;
            }
            if (matchedSearchCount === searchLines.length) {
              sourceLines.splice(foundStart, linesToReplace.length, replaceNormalized);
              currentSource = sourceLines.join("\n");
            }
          }
        }
      }
    }
  }

  return hasCRLF ? currentSource.replace(/\n/g, "\r\n") : currentSource;
}

/**
 * Applies a unified diff or search-and-replace string to a source string, returning the modified source string.
 * This is a lightweight robust patch utility for the agent environment.
 */
function applyPatch(source, patch) {
  let cleaned = patch.trim();
  
  // 1. Try to extract markdown code fences or custom tag blocks
  const codeBlockMatch = cleaned.match(/```(?:[\w.+-]+)?\n([\s\S]*?)```/) || 
                         cleaned.match(/<nova-code>([\s\S]*?)<\/nova-code>/);
  
  let codeBlockContent = null;
  if (codeBlockMatch) {
    codeBlockContent = codeBlockMatch[1].trim();
  }

  const targetContent = codeBlockContent !== null ? codeBlockContent : cleaned;

  // 2. Check for Search-and-Replace blocks
  if (targetContent.includes("<<<<<<< SEARCH") && targetContent.includes(">>>>>>> REPLACE")) {
    const srPatched = applySearchReplaceBlocks(source, targetContent);
    if (srPatched !== null) {
      return srPatched;
    }
  }

  // 3. Determine if it is a unified diff or a complete file replacement.
  // A valid unified diff MUST contain a header block starting with @@ -L,C +L,C @@.
  const diffHeaderRegex = /@@\s*-\d+,?\d*\s*\+\d+,?\d*\s*@@/;
  const hasDiffHeader = diffHeaderRegex.test(targetContent);
  const hasFileHeaders = targetContent.includes("--- ") && targetContent.includes("+++ ");

  // 4. Fall back to complete file replacement if it does not look like a unified diff.
  if (!hasDiffHeader || (codeBlockMatch && !hasFileHeaders)) {
    if (codeBlockContent !== null) {
      return codeBlockContent;
    }
    // Clean potential git headers from full file outputs
    return cleaned.replace(/^--- .*\n/gm, "").replace(/^\+\+\+ .*\n/gm, "").trim();
  }

  // 5. Parse as a unified diff
  const lines = source.split(/\r?\n/);
  const patchLines = targetContent.split(/\r?\n/);
  const result = [];
  
  let i = 0;
  // Find first @@ header
  while (i < patchLines.length) {
    if (patchLines[i].startsWith("@@")) break;
    i++;
  }

  let originalIndex = 0; 
  
  // Clean line helper for fuzzy matching
  function cleanLine(line) {
    return line.trim().replace(/['"`\s;(),{}]/g, "").toLowerCase();
  }
  
  function checkMatch(linesArr, hunkOldArr, startIndex) {
    if (startIndex < 0 || startIndex + hunkOldArr.length > linesArr.length) return false;
    for (let j = 0; j < hunkOldArr.length; j++) {
      const lineA = cleanLine(linesArr[startIndex + j]);
      const lineB = cleanLine(hunkOldArr[j]);
      if (lineA !== lineB) {
        return false;
      }
    }
    return true;
  }
  
  while (i < patchLines.length) {
    const header = patchLines[i];
    if (!header.startsWith("@@")) {
      i++;
      continue;
    }

    const match = header.match(/@@\s*-(\d+),?(\d*)\s*\+(\d+),?(\d*)\s*@@/);
    if (!match) {
      i++;
      continue;
    }

    const startOld = parseInt(match[1]) - 1; 
    const countOld = parseInt(match[2] || "1");
    
    i++; 
    
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
        hunkOld.push(line);
        hunkNew.push(line);
      }
      i++;
    }

    // Fuzzy Search for hunkOld
    let matchIndex = -1;
    if (hunkOld.length === 0) {
      matchIndex = Math.max(0, Math.min(startOld, lines.length));
    } else {
      const searchRadius = 150; // Search 150 lines up and down
      for (let offset = 0; offset <= searchRadius; offset++) {
        if (checkMatch(lines, hunkOld, startOld + offset)) {
          matchIndex = startOld + offset;
          break;
        }
        if (offset > 0 && checkMatch(lines, hunkOld, startOld - offset)) {
          matchIndex = startOld - offset;
          break;
        }
      }
    }

    if (matchIndex !== -1) {
      // Apply diff hunks safely
      while (originalIndex < matchIndex && originalIndex < lines.length) {
        result.push(lines[originalIndex]);
        originalIndex++;
      }
      result.push(...hunkNew);
      originalIndex += hunkOld.length;
    } else {
      // Fallback to strict start line
      while (originalIndex < startOld && originalIndex < lines.length) {
        result.push(lines[originalIndex]);
        originalIndex++;
      }
      result.push(...hunkNew);
      originalIndex += countOld;
    }
  }

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
