const AISettings = require('../../models/AISettings');

class AIPolicyService {
  /**
   * Get active AI settings or defaults
   */
  static async getSettings() {
    let settings = await AISettings.findOne();
    if (!settings) {
      settings = await AISettings.create({
        automationLevel: 'SEMI_AUTONOMOUS',
        autoConfirmThreshold: 500,
        requireApprovalForDelivery: false,
        requireApprovalForCancel: true,
      });
    }
    return settings;
  }

  /**
   * Determine if an action can be performed automatically or requires confirmation
   */
  static async evaluateActionPermission({ action, riskLevel, amount = 0, conversation, user }) {
    // 1. Human Takeover or Paused guard
    if (conversation) {
      if (conversation.status === 'PAUSED') {
        return {
          allowed: false,
          requiresApproval: true,
          reason: 'AI Operator is currently PAUSED by the store owner',
        };
      }
      if (conversation.status === 'HUMAN_TAKEOVER') {
        return {
          allowed: false,
          requiresApproval: true,
          reason: 'Store owner has taken over this conversation',
        };
      }
    }

    // 2. LOW risk actions (searches, stock checks, status queries) are always allowed
    if (riskLevel === 'LOW') {
      return { allowed: true, requiresApproval: false };
    }

    const settings = await this.getSettings();
    const level = settings.automationLevel;

    // 3. Level 1: ASSISTED -> Everything Medium/High requires approval
    if (level === 'ASSISTED') {
      if (riskLevel === 'MEDIUM') {
        return { allowed: true, requiresApproval: false }; // Drafts can be prepared
      }
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'Assisted Mode: Final action requires human approval',
      };
    }

    // 4. Level 2: SEMI_AUTONOMOUS -> Drafts and calculations allowed; High risk actions need customer/owner confirmation
    if (level === 'SEMI_AUTONOMOUS') {
      if (riskLevel === 'MEDIUM') {
        return { allowed: true, requiresApproval: false };
      }

      // If user is store owner/admin, allow direct execution
      if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
        return { allowed: true, requiresApproval: false };
      }

      // Otherwise high risk (confirming order, refund, cancel) needs explicit confirmation
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'High-risk action requires confirmation before executing',
      };
    }

    // 5. Level 3: AUTONOMOUS -> Allowed if amount is within threshold
    if (level === 'AUTONOMOUS') {
      if (action === 'confirmOrder') {
        if (amount > 0 && amount <= settings.autoConfirmThreshold) {
          return { allowed: true, requiresApproval: false };
        }
        return {
          allowed: false,
          requiresApproval: true,
          reason: `Order total (₹${amount}) exceeds autonomous threshold (₹${settings.autoConfirmThreshold})`,
        };
      }
      if (action === 'cancelOrder' && settings.requireApprovalForCancel) {
        return { allowed: false, requiresApproval: true, reason: 'Cancellation requires owner approval' };
      }
      return { allowed: true, requiresApproval: false };
    }

    return { allowed: false, requiresApproval: true, reason: 'Action requires authorization' };
  }
}

module.exports = AIPolicyService;
