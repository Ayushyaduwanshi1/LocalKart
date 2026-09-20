const Payment = require('../models/Payment');
const Order = require('../models/Order');
const NotificationService = require('./NotificationService');
const { emitPaymentUpdated, emitOrderUpdated } = require('../sockets/socketHandler');

class PaymentService {
  // Record or update payment for an order
  static async recordPayment({ orderId, paidAmount, paymentMethod, transactionId = '', notes = '' }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw { statusCode: 404, message: 'Order not found' };
    }

    const payAmount = Number(paidAmount);
    if (isNaN(payAmount) || payAmount < 0) {
      throw { statusCode: 400, message: 'Paid amount must be a positive number' };
    }

    // Check existing payment status
    if (order.paymentStatus === 'PAID') {
      throw { statusCode: 400, message: 'This order is already fully PAID' };
    }

    const currentPaid = Number(order.paidAmount || 0);
    const newTotalPaid = currentPaid + payAmount;
    const totalOrderAmount = Number(order.totalAmount);

    if (newTotalPaid > totalOrderAmount) {
      throw {
        statusCode: 400,
        message: `Paid amount (₹${newTotalPaid}) cannot exceed order total (₹${totalOrderAmount})`,
      };
    }

    const remaining = Math.max(0, totalOrderAmount - newTotalPaid);
    let newStatus = 'PENDING';

    if (newTotalPaid >= totalOrderAmount) {
      newStatus = 'PAID';
    } else if (newTotalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    // Update order
    order.paidAmount = Math.round(newTotalPaid * 100) / 100;
    order.remainingAmount = Math.round(remaining * 100) / 100;
    order.paymentStatus = newStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    await order.save();

    // Create payment history record
    const paymentRecord = await Payment.create({
      order: order._id,
      amount: totalOrderAmount,
      paidAmount: payAmount,
      remainingAmount: remaining,
      method: paymentMethod || order.paymentMethod,
      status: newStatus,
      transactionId,
      notes: notes || `Payment recorded for order ${order.orderNumber}`,
    });

    emitPaymentUpdated(paymentRecord);
    emitOrderUpdated(order);

    return { order, payment: paymentRecord };
  }

  // Aggregated payment metrics for admin dashboard
  static async getPaymentStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayCollectedAgg, pendingAgg, methodBreakdown] = await Promise.all([
      // Today's collected
      Payment.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        { $group: { _id: null, totalCollected: { $sum: '$paidAmount' } } },
      ]),

      // Total pending payments
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'CANCELLED' }, paymentStatus: { $in: ['PENDING', 'PARTIALLY_PAID'] } } },
        { $group: { _id: null, totalPending: { $sum: '$remainingAmount' }, count: { $sum: 1 } } },
      ]),

      // Method collection breakdown
      Payment.aggregate([
        {
          $group: {
            _id: '$method',
            totalCollected: { $sum: '$paidAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const methods = {};
    methodBreakdown.forEach((m) => {
      methods[m._id] = m.totalCollected;
    });

    // COD pending
    const codPendingAgg = await Order.aggregate([
      { $match: { paymentMethod: 'COD', paymentStatus: 'PENDING', orderStatus: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    return {
      todayCollected: todayCollectedAgg[0]?.totalCollected || 0,
      totalPending: pendingAgg[0]?.totalPending || 0,
      pendingOrdersCount: pendingAgg[0]?.count || 0,
      cashCollection: methods['CASH'] || 0,
      upiCollection: methods['UPI'] || 0,
      cardCollection: methods['CARD'] || 0,
      codPending: codPendingAgg[0]?.total || 0,
    };
  }
}

module.exports = PaymentService;
