const Payment = require('../models/Payment');
const PaymentService = require('../services/PaymentService');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private (Admin/Staff)
const getPayments = async (req, res, next) => {
  try {
    const { status, method, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (method) query.method = method;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate({ path: 'order', populate: { path: 'customer' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record or partial payment for an order
// @route   POST /api/payments
// @access  Private (Admin/Staff)
const createPayment = async (req, res, next) => {
  try {
    const { orderId, paidAmount, paymentMethod, transactionId, notes } = req.body;
    const result = await PaymentService.recordPayment({
      orderId,
      paidAmount,
      paymentMethod,
      transactionId,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get payment metrics for dashboard
// @route   GET /api/payments/stats
// @access  Private (Admin/Staff)
const getPaymentStats = async (req, res, next) => {
  try {
    const stats = await PaymentService.getPaymentStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  createPayment,
  getPaymentStats,
};
