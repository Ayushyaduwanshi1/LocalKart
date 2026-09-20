const RuleEngineProvider = require('./RuleEngineProvider');
const GeminiProvider = require('./GeminiProvider');

class ProviderFactory {
  static getProvider() {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (geminiKey && geminiKey.trim()) {
      return new GeminiProvider(geminiKey);
    }

    // Default: High-precision built-in multi-lingual Rule & Tool Orchestration Engine
    return new RuleEngineProvider();
  }
}

module.exports = ProviderFactory;
