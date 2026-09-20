const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['STOCK_IN', 'SALE', 'ORDER_CANCELLED', 'RETURN', 'MANUAL_ADJUSTMENT', 'IN', 'OUT', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    createdBy: {
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

// Virtual aliases for standard API requirements
inventoryTransactionSchema.virtual('productId').get(function () {
  return this.product;
});
inventoryTransactionSchema.virtual('orderId').get(function () {
  return this.order;
});
inventoryTransactionSchema.virtual('transactionType').get(function () {
  return this.type;
});

// Virtual for referenceOrder to keep backward compatibility
inventoryTransactionSchema.virtual('referenceOrder').get(function () {
  return this.order;
});

inventoryTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

