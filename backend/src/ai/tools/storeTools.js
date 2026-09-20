const StoreSettings = require('../../models/StoreSettings');
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const InvoiceService = require('../../services/InvoiceService');
const InventoryService = require('../../services/InventoryService');
const Product = require('../../models/Product');

/**
 * Get store settings, hours, and delivery policies
 */
const getStoreSettings = async () => {
  const settings = await StoreSettings.findOne();
  if (!settings) {
    return {
      storeName: 'LocalKart General Store',
      address: 'Shop No. 7 & 8, Main Market, Green Park, New Delhi',
      phone: '+91 98100 23456',
      deliveryChargeDefault: 30,
      freeDeliveryThreshold: 499,
      operatingHours: '8:00 AM - 10:00 PM (All 7 Days)',
    };
  }

  return {
    storeName: settings.storeName,
    tagline: settings.tagline,
    phone: settings.phone,
    email: settings.email,
    address: `${settings.address}, ${settings.city} - ${settings.pincode}`,
    gstin: settings.gstin,
    deliveryChargeDefault: settings.deliveryChargeDefault,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    operatingHours: '8:00 AM - 10:00 PM',
  };
};

/**
 * Get store sales and operational metrics (for store owner queries)
 */
const getSalesMetrics = async ({ period = 'TODAY' }) => {
  const start = new Date();
  if (period === 'TODAY') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'WEEK') {
    start.setDate(start.getDate() - 7);
  } else if (period === 'MONTH') {
    start.setMonth(start.getMonth() - 1);
  }

  const [orders, payments, pendingOrders] = await Promise.all([
    Order.find({ createdAt: { $gte: start }, orderStatus: { $ne: 'CANCELLED' } }),
    Payment.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, totalCollected: { $sum: '$paidAmount' } } },
    ]),
    Order.countDocuments({ orderStatus: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } }),
  ]);

  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const collected = payments[0]?.totalCollected || 0;

  return {
    period,
    totalOrders,
    totalSales: Math.round(totalSales * 100) / 100,
    totalCollected: Math.round(collected * 100) / 100,
    pendingOrdersCount: pendingOrders,
  };
};

/**
 * Generate invoice data for an order
 */
const generateInvoice = async ({ orderNumber, orderId }) => {
  let targetOrderId = orderId;
  if (!targetOrderId && orderNumber) {
    const order = await Order.findOne({ orderNumber: orderNumber.trim() });
    if (order) targetOrderId = order._id;
  }

  if (!targetOrderId) {
    return { success: false, message: 'Valid order ID or order number required' };
  }

  const invoiceData = await InvoiceService.getInvoiceData(targetOrderId);
  const whatsappText = InvoiceService.generateWhatsAppShareText(invoiceData.order, invoiceData.store);

  return {
    success: true,
    invoiceNumber: invoiceData.order.invoiceNumber,
    orderNumber: invoiceData.order.orderNumber,
    totalAmount: invoiceData.order.totalAmount,
    whatsappText,
  };
};

/**
 * Adjust product stock (Store owner command)
 */
const adjustProductStock = async ({ productName, productId, quantity, type = 'STOCK_IN', reason, user }) => {
  let product;
  if (productId) {
    product = await Product.findById(productId);
  } else if (productName) {
    product = await Product.findOne({ name: { $regex: productName, $options: 'i' } });
  }

  if (!product) {
    return { success: false, message: `Product "${productName || productId}" not found` };
  }

  const result = await InventoryService.adjustStock(
    product._id,
    type,
    quantity,
    reason || 'AI Store Operator adjustment',
    user
  );

  return {
    success: true,
    productName: result.product.name,
    previousStock: result.transaction.previousStock,
    newStock: result.product.stockQuantity,
    quantityAdjusted: quantity,
  };
};

module.exports = {
  getStoreSettings,
  getSalesMetrics,
  generateInvoice,
  adjustProductStock,
};
