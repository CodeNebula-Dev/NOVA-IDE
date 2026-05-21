/**
 * Reviewer Agent (Llama 3.3 70B via Groq or OpenRouter)
 * Reviews proposed file patches against strict coding rubrics and issues detailed JSON reviews.
 */

async function runReviewer(task, originalContent, proposedPatch, apiKeyMap, maxRetries = 2) {
  const hasGroqKey = Boolean(apiKeyMap.groq);
  const apiURL = hasGroqKey 
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
    
  const model = hasGroqKey
    ? "llama-3.3-70b-versatile"
    : "meta-llama/llama-3.3-70b-instruct:free";

  const authorizationHeader = hasGroqKey
    ? `Bearer ${apiKeyMap.groq}`
    : `Bearer ${apiKeyMap.openrouter || ""}`;

  let systemPrompt = `You are Llama 3.3 70B, the Expert Code Reviewer Agent inside NOVA IDE.
Your objective is to evaluate proposed code changes against the planned task, syntax constraints, and logical safety.

You MUST respond strictly with a raw, unquoted JSON object matching this schema:
{
  "approved": boolean,
  "score": number, // 0 to 100
  "feedback": "detailed description of issues found, or explanation of approval",
  "issues": [
    {
      "type": "syntax" | "logic" | "security" | "missing-imports",
      "severity": "critical" | "warning",
      "description": "Short explanation",
      "suggestedFix": "Code block or snippet"
    }
  ]
}

Rubric:
1. Syntax correctness (no missing brackets, no syntax errors).
2. Alignment with planned task (does it actually solve the problem?).
3. Code safety (no obvious memory leaks, resource leaks, or missing imports).

Do not output any introductory or concluding text, no markdown code block formatting. Only raw JSON.`;

  const userContent = `Task being completed:
${task.description}

Original Code Content:
\`\`\`
${originalContent || ""}
\`\`\`

Proposed Git Diffs:
\`\`\`
${proposedPatch}
\`\`\``;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationHeader,
        "HTTP-Referer": "https://github.com/CodeNebula-Dev/NOVA-IDE",
        "X-Title": "Nova IDE"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (attempt === maxRetries) throw new Error(`Reviewer API Error (${response.status}): ${errorText}`);
      continue;
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) {
      if (attempt === maxRetries) throw new Error("Reviewer returned an empty response.");
      continue;
    }

    try {
      const result = JSON.parse(rawText.trim());
      return {
        approved: Boolean(result.approved),
        score: Number(result.score || 0),
        feedback: result.feedback || "",
        issues: Array.isArray(result.issues) ? result.issues : []
      };
    } catch (e) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const result = JSON.parse(match[0]);
          return {
            approved: Boolean(result.approved),
            score: Number(result.score || 0),
            feedback: result.feedback || "",
            issues: Array.isArray(result.issues) ? result.issues : []
          };
        } catch (err) {
          // Inner parse failed
        }
      }
      
      if (attempt === maxRetries) {
        throw new Error("Failed to parse Reviewer JSON after maximum retries.");
      }
      // On retry, tell the system to strictly enforce JSON
      systemPrompt += "\n\nCRITICAL: YOUR LAST RESPONSE WAS NOT VALID JSON. YOU MUST RETURN RAW VALID JSON ONLY.";
    }
  }
}

module.exports = {
  runReviewer
};
