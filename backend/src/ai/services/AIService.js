const ProviderFactory = require('../providers/providerFactory');
const AIConversationService = require('./AIConversationService');
const AIPolicyService = require('./AIPolicyService');
const AIMessage = require('../../models/AIMessage');
const socketHandler = require('../../sockets/socketHandler');

class AIService {
  /**
   * Main entrypoint for processing user messages through the AI Store Operator
   */
  static async handleMessage({ conversationId, customerId, customerPhone, customerName, message, source, user }) {
    // 1. Resolve or create conversation
    const conversation = await AIConversationService.getOrCreateConversation({
      conversationId,
      customerId,
      customerPhone,
      customerName,
      source: source || 'WHATSAPP',
      userId: user?._id,
    });

    const convId = conversation._id;

    // 2. Check Human Override status
    if (conversation.status === 'PAUSED') {
      return {
        response: '⚠️ AI Operator is currently PAUSED. The store owner will attend to your request shortly.',
        status: 'PAUSED',
        conversationId: convId,
      };
    }

    if (conversation.status === 'HUMAN_TAKEOVER') {
      return {
        response: '⚠️ Store manager has taken over this chat. You are chatting directly with store staff.',
        status: 'HUMAN_TAKEOVER',
        conversationId: convId,
      };
    }

    // 3. Duplicate Message & Idempotency Check
    const dupCheck = await AIConversationService.checkDuplicateMessage(convId, message);
    if (dupCheck.isDuplicate) {
      return {
        response: '⚠️ Maine aapka yeh message abhi dekha hai. Aapka order request already process ho raha hai!',
        isDuplicate: true,
        conversationId: convId,
        orderDraft: conversation.currentOrderDraft,
      };
    }

    // Save customer message
    await AIConversationService.recordMessage({
      conversationId: convId,
      role: 'user',
      content: message,
      idempotencyKey: dupCheck.hash,
    });

    // 4. Socket.IO Real-time: Thinking Event
    if (socketHandler.getIO()) {
      socketHandler.getIO().emit('aiThinking', {
        conversationId: convId,
        step: 'Understanding request...',
        customerName: conversation.customerName || conversation.customerPhone,
      });
    }

    // 5. Retrieve conversation history for context
    const history = await AIMessage.find({ conversationId: convId })
      .sort({ createdAt: -1 })
      .limit(6);
    const chronologicalHistory = history.reverse();

    // 6. Process via Provider
    const provider = ProviderFactory.getProvider();
    let result;
    try {
      result = await provider.processRequest({
        message,
        conversation,
        user,
        history: chronologicalHistory,
      });
    } catch (err) {
      console.error('[AIService] Provider error:', err);
      result = {
        response: 'Maaf kijiye, abhi system busy hai. Kripya thodi der baad dobara koshish karein.',
        intent: 'ERROR',
        toolCalls: [],
        orderDraft: conversation.currentOrderDraft,
      };
    }

    // 7. Audit Logging for all executed tools
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const call of result.toolCalls) {
        await AIConversationService.logAction({
          conversationId: convId,
          userId: user?._id,
          customerId: conversation.customerId,
          action: call.tool,
          tool: call.tool,
          input: call.input,
          output: call.output,
          status: call.status || 'SUCCESS',
        });

        // Emit real-time tool completion to dashboard
        if (socketHandler.getIO()) {
          socketHandler.getIO().emit('aiToolCompleted', {
            conversationId: convId,
            tool: call.tool,
            input: call.input,
            output: call.output,
          });
        }
      }
    }

    // 8. Save Assistant Response Message
    const assistantMessage = await AIConversationService.recordMessage({
      conversationId: convId,
      role: 'assistant',
      content: result.response,
      intent: result.intent,
      toolCalls: result.toolCalls,
      orderDraft: result.orderDraft,
    });

    // 9. Real-time Socket.IO Broadcast
    if (socketHandler.getIO()) {
      socketHandler.getIO().emit('aiMessage', {
        conversationId: convId,
        message: assistantMessage,
        orderDraft: result.orderDraft,
      });

      if (result.confirmedOrder) {
        socketHandler.getIO().emit('newOrder', result.confirmedOrder);
        socketHandler.getIO().emit('aiOrderCreated', result.confirmedOrder);
      }
    }

    return {
      conversationId: convId,
      response: result.response,
      intent: result.intent,
      toolCalls: result.toolCalls,
      orderDraft: result.orderDraft,
      status: conversation.status,
    };
  }

  /**
   * Human takeover or pause override
   */
  static async updateConversationStatus(conversationId, status, user) {
    const conv = await AIConversation.findByIdAndUpdate(
      conversationId,
      { status, lastMessageAt: new Date() },
      { new: true }
    );

    if (socketHandler.getIO()) {
      socketHandler.getIO().emit('aiStatusChanged', {
        conversationId,
        status,
        updatedBy: user?.name,
      });
    }

    return conv;
  }
}

module.exports = AIService;
