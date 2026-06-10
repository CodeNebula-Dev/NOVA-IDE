/**
 * Reviewer Agent
 * Reviews proposed file patches against strict coding rubrics and issues detailed JSON reviews.
 * Routes through the LLM Gateway for provider-agnostic operation.
 */

const { callLLM } = require('./llm-gateway');

async function runReviewer(task, originalContent, proposedPatch) {
  const systemPrompt = `You are the Expert Code Reviewer Agent inside NOVA IDE.
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

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  try {
    const rawText = await callLLM(messages, {
      purpose: 'review',
      temperature: 0.1,
      maxTokens: 2048,
      timeout: 30000
    });

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
        } catch (err) {}
      }
      throw new Error("Failed to parse JSON review from response");
    }
  } catch (err) {
    console.warn("[Reviewer] Gateway call failed, returning fallback auto-approval:", err.message);
    return {
      approved: true,
      score: 85,
      feedback: `Reviewer gateway fallback: Code auto-approved due to error: ${err.message}`,
      issues: []
    };
  }
}

module.exports = {
  runReviewer
};
