/**
 * renderer/provider-detector.js
 * 
 * Detects available free-tier LLM providers
 * Automatically selects the best provider for each agent role
 * Implements fallback chain: Pollinations → OpenRouter → Groq → Google → Ollama
 * 
 * This enables NOVA to work WITHOUT requiring API keys for basic functionality
 */

class ProviderDetector {
  // Cache detection results to avoid repeated API calls
  static detectionCache = null;
  static cacheExpiry = 0;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect all available providers
   * Returns an object mapping each agent role to available providers
   * 
   * @returns {Promise<Object>} - { planner, coder, reviewer, fast }
   */
  static async detectAvailable() {
    // Return cached result if still valid
    if (this.detectionCache && Date.now() < this.cacheExpiry) {
      console.log('📦 Using cached provider detection');
      return this.detectionCache;
    }

    console.log('🔍 Detecting available LLM providers...');

    const available = {
      planner: null,
      coder: null,
      reviewer: null,
      fast: null
    };

    // Test each provider in priority order
    const providers = [
      { name: 'pollinations', tester: () => this.testPollinationsAPI() },
      { name: 'openrouter', tester: () => this.testOpenRouterAPI() },
      { name: 'groq', tester: () => this.testGroqAPI() },
      { name: 'google', tester: () => this.testGoogleStudioAPI() },
      { name: 'ollama', tester: () => this.testOllamaAPI() }
    ];

    // Test each provider
    const results = {};
    for (const provider of providers) {
      try {
        results[provider.name] = await provider.tester();
      } catch (error) {
        results[provider.name] = false;
        console.warn(`⚠️  ${provider.name} test failed:`, error.message);
      }
    }

    console.log('📊 Provider detection results:', results);

    // Assign providers to roles based on availability
    // Planner: Prefers DeepSeek R1 (OpenRouter) → Fallback Pollinations
    if (results.openrouter) available.planner = 'openrouter';
    else if (results.pollinations) available.planner = 'pollinations';
    else if (results.ollama) available.planner = 'ollama';

    // Coder: Prefers Qwen3-Coder (OpenRouter) → Fallback Pollinations
    if (results.openrouter) available.coder = 'openrouter';
    else if (results.pollinations) available.coder = 'pollinations';
    else if (results.ollama) available.coder = 'ollama';

    // Reviewer: Prefers Llama 3.3 (Groq) → Fallback OpenRouter
    if (results.groq) available.reviewer = 'groq';
    else if (results.openrouter) available.reviewer = 'openrouter';
    else if (results.pollinations) available.reviewer = 'pollinations';
    else if (results.ollama) available.reviewer = 'ollama';

    // Fast: Prefers Gemini Flash (Google) → Fallback Groq
    if (results.google) available.fast = 'google';
    else if (results.groq) available.fast = 'groq';
    else if (results.pollinations) available.fast = 'pollinations';
    else if (results.ollama) available.fast = 'ollama';

    // Cache result
    this.detectionCache = available;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;

    console.log('✅ Provider detection complete:', available);
    return available;
  }

