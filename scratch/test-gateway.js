const llmGateway = require('../main/agents/llm-gateway');

async function test() {
  console.log("=== Testing LLM Gateway ===");
  
  // 1. Check current config
  const config = llmGateway.getProviderConfig();
  console.log("Default Config Preferred Provider:", config.preferredProvider);
  console.log("Default Models Configured:", JSON.stringify(config.models, null, 2));

  // 2. Check active provider info
  const info = llmGateway.getActiveProviderInfo();
  console.log("Active Provider Chain:", info.providerChain);
  console.log("Ollama Available Status:", info.ollamaAvailable);
  console.log("Groq Configured Status:", info.groqConfigured);

  // 3. Test checking Ollama (non-blocking)
  console.log("Checking Ollama status...");
  const check = await llmGateway.checkOllama();
  console.log("Ollama check result:", check);

  // 4. Test a sample prompt call via LLM Gateway (this should fall back to Pollinations/openai)
  console.log("Calling LLM Gateway with a simple prompt (expecting Pollinations fallback)...");
  try {
    const response = await llmGateway.callLLM([
      { role: 'user', content: 'Say hello in 3 words' }
    ], { purpose: 'chat', maxTokens: 100 });
    console.log("Gateway Response:", response.trim());
    console.log("SUCCESS!");
  } catch (err) {
    console.error("Gateway Call Failed:", err);
  }
}

test().catch(console.error);
