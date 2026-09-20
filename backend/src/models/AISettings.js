const mongoose = require('mongoose');

const aiSettingsSchema = new mongoose.Schema(
  {
    automationLevel: {
      type: String,
      enum: ['ASSISTED', 'SEMI_AUTONOMOUS', 'AUTONOMOUS'],
      default: 'SEMI_AUTONOMOUS',
    },
    autoConfirmThreshold: {
      type: Number,
      default: 500, // In Rupees
    },
    enabledTools: {
      type: [String],
      default: [
        'searchProducts',
        'getProduct',
        'checkInventory',
        'getLowStockProducts',
        'findCustomer',
        'createCustomer',
        'getCustomerOrders',
        'getLastOrder',
        'createOrderDraft',
        'modifyOrderDraft',
        'calculateOrder',
        'confirmOrder',
        'cancelOrder',
        'getOrderStatus',
        'recordPayment',
        'getPaymentStatus',
        'createDelivery',
        'assignDeliveryPartner',
        'getDeliveryStatus',
        'getStoreSettings',
        'getSalesMetrics',
        'generateInvoice',
      ],
    },
    requireApprovalForDelivery: {
      type: Boolean,
      default: false,
    },
    requireApprovalForCancel: {
      type: Boolean,
      default: true,
    },
    businessHours: {
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '22:00' },
      isOpenToday: { type: Boolean, default: true },
    },
    language: {
      type: String,
      default: 'Hinglish',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('AISettings', aiSettingsSchema);
