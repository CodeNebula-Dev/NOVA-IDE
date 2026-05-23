class StreamThinkFilter {
  constructor(onData) {
    this.onData = onData;
    this.inThink = false;
    this.buffer = "";
  }

  feed(chunk) {
    this.buffer += chunk;
    this.process();
  }

  process() {
    while (true) {
      if (!this.inThink) {
        const index = this.buffer.indexOf("<think>");
        if (index !== -1) {
          const textBefore = this.buffer.slice(0, index);
          if (textBefore) {
            this.onData(textBefore);
          }
          this.inThink = true;
          this.buffer = this.buffer.slice(index + 7);
        } else {
          const thinkTag = "<think>";
          let holdBackLen = 0;
          for (let i = 1; i < thinkTag.length; i++) {
            const suffix = this.buffer.slice(-i);
            if (thinkTag.startsWith(suffix)) {
              holdBackLen = i;
            }
          }
          if (holdBackLen > 0) {
            const textToEmit = this.buffer.slice(0, -holdBackLen);
            if (textToEmit) {
              this.onData(textToEmit);
            }
            this.buffer = this.buffer.slice(-holdBackLen);
          } else {
            this.onData(this.buffer);
            this.buffer = "";
          }
          break;
        }
      } else {
        const index = this.buffer.indexOf("</think>");
        if (index !== -1) {
          this.inThink = false;
          this.buffer = this.buffer.slice(index + 8);
        } else {
          const endThinkTag = "</think>";
          let holdBackLen = 0;
          for (let i = 1; i < endThinkTag.length; i++) {
            const suffix = this.buffer.slice(-i);
            if (endThinkTag.startsWith(suffix)) {
              holdBackLen = i;
            }
          }
          if (holdBackLen > 0) {
            this.buffer = this.buffer.slice(-holdBackLen);
          } else {
            this.buffer = "";
          }
          break;
        }
      }
    }
  }

  flush() {
    if (!this.inThink && this.buffer) {
      this.onData(this.buffer);
    }
    this.buffer = "";
  }
}

