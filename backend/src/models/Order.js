const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    default: '',
  },
  unit: {
    type: String,
    default: 'piece',
  },
  price: {
    type: Number,
    required: true,
  },
  purchasePrice: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  discount: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    default: 0,
  },
  gst: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    gst: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'ONLINE', 'COD'],
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'PACKED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PENDING',
      index: true,
    },
    orderSource: {
      type: String,
      enum: ['WHATSAPP', 'PHONE', 'WALK_IN', 'WEBSITE', 'APP'],
      default: 'WALK_IN',
      index: true,
    },
    deliveryAddress: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      pincode: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    notes: {
      type: String,
      default: '',
    },
    stockDeducted: {
      type: Boolean,
      default: false,
      index: true,
    },
    inventoryRestored: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
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

orderSchema.virtual('customerId').get(function () {
  return this.customer;
});

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

