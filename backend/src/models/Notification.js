const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'NEW_ORDER',
        'LOW_STOCK',
        'OUT_OF_STOCK',
        'ORDER_CONFIRMED',
        'ORDER_CANCELLED',
        'DELIVERY_ASSIGNED',
        'DELIVERY_COMPLETED',
        'PAYMENT_RECEIVED',
      ],
      default: 'NEW_ORDER',
      index: true,
    },
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
