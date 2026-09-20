const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Delivery = require('../models/Delivery');
const PaymentService = require('../services/PaymentService');

// @desc    Get aggregated stats and charts for Admin & Staff dashboard
// @route   GET /api/dashboard/stats
// @access  Private (Admin/Staff)
const getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      todaySalesAgg,
      pendingOrdersCount,
      completedOrdersCount,
      totalOrdersCount,
      totalCustomersCount,
      lowStockCount,
      outOfStockCount,
      pendingDeliveriesCount,
      recentOrders,
      lowStockProducts,
      pendingDeliveries,
      recentCustomers,
      dailySalesChart,
      topSellingProducts,
      orderStatusDistribution,
      paymentStats,
    ] = await Promise.all([
      // Today's Sales & Orders
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart },
            orderStatus: { $ne: 'CANCELLED' },
          },
        },
        {
          $group: {
            _id: null,
            todaySales: { $sum: '$totalAmount' },
            todayOrders: { $sum: 1 },
          },
        },
      ]),

      Order.countDocuments({
        orderStatus: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'] },
      }),

      Order.countDocuments({ orderStatus: 'DELIVERED' }),
      Order.countDocuments(),
      Customer.countDocuments(),

      Product.countDocuments({
        isActive: true,
        $expr: {
          $and: [
            { $gt: ['$stockQuantity', 0] },
            { $lte: ['$stockQuantity', '$minimumStockLevel'] },
          ],
        },
      }),

      Product.countDocuments({ isActive: true, stockQuantity: { $lte: 0 } }),

      Delivery.countDocuments({
        status: { $in: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      }),

      Order.find()
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(8),

      Product.find({
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$minimumStockLevel'] },
      })
        .populate('category', 'name')
        .sort({ stockQuantity: 1 })
        .limit(6),

      Delivery.find({
        status: { $in: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      })
        .populate('order', 'orderNumber totalAmount paymentMethod')
        .populate('customer', 'name phone address')
        .populate('deliveryPartner', 'name phone')
        .sort({ createdAt: -1 })
        .limit(6),

      Customer.find().sort({ createdAt: -1 }).limit(5),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
            orderStatus: { $ne: 'CANCELLED' },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sales: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            orderStatus: { $ne: 'CANCELLED' },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),

      Order.aggregate([
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 },
          },
        },
      ]),

      // Call PaymentService for payment collection breakdown
      PaymentService.getPaymentStats(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        cards: {
          todaySales: todaySalesAgg[0]?.todaySales || 0,
          todayOrders: todaySalesAgg[0]?.todayOrders || 0,
          pendingOrders: pendingOrdersCount,
          completedOrders: completedOrdersCount,
          totalOrders: totalOrdersCount,
          totalCustomers: totalCustomersCount,
          lowStockProducts: lowStockCount,
          outOfStockProducts: outOfStockCount,
          pendingDeliveries: pendingDeliveriesCount,
          // Payment statistics
          todayCollectedPayment: paymentStats.todayCollected,
          totalPendingPayment: paymentStats.totalPending,
          cashCollection: paymentStats.cashCollection,
          upiCollection: paymentStats.upiCollection,
          cardCollection: paymentStats.cardCollection,
          codPending: paymentStats.codPending,
        },
        charts: {
          dailySales: dailySalesChart,
          topProducts: topSellingProducts,
          orderStatus: orderStatusDistribution,
          paymentMethods: [
            { _id: 'CASH', count: paymentStats.cashCollection },
            { _id: 'UPI', count: paymentStats.upiCollection },
            { _id: 'CARD', count: paymentStats.cardCollection },
            { _id: 'COD', count: paymentStats.codPending },
          ],
        },
        lists: {
          recentOrders,
          lowStockProducts,
          pendingDeliveries,
          recentCustomers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
