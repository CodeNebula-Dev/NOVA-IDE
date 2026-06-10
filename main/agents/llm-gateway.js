/**
 * LLM Gateway — Centralized AI Provider Routing for Nova IDE
 * 
 * Routes all LLM calls through a priority chain of providers:
 *   Default:   Free cloud APIs (Groq free tier → Pollinations)
 *   Optional:  Ollama (local, for powerful devices)
 * 
 * Features:
 *   - Unified callLLM() and callLLMStream() interfaces
 *   - Automatic provider fallback on failure
 *   - Provider health tracking (marks providers "down" temporarily)
 *   - Ollama auto-detection and setup automation
 *   - Configurable via get/setProviderConfig()
 */

const { execSync, exec } = require('child_process');
const path = require('path');

// ============================================================
// Provider Configuration
// ============================================================

const DEFAULT_CONFIG = {
  preferredProvider: 'auto',  // 'auto' | 'ollama' | 'groq' | 'pollinations'
  groqApiKey: '',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: '',            // Empty = use default role-specific models or auto-fallback
  models: {
    code:   { ollama: 'qwen2.5-coder:7b', groq: 'llama-3.1-8b-instant', pollinations: 'qwen-coder' },
    chat:   { ollama: 'llama3.1:8b',       groq: 'llama-3.1-8b-instant', pollinations: 'openai' },
    plan:   { ollama: 'llama3.1:8b',       groq: 'llama-3.1-8b-instant', pollinations: 'openai' },
    review: { ollama: 'llama3.1:8b',       groq: 'llama-3.1-8b-instant', pollinations: 'openai' }
  }
};

let currentConfig = { ...DEFAULT_CONFIG };

// Provider health tracking
const providerHealth = {
  ollama:       { failures: 0, lastFailure: 0, cooldownMs: 60000 },
  groq:         { failures: 0, lastFailure: 0, cooldownMs: 30000 },
  pollinations: { failures: 0, lastFailure: 0, cooldownMs: 15000 }
};

// ============================================================
// Config Management
// ============================================================

function getProviderConfig() {
  return { ...currentConfig };
}

function setProviderConfig(newConfig) {
  currentConfig = { ...currentConfig, ...newConfig };
  // Reset health tracking when config changes
  Object.keys(providerHealth).forEach(p => {
    providerHealth[p].failures = 0;
    providerHealth[p].lastFailure = 0;
  });
  return currentConfig;
}

function isProviderHealthy(provider) {
  const health = providerHealth[provider];
  if (!health) return false;
  if (health.failures < 3) return true;
  // Check if cooldown has elapsed
  const elapsed = Date.now() - health.lastFailure;
  if (elapsed > health.cooldownMs) {
    health.failures = 0; // Reset after cooldown
    return true;
  }
  return false;
}

function markProviderFailed(provider) {
  const health = providerHealth[provider];
  if (health) {
    health.failures++;
    health.lastFailure = Date.now();
  }
}

function markProviderSuccess(provider) {
  const health = providerHealth[provider];
  if (health) {
    health.failures = 0;
    health.lastFailure = 0;
  }
}

// ============================================================
// Ollama Detection & Setup
// ============================================================

let ollamaAvailable = null; // null = unknown, true/false = checked
let installedOllamaModels = [];

function getOllamaModelForPurpose(purpose) {
  if (currentConfig.ollamaModel) {
    return currentConfig.ollamaModel;
  }
  const defaultModel = currentConfig.models[purpose]?.ollama || 'llama3.1:8b';
  const isInstalled = installedOllamaModels.some(m => 
    m === defaultModel || m.startsWith(defaultModel + ':') || defaultModel.startsWith(m + ':')
  );
  if (isInstalled) {
    return defaultModel;
  }
  if (installedOllamaModels.length > 0) {
    return installedOllamaModels[0];
  }
  return defaultModel;
}

async function checkOllama() {
  try {
    const response = await fetch(`${currentConfig.ollamaEndpoint}/api/tags`, {
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      installedOllamaModels = (data.models || []).map(m => m.name);
      const models = (data.models || []).map(m => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at
      }));
      ollamaAvailable = true;
      return { available: true, models, endpoint: currentConfig.ollamaEndpoint };
    }
  } catch (e) {
    // Ollama not running
  }
  ollamaAvailable = false;
  installedOllamaModels = [];
  return { available: false, models: [], endpoint: currentConfig.ollamaEndpoint };
}

