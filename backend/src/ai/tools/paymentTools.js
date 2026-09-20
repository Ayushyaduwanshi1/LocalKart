const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const PaymentService = require('../../services/PaymentService');

/**
 * Get verified payment status from backend database
 */
const getPaymentStatus = async ({ orderNumber, orderId }) => {
  let order;
  if (orderId) {
    order = await Order.findById(orderId);
  } else if (orderNumber) {
    order = await Order.findOne({ orderNumber: orderNumber.trim() });
  }

  if (!order) {
    return { found: false, message: 'Order not found' };
  }

  const payments = await Payment.find({ order: order._id }).sort({ createdAt: -1 });

  return {
    found: true,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    paidAmount: order.paidAmount,
    remainingAmount: order.remainingAmount,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    isPaid: order.paymentStatus === 'PAID',
    isPending: order.paymentStatus === 'PENDING',
    paymentHistory: payments.map((p) => ({
      amount: p.paidAmount,
      method: p.method,
      status: p.status,
      transactionId: p.transactionId,
      date: p.createdAt,
    })),
  };
};

/**
 * Record a payment with transaction details
 */
const recordPayment = async ({ orderNumber, orderId, paidAmount, paymentMethod, transactionId, notes }) => {
  let targetOrderId = orderId;
  if (!targetOrderId && orderNumber) {
    const order = await Order.findOne({ orderNumber: orderNumber.trim() });
    if (order) targetOrderId = order._id;
  }

  if (!targetOrderId) {
    return { success: false, message: 'Valid order ID or order number required' };
  }

  const result = await PaymentService.recordPayment({
    orderId: targetOrderId,
    paidAmount,
    paymentMethod,
    transactionId,
    notes,
  });

  return {
    success: true,
    message: `Payment of ₹${paidAmount} recorded successfully`,
    paymentStatus: result.order.paymentStatus,
    remainingAmount: result.order.remainingAmount,
  };
};

module.exports = {
  getPaymentStatus,
  recordPayment,
};
