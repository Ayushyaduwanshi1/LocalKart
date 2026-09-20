const AIProvider = require('./AIProvider');
const { getToolDeclarations, executeTool } = require('../tools/toolRegistry');

class GeminiProvider extends AIProvider {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    super('GeminiProvider');
    this.apiKey = apiKey;
    this.model = model;
  }

  async processRequest({ message, conversation, user, history = [] }) {
    // If no key or rule engine forced, throw to trigger fallback
    if (!this.apiKey) {
      throw new Error('No Gemini API Key provided');
    }

    try {
      const toolDeclarations = getToolDeclarations();
      const formattedTools = [
        {
          functionDeclarations: toolDeclarations.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];

      const contents = history.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          tools: formattedTools,
          systemInstruction: {
            parts: [
              {
                text: 'You are the LocalKart AI Store Operator for a neighborhood kirana store in India. You understand English, Hindi, and Hinglish. Always use tools to verify products, stock, prices, customers, and orders. Never invent prices or inventory. Ask for confirmation before finalizing orders.',
              },
            ],
          },
        }),
      });

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      if (part?.functionCall) {
        const { name, args } = part.functionCall;
        const toolResult = await executeTool(name, args, { user, conversationId: conversation._id });

        return {
          response: `Executing tool ${name}...`,
          intent: 'TOOL_CALL',
          toolCalls: [{ tool: name, input: args, output: toolResult.result, status: 'SUCCESS' }],
          orderDraft: conversation.currentOrderDraft,
        };
      }

      return {
        response: part?.text || 'Maaf kijiye, samajh nahi aaya. Dubara koshish karein.',
        intent: 'CONVERSATIONAL',
        toolCalls: [],
        orderDraft: conversation.currentOrderDraft,
      };
    } catch (err) {
      console.warn('[GeminiProvider] Failed to call Gemini API, falling back to RuleEngineProvider:', err.message);
      throw err;
    }
  }
}

module.exports = GeminiProvider;
