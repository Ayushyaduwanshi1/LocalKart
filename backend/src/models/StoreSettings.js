const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'LocalKart Super Store',
    },
    tagline: {
      type: String,
      default: 'Your Trusted Neighborhood Kirana & Daily Essentials',
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    email: {
      type: String,
      default: 'contact@localkart.com',
    },
    address: {
      type: String,
      default: 'Shop #14, Ground Floor, Central Market',
    },
    city: {
      type: String,
      default: 'New Delhi',
    },
    pincode: {
      type: String,
      default: '110001',
    },
    gstin: {
      type: String,
      default: '07AABCL1234F1Z8',
    },
    currency: {
      type: String,
      default: '₹',
    },
    deliveryChargeDefault: {
      type: Number,
      default: 25,
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 499,
    },
    receiptFooter: {
      type: String,
      default: 'Thank you for supporting local businesses! Visit again or order via WhatsApp.',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
