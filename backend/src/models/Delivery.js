const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    pickedUpAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    customerName: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

deliverySchema.virtual('orderId').get(function () {
  return this.order;
});
deliverySchema.virtual('customerId').get(function () {
  return this.customer;
});
deliverySchema.virtual('deliveryPartnerId').get(function () {
  return this.deliveryPartner;
});
deliverySchema.virtual('deliveryStatus').get(function () {
  return this.status;
});
deliverySchema.virtual('deliveryNotes').get(function () {
  return this.notes;
});

deliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);