async function runCoder(task, fileContent, priorFeedback, apiKey, onDiffChunk, coderModel) {
  const lineCount = fileContent ? fileContent.split(/\r?\n/).length : 0;
  const isFeedbackEmpty = !priorFeedback || priorFeedback.length === 0;
  const forceOptionB = lineCount < 600 || !isFeedbackEmpty;

  let systemPrompt = "";
  if (forceOptionB) {
    systemPrompt = `You are the Lead Software Engineer Agent inside NOVA IDE. Your task is to execute the active architecture plan task and write file modifications.

CRITICAL RULE:
Because the target file is small (under 600 lines) or is being rewritten after prior mismatch feedback, you MUST use Option B: Full-File Replacement.
Option A (Search-and-Replace blocks) and Option C (Unified diffs) are STRICTLY FORBIDDEN and will fail patch matching!

Option B: Full-File Replacement.
Output the ENTIRE, COMPLETE file contents inside a single markdown code block matching the file type (e.g. \`\`\`python or \`\`\`javascript). Do not omit any lines, do not use comments like "# rest of code here", and write every single function, import, and helper completely:
\`\`\`[language]
[complete file contents]
\`\`\`

CRITICAL RULES — violating these will cause the task to fail:
1. Output the COMPLETE file content from the very first line to the very last line.
2. NEVER leave functions incomplete.
3. Every single import statement that the file needs MUST be present in the output.
4. Ensure your output is valid, compile-ready syntax for the target language.`;
  } else {
    systemPrompt = `You are the Lead Software Engineer Agent inside NOVA IDE. Your task is to execute the active architecture plan task and write file modifications.

You MUST output file modifications using ONE of these three formats:

Option A: Search-and-Replace Blocks (RECOMMENDED for most edits). Specify ONLY the exact code blocks to change:
<<<<<<< SEARCH
[exact existing lines to replace - copy them verbatim]
=======
[replacement lines]
>>>>>>> REPLACE

Option B: Full-File Replacement (USE THIS when: the file is new, short, or needs major restructuring, or when Option A repeatedly fails).
Output the ENTIRE file inside a single markdown code block:
\`\`\`[language]
[complete file contents]
\`\`\`

Option C: Unified diff format (only if Option A and B won't work):
--- [relativePath]
+++ [relativePath]
@@ -[startLine],[lineCount] +[startLine],[lineCount] @@
- [old code]
+ [new code]

CRITICAL RULES — violating these will cause the task to fail:
1. NEVER embed <<<<<<< SEARCH, =======, or >>>>>>> REPLACE markers inside actual code — these are ONLY output format markers.
2. NEVER emit incomplete code or half-written functions. Always complete every code block.
3. If unsure whether your search block will match exactly, use Option B (full file) instead.
4. Every import statement that the new code needs MUST be present in the output.
5. Choose Option B (full file) if the file is less than 600 lines OR if prior feedback mentions malformed diffs.
6. Ensure your output is valid, compile-ready syntax for the target language.`;
  }

  let workspaceFilesText = "";
  if (task.contextData && task.contextData.workspaceFiles && task.contextData.workspaceFiles.length > 0) {
    const otherFiles = task.contextData.workspaceFiles.filter(f => f.relativePath !== task.assignedFile);
    if (otherFiles.length > 0) {
      const isFree = !apiKey || apiKey.trim() === "";
      let allowedFiles = otherFiles;
      
      if (isFree) {
        // Filter to only files mentioned in the task description to save context
        const taskLower = task.description.toLowerCase();
        allowedFiles = otherFiles.filter(f => {
          const base = require('path').basename(f.relativePath).toLowerCase();
          return taskLower.includes(base) || taskLower.includes(require('path').parse(base).name);
        });
        
        // Fallback to first 2 files if no explicit matches
        if (allowedFiles.length === 0) {
          allowedFiles = otherFiles.slice(0, 2);
        }
      }

      let text = "";
      let charCount = 0;
      const maxChars = isFree ? 8000 : 100000;

      for (const f of allowedFiles) {
        const fileBlock = `File: ${f.relativePath}\n\`\`\`\n${f.content}\n\`\`\``;
        if (charCount + fileBlock.length > maxChars) {
          if (isFree) continue;
        }
        text += "\n\n" + fileBlock;
        charCount += fileBlock.length;
      }
      
      if (text) {
        workspaceFilesText = "\n\nOther Workspace Files for Context:" + text;
      }
    }
  }

  let userContent = `Active Task: ${task.description}
Target File: ${task.assignedFile}

Current File Content:
\`\`\`
${fileContent || ""}
\`\`\`${workspaceFilesText}`;

  if (priorFeedback && priorFeedback.length > 0) {
    const feedbackText = priorFeedback.join("\n");
    const hasMalformedDiff = feedbackText.toLowerCase().includes("malform") ||
                             feedbackText.toLowerCase().includes("syntax error") ||
                             feedbackText.toLowerCase().includes("no proposed diff") ||
                             feedbackText.toLowerCase().includes("stray diff marker") ||
                             feedbackText.toLowerCase().includes("incomplete") ||
                             feedbackText.toLowerCase().includes("could not be matched") ||
                             feedbackText.toLowerCase().includes("failed to apply") ||
                             feedbackText.toLowerCase().includes("patch failed");
    
    userContent += `\n\nPrior Review Feedback (FAILED VERIFICATION — attempt ${priorFeedback.length} of 3):
${feedbackText}

MANDATORY RETRY INSTRUCTIONS:
- Your previous output was rejected. You MUST produce working, syntax-clean code this time.
- ${hasMalformedDiff ? "⚠️ Your previous diff was MALFORMED. You MUST use Option B (full file replacement) this retry — output the COMPLETE file content inside a markdown code block." : "Carefully address ALL feedback points above."}
- NEVER leave functions incomplete. NEVER embed <<<<<<< SEARCH markers in actual code.`;
  }

  let model = "qwen/qwen-2.5-coder-32b-instruct:free"; // Default free coder tier
  if (coderModel) {
    const modelMap = {
      qwen: "qwen/qwen-2.5-coder-32b-instruct:free",
      gemini: "google/gemini-2.5-flash:free",
      llama: "meta-llama/llama-3.3-70b-instruct:free",
      deepseek: "deepseek/deepseek-r1:free",
      gemma: "google/gemma-3-27b-it:free"
    };
    if (modelMap[coderModel]) {
      model = modelMap[coderModel];
    } else if (coderModel.includes("/")) {
      model = coderModel;
    }
  }

  // Truncation detection logic
  function checkTruncation(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;

    // Check Option B (Full File)
    if (forceOptionB || (trimmed.includes("```") && !trimmed.includes("<<<<<<< SEARCH"))) {
      const fences = (trimmed.match(/```/g) || []).length;
      if (fences % 2 !== 0) return true; // Odd number of fences
    }

    // Check Option A (Search-and-Replace)
    if (trimmed.includes("<<<<<<< SEARCH")) {
      const lastSearch = trimmed.lastIndexOf("<<<<<<< SEARCH");
      const lastReplace = trimmed.lastIndexOf(">>>>>>> REPLACE");
      const lastEquals = trimmed.lastIndexOf("=======");
      if (lastSearch > lastReplace || lastEquals > lastReplace) return true;
    }

    return false;
  }

  // Encapsulated streaming API request helper
  const performStreamRequest = async (currentMessages) => {
    let outputText = "";

    if (!apiKey || apiKey.trim() === "") {
      // Fall back to free Pollinations API
      const apiURL = "https://text.pollinations.ai/v1/chat/completions";
      const maxRetries = 5;
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const initialTimeout = setTimeout(() => {
          console.warn("[Coder] Pollinations initial request timed out.");
          controller.abort();
        }, 45000);

        try {
          const response = await fetch(apiURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: currentMessages,
              model: "qwen-coder",
              seed: 42,
              private: true,
              stream: true
            }),
            signal: controller.signal
          });

          clearTimeout(initialTimeout);

          if (!response.ok) {
            throw new Error(`Pollinations free API error ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          const filter = new StreamThinkFilter((cleanText) => {
            outputText += cleanText;
            onDiffChunk(cleanText);
          });

          let streamBuffer = "";
          let heartbeatTimer = setTimeout(() => {
            console.warn("[Coder] Pollinations stream stalled. Aborting.");
            controller.abort();
          }, 20000);

          try {
            while (true) {
              const { done, value } = await reader.read();
              clearTimeout(heartbeatTimer);
              if (done) break;

              heartbeatTimer = setTimeout(() => {
                console.warn("[Coder] Pollinations stream stalled. Aborting.");
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
                      filter.feed(text);
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

          filter.flush();
          return outputText;
        } catch (err) {
          clearTimeout(initialTimeout);
          if (attempt === maxRetries) {
            throw err;
          }
          const isRateLimitOrServerErr = err.message && (
            err.message.includes("429") || 
            err.message.includes("502") || 
            err.message.includes("503") || 
            err.message.includes("504")
          );
          const retryDelay = isRateLimitOrServerErr ? (attempt * 8000) : (attempt * 3000);
          console.warn(`[Coder Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${retryDelay / 1000} seconds...]`);
          onDiffChunk(`\n\n[Nova: Fallback connection failed (${err.message}). Retrying in ${retryDelay / 1000}s...]\n\n`);
          await delay(retryDelay);
        }
      }
    } else {
      // Call OpenRouter
      const apiURL = "https://openrouter.ai/api/v1/chat/completions";
      const controller = new AbortController();
      const initialTimeout = setTimeout(() => {
        console.warn("[Coder] OpenRouter initial request timed out.");
        controller.abort();
      }, 45000);

      let response;
      try {
        response = await fetch(apiURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://github.com/CodeNebula-Dev/NOVA-IDE",
            "X-Title": "Nova IDE"
          },
          body: JSON.stringify({
            model,
            messages: currentMessages,
            stream: true
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(initialTimeout);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coder API Error (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      const filter = new StreamThinkFilter((cleanText) => {
        outputText += cleanText;
        onDiffChunk(cleanText);
      });

      let streamBuffer = "";
      let heartbeatTimer = setTimeout(() => {
        console.warn("[Coder] OpenRouter stream stalled. Aborting.");
        controller.abort();
      }, 20000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          clearTimeout(heartbeatTimer);
          if (done) break;

          heartbeatTimer = setTimeout(() => {
            console.warn("[Coder] OpenRouter stream stalled. Aborting.");
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
                const text = parsed?.choices?.[0]?.delta?.content || "";
                if (text) {
                  filter.feed(text);
                }
              } catch (e) {
                // Ignore JSON error
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

      filter.flush();
      return outputText;
    }
  };

  // Main prompt history
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  let accumulatedRawText = "";
  let accumulatedCode = "";
  let continuationCount = 0;
  const maxContinuations = 3;

  while (true) {
    const rawChunkText = await performStreamRequest(messages);
    
    // Clean any Pollinations ad or footer from the raw response
    const cleanRawChunk = cleanPollinationsAd(rawChunkText);
    
    accumulatedRawText += (accumulatedRawText ? "\n" : "") + cleanRawChunk;
    
    // Extract the code portion from this chunk
    const extractedCode = extractCodeFromResponse(cleanRawChunk);
    
    if (accumulatedCode) {
      accumulatedCode += "\n" + extractedCode;
    } else {
      accumulatedCode = extractedCode;
    }

    if (checkTruncation(accumulatedRawText) && continuationCount < maxContinuations) {
      continuationCount++;
      console.log(`[Coder] Output detected as truncated. Triggering continuation ${continuationCount}...`);

      // Feed back the partial assistant answer
      messages.push({ role: "assistant", content: cleanRawChunk });
      messages.push({
        role: "user",
        content: "Your previous response was truncated/cut off. Please CONTINUE writing the rest of the code EXACTLY where you left off. Do NOT repeat any code you already wrote, and do NOT output introductory text. Start immediately with the next characters/lines."
      });

      // Stream a smooth indicator to the UI
      onDiffChunk("\n\n[Nova: Continuing code generation...]\n\n");
    } else {
      break;
    }
  }

  // If the model was choosing Option A (Search-and-Replace blocks), return them as is.
  if (accumulatedCode.includes("<<<<<<< SEARCH") && accumulatedCode.includes(">>>>>>> REPLACE")) {
    return accumulatedCode.trim();
  }
  
  // Wrap in a clean markdown code fence matching the target file extension
  const ext = require('path').extname(task.assignedFile).slice(1);
  const lang = ext || "python";
  return `\`\`\`${lang}\n${accumulatedCode}\n\`\`\``.trim();
}

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
      if (inSearch && currentBlock) {
        currentBlock.search.push(line);
      } else if (inReplace && currentBlock) {
        currentBlock.replace.push(line);
      }
    }
  }

  // Fallback for truncated/unclosed blocks (missing final >>>>>>> REPLACE marker)
  if (inReplace && currentBlock && currentBlock.search.length > 0) {
    console.log("[Coder] Recovered unclosed search-and-replace block due to truncation.");
    blocks.push({
      search: currentBlock.search.join("\n"),
      replace: currentBlock.replace.join("\n")
    });
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
      continue;
    }

    // Try exact match with trimmed spaces on the whole block
    const searchStr = searchNormalized.trim();
    if (currentSource.includes(searchStr)) {
      currentSource = currentSource.replace(searchStr, replaceNormalized);
      continue;
    }

    // Strict contiguous relaxed matching
    const searchLines = searchNormalized.split("\n");
    const sourceLines = currentSource.split("\n");
    let matchStartIdx = -1;

    for (let i = 0; i <= sourceLines.length - searchLines.length; i++) {
      let isMatch = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (sourceLines[i + j].trim() !== searchLines[j].trim()) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        matchStartIdx = i;
        break; // Found contiguous match!
      }
    }

    if (matchStartIdx !== -1) {
      sourceLines.splice(matchStartIdx, searchLines.length, replaceNormalized);
      currentSource = sourceLines.join("\n");
    } else {
      // Fuzzy contiguous line matching fallback
      let fuzzyMatchStartIdx = -1;
      
      const cleanLine = (l) => {
        return l.trim().replace(/['"`\s;(),{}]/g, "").toLowerCase();
      };
      
      for (let i = 0; i <= sourceLines.length - searchLines.length; i++) {
        let isMatch = true;
        for (let j = 0; j < searchLines.length; j++) {
          if (cleanLine(sourceLines[i + j]) !== cleanLine(searchLines[j])) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          fuzzyMatchStartIdx = i;
          break;
        }
      }
      
      if (fuzzyMatchStartIdx !== -1) {
        sourceLines.splice(fuzzyMatchStartIdx, searchLines.length, replaceNormalized);
        currentSource = sourceLines.join("\n");
      } else {
        throw new Error(`Could not find a match for search block:\n${searchNormalized}`);
      }
    }
  }

  return hasCRLF ? currentSource.replace(/\n/g, "\r\n") : currentSource;
}

/**
 * Applies a unified diff or search-and-replace string to a source string, returning the modified source string.
 * This is a lightweight robust patch utility for the agent environment.
 */
function _applyPatchInternal(source, patch) {
  let cleaned = patch.trim();
  
  // 1. Try to extract markdown code fences or custom tag blocks (handling spaces/newlines robustly)
  const codeBlockMatch = cleaned.match(/```(?:[\w.+-]+)?\s*\r?\n([\s\S]*?)\r?\n\s*```/) || 
                          cleaned.match(/<nova-code>([\s\S]*?)<\/nova-code>/);
  
  let codeBlockContent = null;
  if (codeBlockMatch) {
    codeBlockContent = codeBlockMatch[1].trim();
  } else {
    // Check for unclosed markdown or tags due to truncation cutoffs (with optional spaces)
    const unclosedCodeBlockMatch = cleaned.match(/```(?:[\w.+-]+)?\s*\r?\n([\s\S]*)$/) ||
                                   cleaned.match(/<nova-code>([\s\S]*)$/);
    if (unclosedCodeBlockMatch) {
      codeBlockContent = unclosedCodeBlockMatch[1].trim();
      console.log("[Coder] Recovered unclosed code block content due to truncation.");
    }
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
  if (!hasDiffHeader || (codeBlockContent !== null && !hasFileHeaders)) {
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

function applyPatch(source, patch) {
  const hasCRLF = source.includes("\r\n");
  const result = _applyPatchInternal(source, patch);
  
  if (typeof result === 'string') {
    if (result.trim() === "" && source && source.trim() !== "") {
      throw new Error("Patch application resulted in empty content. Rejecting empty code replacement.");
    }
    
    let cleanLines = result.split(/\r?\n/);
    cleanLines = cleanLines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith("<<<<<<< SEARCH") && 
             !trimmed.startsWith("=======") && 
             !trimmed.startsWith(">>>>>>> REPLACE") &&
             !trimmed.startsWith(">>>>>>>");
    });
    
    const finalResult = cleanLines.join(hasCRLF ? "\r\n" : "\n");
    if (finalResult.trim() === "" && source && source.trim() !== "") {
      throw new Error("Patch application resulted in empty content after cleaning. Rejecting empty code replacement.");
    }
    return finalResult;
  }
  
  if (!result) {
    throw new Error("Patch application failed to produce any output.");
  }
  return result;
}

function cleanContinuationPrefix(text) {
  if (!text) return "";
  let cleaned = text.trim();
  
  // Regex to match conversational continuation headers securely
  const prefixRegexes = [
    /^(?:Here\s+is\s+the|Here's\s+the|Sure,\s+here's\s+the|Sure,\s+here\s+is\s+the|Certainly,\s+here\s+is\s+the)\s+(?:rest\s+of\s+the|continuation\s+of\s+the|remaining|continued)?\s*(?:code|file|script|implementation|imports|functions)(?:\s+from\s+where\s+it\s+was\s+cut\s+off|\s+due\s+to\s+truncation|\s+from\s+the\s+truncation\s+point)?:?\s*\r?\n?/i,
    /^(?:Continuing(?:\s+code|\s+file|\s+script|\s+implementation|\s+imports|\s+functions)?(?:\s+from\s+where\s+it\s+was\s+cut\s+off|\s+due\s+to\s+truncation|\s+from\s+the\s+truncation\s+point)?|Continuing\s+from\s+where\s+we\s+left\s+off|Continuing\s+from\s+the\s+truncation\s+point|Your\s+previous\s+response\s+was\s+truncated\.?\s+Here\s+is\s+the\s+continuation|Here\s+is\s+the\s+continuation):?\s*\r?\n?/i
  ];
  
  let changed = true;
  while (changed) {
    changed = false;
    for (const regex of prefixRegexes) {
      const replaced = cleaned.replace(regex, "");
      if (replaced !== cleaned) {
        cleaned = replaced.trim();
        changed = true;
      }
    }
  }
  
  return cleaned;
}

function cleanPollinationsAd(text) {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/---\s*\*?\*?Support\s+Pollinations\.AI:?\*?[\s\S]*$/i, "");
  cleaned = cleaned.replace(/🌸\s*\*?\*?Ad\*?[\s\S]*$/i, "");
  cleaned = cleaned.replace(/Powered\s+by\s+Pollinations\.AI[\s\S]*$/i, "");
  cleaned = cleaned.replace(/Support\s+our\s+mission\s+to\s+keep\s+AI[\s\S]*$/i, "");
  return cleaned.trim();
}

function extractCodeFromResponse(text) {
  const cleaned = cleanPollinationsAd(text.trim());
  
  // Try to find a completed code block (handling spaces/newlines robustly)
  const codeBlockMatch = cleaned.match(/```(?:[\w.+-]+)?\s*\r?\n([\s\S]*?)\r?\n\s*```/) || 
                          cleaned.match(/<nova-code>([\s\S]*?)<\/nova-code>/);
  if (codeBlockMatch) {
    return cleanContinuationPrefix(codeBlockMatch[1].trim());
  }
  
  // Try to find an unclosed code block due to truncation (with optional spaces)
  const unclosedMatch = cleaned.match(/```(?:[\w.+-]+)?\s*\r?\n([\s\S]*)$/) ||
                        cleaned.match(/<nova-code>([\s\S]*)$/);
  if (unclosedMatch) {
    return cleanContinuationPrefix(unclosedMatch[1].trim());
  }
  
  let code = cleaned;
  // If there's a closing fence but no opening fence in this chunk:
  if (!code.startsWith("```") && code.includes("```")) {
    const idx = code.lastIndexOf("```");
    code = code.slice(0, idx).trim();
  } else if (!code.startsWith("<nova-code>") && code.includes("</nova-code>")) {
    const idx = code.lastIndexOf("</nova-code>");
    code = code.slice(0, idx).trim();
  }
  
  return cleanContinuationPrefix(code);
}

module.exports = {
  runCoder,
  applyPatch,
  cleanPollinationsAd,
  extractCodeFromResponse
};

