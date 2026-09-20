const AIService = require('../ai/services/AIService');
const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');
const AIActionLog = require('../models/AIActionLog');
const AISettings = require('../models/AISettings');
const AIPolicyService = require('../ai/services/AIPolicyService');
const Order = require('../models/Order');

/**
 * Handle incoming chat message
 * POST /api/ai/chat
 */
const handleChat = async (req, res, next) => {
  try {
    const { conversationId, customerId, customerPhone, customerName, message, source } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const result = await AIService.handleMessage({
      conversationId,
      customerId,
      customerPhone,
      customerName,
      message: message.trim(),
      source: source || 'WHATSAPP',
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all AI conversations
 * GET /api/ai/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [conversations, total] = await Promise.all([
      AIConversation.find(query)
        .populate('customerId', 'name phone address')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AIConversation.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: conversations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single conversation with full message history and action logs
 * GET /api/ai/conversations/:id
 */
const getConversationById = async (req, res, next) => {
  try {
    const conversation = await AIConversation.findById(req.params.id).populate('customerId');
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const [messages, actionLogs] = await Promise.all([
      AIMessage.find({ conversationId: conversation._id }).sort({ createdAt: 1 }),
      AIActionLog.find({ conversationId: conversation._id }).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
        actionLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change conversation status (PAUSE, RESUME, HUMAN_TAKEOVER)
 * POST /api/ai/conversations/:id/override
 */
const overrideConversation = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'PAUSED', 'HUMAN_TAKEOVER', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await AIService.updateConversationStatus(req.params.id, status, req.user);
    res.status(200).json({
      success: true,
      message: `Conversation status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI Settings
 * GET /api/ai/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await AIPolicyService.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update AI Settings
 * PUT /api/ai/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const settings = await AISettings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });
    res.status(200).json({
      success: true,
      message: 'AI Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI analytics & automation metrics
 * GET /api/ai/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const [totalConversations, totalMessages, totalLogs, automatedOrders, humanTakeovers] = await Promise.all([
      AIConversation.countDocuments(),
      AIMessage.countDocuments(),
      AIActionLog.countDocuments(),
      Order.countDocuments({ notes: /AI Store Operator/i }),
      AIConversation.countDocuments({ status: 'HUMAN_TAKEOVER' }),
    ]);

    const successLogs = await AIActionLog.countDocuments({ status: 'SUCCESS' });
    const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;
    const automationRate = totalConversations > 0
      ? Math.round(((totalConversations - humanTakeovers) / totalConversations) * 100)
      : 100;

    res.status(200).json({
      success: true,
      data: {
        totalConversations,
        totalMessages,
        totalActionLogs: totalLogs,
        automatedOrders,
        humanTakeovers,
        successRate,
        automationRate,
        estimatedTimeSavedMinutes: automatedOrders * 5 + totalConversations * 2,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleChat,
  getConversations,
  getConversationById,
  overrideConversation,
  getSettings,
  updateSettings,
  getAnalytics,
};