  /**
   * Test Pollinations API
   * No authentication required, free tier
   * Fastest and simplest option for development
   * 
   * @returns {Promise<boolean>}
   */
  static async testPollinationsAPI() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      // Simple health check
      const response = await fetch('https://api.pollinations.ai/v1/models', {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeout);
      console.log('✅ Pollinations API is available');
      return response.ok;
    } catch (error) {
      console.warn('⚠️  Pollinations API test failed:', error.message);
      return false;
    }
  }

  /**
   * Test OpenRouter API
   * Free tier available, supports DeepSeek R1 and Qwen3-Coder
   * Requires HTTP-Referer header
   * 
   * @returns {Promise<boolean>}
   */
  static async testOpenRouterAPI() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'HTTP-Referer': 'https://nova-ide.local',
          'X-Title': 'NOVA IDE'
        }
      });

      clearTimeout(timeout);
      console.log('✅ OpenRouter API is available');
      return response.ok || response.status === 401; // 401 means API is up but auth required
    } catch (error) {
      console.warn('⚠️  OpenRouter API test failed:', error.message);
      return false;
    }
  }

  /**
   * Test Groq API
   * Free tier available for Llama 3.3 70B
   * No API key needed for simple health check
   * 
   * @returns {Promise<boolean>}
   */
  static async testGroqAPI() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://api.groq.com/openai/v1/models', {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test'
        }
      });

      clearTimeout(timeout);
      // API is available if we get 401 (auth required) rather than 503
      const isAvailable = response.status === 401 || response.status === 429;
      if (isAvailable) {
        console.log('✅ Groq API is available');
      }
      return isAvailable;
    } catch (error) {
      console.warn('⚠️  Groq API test failed:', error.message);
      return false;
    }
  }

  /**
   * Test Google AI Studio API
   * Free tier with Gemini 2.0 Flash
   * Can work without explicit API key (uses application default credentials)
   * 
   * @returns {Promise<boolean>}
   */
  static async testGoogleStudioAPI() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeout);
      console.log('✅ Google AI Studio API is available');
      return response.ok || response.status === 401;
    } catch (error) {
      console.warn('⚠️  Google AI Studio API test failed:', error.message);
      return false;
    }
  }

  /**
   * Test Local Ollama
   * Fully local, no internet required
   * Great for offline development
   * 
   * @returns {Promise<boolean>}
   */
  static async testOllamaAPI() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000); // Local call should be fast

      const response = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        const modelCount = data.models?.length || 0;
        console.log(`✅ Ollama is available with ${modelCount} models`);
        return modelCount > 0; // At least one model must be installed
      }
      return false;
    } catch (error) {
      console.warn('⚠️  Ollama API test failed:', error.message);
      return false;
    }
  }

  /**
   * Get detailed provider information for UI display
   * 
   * @returns {Promise<Object>} - Provider details for each role
   */
  static async getProviderDetails() {
    const available = await this.detectAvailable();

    const details = {
      planner: this.getProviderInfo(available.planner),
      coder: this.getProviderInfo(available.coder),
      reviewer: this.getProviderInfo(available.reviewer),
      fast: this.getProviderInfo(available.fast)
    };

    return details;
  }

  /**
   * Get human-readable information about a provider
   * 
   * @param {string} providerName - Provider name
   * @returns {Object} - Provider info for UI
   */
  static getProviderInfo(providerName) {
    const info = {
      pollinations: {
        name: 'Pollinations',
        icon: '🌐',
        rateLimit: '10 req/min',
        requiresKey: false,
        models: ['Any']
      },
      openrouter: {
        name: 'OpenRouter',
        icon: '🔀',
        rateLimit: 'Free tier: 20 req/min',
        requiresKey: false, // Free tier works
        models: ['DeepSeek R1', 'Qwen3-Coder', 'Llama 3.3']
      },
      groq: {
        name: 'Groq',
        icon: '⚡',
        rateLimit: '30 req/min (free)',
        requiresKey: false,
        models: ['Llama 3.3 70B']
      },
      google: {
        name: 'Google AI Studio',
        icon: '🔍',
        rateLimit: '60 req/min',
        requiresKey: false,
        models: ['Gemini 2.0 Flash']
      },
      ollama: {
        name: 'Ollama (Local)',
        icon: '🏠',
        rateLimit: 'Unlimited',
        requiresKey: false,
        models: ['Mistral', 'Llama 2', 'Phi', 'Neural Chat']
      },
      null: {
        name: 'None Available',
        icon: '❌',
        rateLimit: 'N/A',
        requiresKey: false,
        models: []
      }
    };

    return info[providerName] || info.null;
  }

  /**
   * Clear detection cache
   * Useful for forcing a fresh detection
   */
  static clearCache() {
    this.detectionCache = null;
    this.cacheExpiry = 0;
    console.log('🗑️  Provider detection cache cleared');
  }

  /**
   * Get a human-readable status message
   * 
   * @returns {Promise<string>} - Status message
   */
  static async getStatusMessage() {
    const available = await this.detectAvailable();

    const hasAll = available.planner && available.coder && available.reviewer && available.fast;
    const hasCore = available.planner && available.coder && available.reviewer;
    const hasSome = available.planner || available.coder || available.reviewer || available.fast;

    if (hasAll) {
      return '✅ All agents available - Ready to go!';
    } else if (hasCore) {
      return '✅ Core agents available - Some features may be limited';
    } else if (hasSome) {
      return '⚠️  Some agents available - Configure for better experience';
    } else {
      return '❌ No providers available - Check internet or install Ollama';
    }
  }

  /**
   * Suggest next steps for user
   * 
   * @returns {Promise<string>} - Suggestion message
   */
  static async getSuggestion() {
    const available = await this.detectAvailable();

    if (!available.planner) {
      return 'Install Ollama (https://ollama.ai) for local AI - no internet required!';
    }
    if (!available.reviewer) {
      return 'Code review would be more robust with Groq - sign up free at groq.com';
    }
    return 'Your setup is complete! Start using NOVA IDE.';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderDetector;
}
