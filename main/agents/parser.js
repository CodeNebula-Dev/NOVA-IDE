/**
 * Valkyrie Stream Parser Helper
 * Isolates <think> tags for real-time thought logging and parses streaming JSON payloads.
 */

class StreamParser {
  constructor(onThought, onContent) {
    this.onThought = onThought; // callback(chunk)
    this.onContent = onContent; // callback(chunk)
    
    this.buffer = "";
    this.inThink = false;
    this.hasThinkStarted = false;
    this.contentIndex = 0;
  }

  feed(chunk) {
    this.buffer += chunk;
    
    // Process the buffer to extract think content
    while (true) {
      if (!this.hasThinkStarted) {
        const thinkStartPos = this.buffer.indexOf("<think>");
        if (thinkStartPos !== -1) {
          this.hasThinkStarted = true;
          this.inThink = true;
          // Discard everything before <think> (or handle if there's pre-think content, but usually R1 starts with think)
          this.buffer = this.buffer.slice(thinkStartPos + 7);
          continue;
        } else {
          // If no <think> tag exists yet but we have text, check if it starts without it
          // In some fallbacks, the model might not output <think> tags.
          // If the buffer is long enough and doesn't contain '<', start treating as standard content.
          if (this.buffer.length > 50 && !this.buffer.includes("<")) {
            this.onContent(this.buffer);
            this.buffer = "";
          }
          break;
        }
      }

      if (this.inThink) {
        const thinkEndPos = this.buffer.indexOf("</think>");
        if (thinkEndPos !== -1) {
          const thoughtChunk = this.buffer.slice(0, thinkEndPos);
          if (thoughtChunk) {
            this.onThought(thoughtChunk);
          }
          this.inThink = false;
          this.buffer = this.buffer.slice(thinkEndPos + 8);
          continue;
        } else {
          // All of the current buffer is thought content (except maybe the trailing part if it has a partial '</think>')
          const endTagPotentialIndex = this.buffer.indexOf("</");
          if (endTagPotentialIndex !== -1 && endTagPotentialIndex > this.buffer.length - 8) {
            // Wait for next chunk to confirm if it's the closing tag
            const thoughtChunk = this.buffer.slice(0, endTagPotentialIndex);
            if (thoughtChunk) {
              this.onThought(thoughtChunk);
            }
            this.buffer = this.buffer.slice(endTagPotentialIndex);
          } else {
            this.onThought(this.buffer);
            this.buffer = "";
          }
          break;
        }
      }

      // If we got here, we are not in think and have already passed the think block
      this.onContent(this.buffer);
      this.buffer = "";
      break;
    }
  }

  flush() {
    if (this.buffer) {
      if (this.inThink) {
        this.onThought(this.buffer);
      } else {
        this.onContent(this.buffer);
      }
    }
    this.buffer = "";
  }
}

/**
 * Parses incomplete JSON streaming strings (e.g. progressive JSON plan lists).
 * Safely parses valid sub-elements of an array.
 */
function parsePartialJSONArray(jsonString) {
  let cleanString = jsonString.trim();
  
  // Try to locate JSON boundaries if model wrapped it in markdown
  const markdownJsonMatch = cleanString.match(/```json\s*([\s\S]*?)```/);
  if (markdownJsonMatch?.[1]) {
    cleanString = markdownJsonMatch[1].trim();
  } else {
    const rawMatch = cleanString.match(/```\s*([\s\S]*?)```/);
    if (rawMatch?.[1]) {
      cleanString = rawMatch[1].trim();
    }
  }

  // Remove trailing quotes, commas or brackets to see if we can parse
  if (cleanString.startsWith("[")) {
    if (!cleanString.endsWith("]")) {
      // Find the last completely closed object in the array
      let openBraces = 0;
      let inQuote = false;
      let lastClosedObjectIndex = -1;
      
      for (let i = 0; i < cleanString.length; i++) {
        const char = cleanString[i];
        if (char === '"' && cleanString[i - 1] !== '\\') {
          inQuote = !inQuote;
        }
        if (!inQuote) {
          if (char === '{') {
            openBraces++;
          } else if (char === '}') {
            openBraces--;
            if (openBraces === 0) {
              lastClosedObjectIndex = i;
            }
          }
        }
      }

      if (lastClosedObjectIndex !== -1) {
        try {
          const parseable = cleanString.slice(0, lastClosedObjectIndex + 1) + "]";
          return JSON.parse(parseable);
        } catch (e) {
          // Fall back to regex parsing if JSON.parse fails
        }
      }
    } else {
      try {
        return JSON.parse(cleanString);
      } catch (e) {
        // Fall back
      }
    }
  }

  // Regex-based robust parser for streaming tasks
  const tasks = [];
  const taskRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]+)"\s*,\s*"assignedFile"\s*:\s*"([^"]+)"\s*\}/g;
  let match;
  while ((match = taskRegex.exec(cleanString)) !== null) {
    tasks.push({
      id: match[1],
      description: match[2],
      assignedFile: match[3],
      status: "pending"
    });
  }

  return tasks;
}

module.exports = {
  StreamParser,
  parsePartialJSONArray
};