async function isOllamaRunning() {
  if (ollamaAvailable !== null) {
    // Recheck if last check was negative (might have been started since)
    if (!ollamaAvailable) {
      const check = await checkOllama();
      return check.available;
    }
    return ollamaAvailable;
  }
  const check = await checkOllama();
  return check.available;
}

/**
 * Pull an Ollama model. Returns a progress stream.
 */
async function pullOllamaModel(modelName, onProgress) {
  try {
    const response = await fetch(`${currentConfig.ollamaEndpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    });

    if (!response.ok) {
      throw new Error(`Ollama pull failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let lineIndex;
      while ((lineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, lineIndex).trim();
        buffer = buffer.slice(lineIndex + 1);
        if (line) {
          try {
            const data = JSON.parse(line);
            if (onProgress) onProgress(data);
          } catch (e) {}
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Provider Call Implementations
// ============================================================

async function callOllama(messages, options = {}) {
  const model = options.model || getOllamaModelForPurpose(options.purpose || 'chat');
  
  const response = await fetch(`${currentConfig.ollamaEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature || 0.2,
        num_predict: options.maxTokens || 4096
      }
    }),
    signal: AbortSignal.timeout(options.timeout || 120000)
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

async function callOllamaStream(messages, options = {}) {
  const model = options.model || getOllamaModelForPurpose(options.purpose || 'chat');

  const response = await fetch(`${currentConfig.ollamaEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature || 0.2,
        num_predict: options.maxTokens || 4096
      }
    }),
    signal: AbortSignal.timeout(options.timeout || 120000)
  });

  if (!response.ok) {
    throw new Error(`Ollama stream error ${response.status}`);
  }

  return {
    provider: 'ollama',
    reader: response.body.getReader(),
    decoder: new TextDecoder('utf-8'),
    parseChunk: (line) => {
      // Ollama streams JSON objects, one per line
      try {
        const data = JSON.parse(line);
        return data.message?.content || '';
      } catch (e) {
        return '';
      }
    },
    isDone: (line) => {
      try {
        const data = JSON.parse(line);
        return data.done === true;
      } catch (e) {
        return false;
      }
    }
  };
}

async function callGroq(messages, options = {}) {
  if (!currentConfig.groqApiKey) {
    throw new Error('Groq API key not configured');
  }

  const model = options.model || currentConfig.models[options.purpose || 'chat']?.groq || 'llama-3.1-8b-instant';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentConfig.groqApiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 4096
    }),
    signal: AbortSignal.timeout(options.timeout || 30000)
  });

  if (!response.ok) {
    throw new Error(`Groq error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGroqStream(messages, options = {}) {
  if (!currentConfig.groqApiKey) {
    throw new Error('Groq API key not configured');
  }

  const model = options.model || currentConfig.models[options.purpose || 'chat']?.groq || 'llama-3.1-8b-instant';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentConfig.groqApiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 4096,
      stream: true
    }),
    signal: AbortSignal.timeout(options.timeout || 60000)
  });

  if (!response.ok) {
    throw new Error(`Groq stream error ${response.status}`);
  }

  return {
    provider: 'groq',
    reader: response.body.getReader(),
    decoder: new TextDecoder('utf-8'),
    parseChunk: (line) => {
      // OpenAI-compatible SSE format
      if (!line.startsWith('data:')) return '';
      const dataStr = line.slice(5).trim();
      if (dataStr === '[DONE]') return '';
      try {
        const parsed = JSON.parse(dataStr);
        return parsed.choices?.[0]?.delta?.content || '';
      } catch (e) {
        return '';
      }
    },
    isDone: (line) => {
      return line.trim() === 'data: [DONE]';
    }
  };
}

async function callPollinations(messages, options = {}) {
  const model = options.model || currentConfig.models[options.purpose || 'chat']?.pollinations || 'openai';
  const fallbackModels = ['openai', 'llama', 'mistral', 'qwen-coder'];

  const maxRetries = options.maxRetries || 5;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const modelToUse = attempt === 1 ? model : fallbackModels[(attempt - 1) % fallbackModels.length];

    try {
      const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: modelToUse,
          seed: 42,
          private: true
        }),
        signal: AbortSignal.timeout(options.timeout || 30000)
      });

      if (!response.ok) {
        throw new Error(`Pollinations error ${response.status}`);
      }

      const resText = await response.text();
      try {
        const data = JSON.parse(resText);
        return data?.choices?.[0]?.message?.content || resText;
      } catch (e) {
        return resText;
      }
    } catch (err) {
      if (attempt === maxRetries) throw err;

      const isRateLimit = err.message && (
        err.message.includes('429') ||
        err.message.includes('502') ||
        err.message.includes('503') ||
        err.message.includes('504')
      );
      const retryDelay = isRateLimit ? (attempt * 6000) : (attempt * 3000);
      console.warn(`[LLM Gateway] Pollinations attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying with ${modelToUse} in ${retryDelay / 1000}s...`);
      await delay(retryDelay);
    }
  }
}

async function callPollinationsStream(messages, options = {}) {
  const model = options.model || currentConfig.models[options.purpose || 'chat']?.pollinations || 'openai';
  const fallbackModels = ['openai', 'llama', 'mistral', 'qwen-coder'];

  const maxRetries = options.maxRetries || 5;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const modelToUse = attempt === 1 ? model : fallbackModels[(attempt - 1) % fallbackModels.length];

    try {
      const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: modelToUse,
          seed: 42,
          private: true,
          stream: true
        }),
        signal: AbortSignal.timeout(options.timeout || 45000)
      });

      if (!response.ok) {
        throw new Error(`Pollinations stream error ${response.status}`);
      }

      return {
        provider: 'pollinations',
        reader: response.body.getReader(),
        decoder: new TextDecoder('utf-8'),
        parseChunk: (line) => {
          if (!line.startsWith('data:')) return '';
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') return '';
          try {
            const parsed = JSON.parse(dataStr);
            return parsed?.choices?.[0]?.delta?.content || parsed?.choices?.[0]?.delta?.reasoning || '';
          } catch (e) {
            return '';
          }
        },
        isDone: (line) => {
          return line.trim() === 'data: [DONE]';
        }
      };
    } catch (err) {
      if (attempt === maxRetries) throw err;

      const isRateLimit = err.message && (
        err.message.includes('429') ||
        err.message.includes('502') ||
        err.message.includes('503') ||
        err.message.includes('504')
      );
      const retryDelay = isRateLimit ? (attempt * 6000) : (attempt * 3000);
      console.warn(`[LLM Gateway] Pollinations stream attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying with ${modelToUse} in ${retryDelay / 1000}s...`);
      await delay(retryDelay);
    }
  }
}

// ============================================================
// Unified Gateway API
// ============================================================

/**
 * Get the ordered list of providers to try based on config and health
 */
function getProviderChain() {
  const preferred = currentConfig.preferredProvider;

  if (preferred === 'ollama') {
    return ['ollama', 'groq', 'pollinations'];
  }
  if (preferred === 'groq') {
    return ['groq', 'pollinations', 'ollama'];
  }
  if (preferred === 'pollinations') {
    return ['pollinations', 'groq', 'ollama'];
  }

  // 'auto' — local Ollama first if available (or status unknown), else Groq, else Pollinations
  const chain = [];
  if ((ollamaAvailable === null || ollamaAvailable === true) && isProviderHealthy('ollama')) {
    chain.push('ollama');
  }
  if (currentConfig.groqApiKey && isProviderHealthy('groq')) {
    chain.push('groq');
  }
  chain.push('pollinations');
  return chain.length > 0 ? chain : ['pollinations'];
}

/**
 * Call an LLM (non-streaming). Tries providers in order.
 * 
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {Object} options - { purpose: 'code'|'chat'|'plan'|'review', temperature, maxTokens, timeout }
 * @returns {string} The LLM response text
 */
async function callLLM(messages, options = {}) {
  const chain = getProviderChain();
  
  // If Ollama is in the chain and status is unknown, do a quick check first
  if (chain.includes('ollama') && ollamaAvailable === null) {
    await checkOllama().catch(() => {});
  }
  
  let lastError = null;

  for (const provider of chain) {
    if (!isProviderHealthy(provider)) continue;

    // Skip Ollama if not available
    if (provider === 'ollama' && !ollamaAvailable) continue;
    // Skip Groq if no API key
    if (provider === 'groq' && !currentConfig.groqApiKey) continue;

    try {
      let result;
      switch (provider) {
        case 'ollama':
          result = await callOllama(messages, options);
          break;
        case 'groq':
          result = await callGroq(messages, options);
          break;
        case 'pollinations':
          result = await callPollinations(messages, options);
          break;
      }
      markProviderSuccess(provider);
      return result;
    } catch (err) {
      console.warn(`[LLM Gateway] ${provider} failed: ${err.message}`);
      markProviderFailed(provider);
      lastError = err;
    }
  }

  throw lastError || new Error('All LLM providers failed');
}

/**
 * Call an LLM with streaming. Returns a stream reader object.
 * 
 * The returned object has:
 *   - provider: which provider is being used
 *   - reader: ReadableStreamDefaultReader
 *   - decoder: TextDecoder
 *   - parseChunk(line): extracts text content from a line
 *   - isDone(line): checks if the stream is complete
 * 
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {Object} options - { purpose, temperature, maxTokens, timeout }
 * @returns {Object} Stream reader object
 */
async function callLLMStream(messages, options = {}) {
  const chain = getProviderChain();
  
  // If Ollama is in the chain and status is unknown, do a quick check first
  if (chain.includes('ollama') && ollamaAvailable === null) {
    await checkOllama().catch(() => {});
  }
  
  let lastError = null;

  for (const provider of chain) {
    if (!isProviderHealthy(provider)) continue;

    // Skip Ollama if not available
    if (provider === 'ollama' && !ollamaAvailable) continue;
    // Skip Groq if no API key
    if (provider === 'groq' && !currentConfig.groqApiKey) continue;

    try {
      let streamObj;
      switch (provider) {
        case 'ollama':
          streamObj = await callOllamaStream(messages, options);
          break;
        case 'groq':
          streamObj = await callGroqStream(messages, options);
          break;
        case 'pollinations':
          streamObj = await callPollinationsStream(messages, options);
          break;
      }
      markProviderSuccess(provider);
      return streamObj;
    } catch (err) {
      console.warn(`[LLM Gateway] ${provider} stream failed: ${err.message}`);
      markProviderFailed(provider);
      lastError = err;
    }
  }

  throw lastError || new Error('All LLM streaming providers failed');
}

/**
 * Helper: consume a stream from callLLMStream and collect full text.
 * Calls onChunk(text) for each token/text fragment.
 * Returns the full accumulated text.
 */
async function consumeStream(streamObj, onChunk, options = {}) {
  const { reader, decoder } = streamObj;
  let buffer = '';
  let fullText = '';
  const heartbeatTimeout = options.heartbeatTimeout || 20000;

  let heartbeatTimer = setTimeout(() => {
    console.warn(`[LLM Gateway] Stream from ${streamObj.provider} stalled.`);
    try { reader.cancel(); } catch (e) {}
  }, heartbeatTimeout);

  try {
    while (true) {
      const { done, value } = await reader.read();
      clearTimeout(heartbeatTimer);
      if (done) break;

      heartbeatTimer = setTimeout(() => {
        console.warn(`[LLM Gateway] Stream from ${streamObj.provider} stalled.`);
        try { reader.cancel(); } catch (e) {}
      }, heartbeatTimeout);

      buffer += decoder.decode(value, { stream: true });

      // For Ollama, each line is a complete JSON object
      // For OpenAI-compatible (Groq, Pollinations), lines are SSE events
      if (streamObj.provider === 'ollama') {
        let lineIndex;
        while ((lineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineIndex).trim();
          buffer = buffer.slice(lineIndex + 1);
          if (line) {
            const text = streamObj.parseChunk(line);
            if (text) {
              fullText += text;
              if (onChunk) onChunk(text);
            }
          }
        }
      } else {
        // SSE format (Groq, Pollinations)
        let lineIndex;
        while ((lineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineIndex).trim();
          buffer = buffer.slice(lineIndex + 1);
          if (line) {
            const text = streamObj.parseChunk(line);
            if (text) {
              fullText += text;
              if (onChunk) onChunk(text);
            }
          }
        }
      }
    }
  } finally {
    clearTimeout(heartbeatTimer);
    try { reader.releaseLock(); } catch (e) {}
  }

  return fullText;
}

/**
 * Get info about current active provider for display
 */
function getActiveProviderInfo() {
  const chain = getProviderChain();
  return {
    preferredProvider: currentConfig.preferredProvider,
    providerChain: chain,
    ollamaAvailable: ollamaAvailable || false,
    groqConfigured: Boolean(currentConfig.groqApiKey),
    health: {
      ollama: { ...providerHealth.ollama },
      groq: { ...providerHealth.groq },
      pollinations: { ...providerHealth.pollinations }
    }
  };
}

module.exports = {
  // Config
  getProviderConfig,
  setProviderConfig,
  
  // Ollama
  checkOllama,
  isOllamaRunning,
  pullOllamaModel,
  
  // Unified API
  callLLM,
  callLLMStream,
  consumeStream,
  
  // Info
  getActiveProviderInfo
};
