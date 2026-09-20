const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerName: {
      type: String,
      default: '',
    },
    customerPhone: {
      type: String,
      default: '',
      index: true,
    },
    source: {
      type: String,
      enum: ['WHATSAPP', 'PHONE', 'WEB', 'DASHBOARD'],
      default: 'WHATSAPP',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'HUMAN_TAKEOVER', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    automationLevel: {
      type: String,
      enum: ['ASSISTED', 'SEMI_AUTONOMOUS', 'AUTONOMOUS'],
      default: 'SEMI_AUTONOMOUS',
    },
    currentOrderDraft: {
      items: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
          name: { type: String, required: true },
          unit: { type: String, default: 'piece' },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true, min: 1 },
          discount: { type: Number, default: 0 },
          gstRate: { type: Number, default: 0 },
          gst: { type: Number, default: 0 },
          total: { type: Number, required: true },
        },
      ],
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      deliveryAddress: {
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        pincode: { type: String, default: '' },
        phone: { type: String, default: '' },
      },
      paymentMethod: {
        type: String,
        enum: ['CASH', 'UPI', 'CARD', 'COD', 'ONLINE'],
        default: 'COD',
      },
      notes: { type: String, default: '' },
      status: {
        type: String,
        enum: ['DRAFT', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'],
        default: 'DRAFT',
      },
      confirmedOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
      updatedAt: { type: Date, default: Date.now },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

aiConversationSchema.index({ customerPhone: 1, status: 1 });
aiConversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
