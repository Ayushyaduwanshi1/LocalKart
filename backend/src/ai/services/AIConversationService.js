const AIConversation = require('../../models/AIConversation');
const AIMessage = require('../../models/AIMessage');
const AIActionLog = require('../../models/AIActionLog');
const crypto = require('crypto');

class AIConversationService {
  /**
   * Get or create active conversation session
   */
  static async getOrCreateConversation({ customerId, customerPhone, customerName, source = 'WHATSAPP', userId }) {
    let query = {};
    if (customerId) {
      query = { customerId, status: { $in: ['ACTIVE', 'PAUSED', 'HUMAN_TAKEOVER'] } };
    } else if (customerPhone) {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      query = { customerPhone: cleanPhone, status: { $in: ['ACTIVE', 'PAUSED', 'HUMAN_TAKEOVER'] } };
    } else if (userId) {
      query = { userId, status: { $in: ['ACTIVE', 'PAUSED', 'HUMAN_TAKEOVER'] } };
    }

    let conversation = await AIConversation.findOne(query).sort({ updatedAt: -1 });

    if (!conversation) {
      conversation = await AIConversation.create({
        customerId: customerId || undefined,
        customerPhone: customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '',
        customerName: customerName || '',
        source,
        userId: userId || undefined,
        status: 'ACTIVE',
      });
    }

    return conversation;
  }

  /**
   * Check for duplicate messages to prevent double order placement
   */
  static async checkDuplicateMessage(conversationId, text) {
    const hash = crypto.createHash('md5').update((text || '').trim().toLowerCase()).digest('hex');

    // Look for same message within last 60 seconds
    const sixtySecsAgo = new Date(Date.now() - 60000);
    const existing = await AIMessage.findOne({
      conversationId,
      idempotencyKey: hash,
      createdAt: { $gte: sixtySecsAgo },
    });

    return {
      isDuplicate: !!existing,
      hash,
      lastMessage: existing,
    };
  }

  /**
   * Log AI action to database audit collection
   */
  static async logAction({ conversationId, userId, customerId, action, tool, riskLevel, input, output, status = 'SUCCESS', approvedBy }) {
    return AIActionLog.create({
      conversationId,
      userId,
      customerId,
      action,
      tool,
      riskLevel: riskLevel || 'LOW',
      input,
      output,
      status,
      approvedBy,
    });
  }

  /**
   * Add message to conversation history
   */
  static async recordMessage({ conversationId, role, content, intent = 'UNKNOWN', toolCalls = [], orderDraft, idempotencyKey }) {
    const msg = await AIMessage.create({
      conversationId,
      role,
      content,
      intent,
      toolCalls,
      orderDraft,
      idempotencyKey,
    });

    await AIConversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
    });

    return msg;
  }
}

module.exports = AIConversationService;
