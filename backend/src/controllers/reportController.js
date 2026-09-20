const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryTransaction = require('../models/InventoryTransaction');

// Helper to get date match query
const getDateQuery = (startDate, endDate) => {
  const match = { orderStatus: { $ne: 'CANCELLED' } };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.createdAt.$lte = end;
    }
  }
  return match;
};

// @desc    Sales Analytics (Daily, Weekly, Monthly breakdown)
// @route   GET /api/reports/sales
// @access  Private (Admin)
const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const match = getDateQuery(startDate, endDate);

    let dateGroupingFormat = '%Y-%m-%d';
    if (groupBy === 'month') {
      dateGroupingFormat = '%Y-%m';
    } else if (groupBy === 'week') {
      dateGroupingFormat = '%Y-W%V';
    }

    const salesTimeline = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: dateGroupingFormat, date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          subtotal: { $sum: '$subtotal' },
          totalDiscount: { $sum: '$discount' },
          totalGst: { $sum: '$gst' },
          totalDeliveryCharges: { $sum: '$deliveryCharge' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Summary totals
    const summary = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalDiscount: { $sum: '$discount' },
          totalGst: { $sum: '$gst' },
        },
      },
    ]);

    // Payment method breakdown
    const paymentMethods = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Order source breakdown
    const orderSources = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$orderSource',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: summary[0] || {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          totalDiscount: 0,
          totalGst: 0,
        },
        timeline: salesTimeline,
        paymentMethods,
        orderSources,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Product Sales & Profit Margin Report
// @route   GET /api/reports/products
// @access  Private (Admin)
const getProductSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = getDateQuery(startDate, endDate);

    const productSales = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
          estimatedCost: {
            $sum: { $multiply: ['$items.quantity', { $ifNull: ['$items.purchasePrice', 0] }] },
          },
          orderOccurrences: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          sku: 1,
          unitsSold: 1,
          revenue: { $round: ['$revenue', 2] },
          estimatedCost: { $round: ['$estimatedCost', 2] },
          grossProfit: { $round: [{ $subtract: ['$revenue', '$estimatedCost'] }, 2] },
          marginPercent: {
            $cond: [
              { $gt: ['$revenue', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: [{ $subtract: ['$revenue', '$estimatedCost'] }, '$revenue'] },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
          orderOccurrences: 1,
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 30 },
    ]);

    res.status(200).json({
      success: true,
      data: productSales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer Spending & Loyalty Report
// @route   GET /api/reports/customers
// @access  Private (Admin)
const getCustomerReport = async (req, res, next) => {
  try {
    const topCustomers = await Customer.find()
      .sort({ totalSpending: -1 })
      .limit(25)
      .select('name phone email city totalOrders totalSpending lastOrderDate');

    res.status(200).json({
      success: true,
      data: topCustomers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Inventory Valuation & Stock Turnover Report
// @route   GET /api/reports/inventory
// @access  Private (Admin)
const getInventoryReport = async (req, res, next) => {
  try {
    const categoryValuation = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$categoryInfo.name',
          productCount: { $sum: 1 },
          totalStockUnits: { $sum: '$stockQuantity' },
          totalCostValuation: { $sum: { $multiply: ['$stockQuantity', '$purchasePrice'] } },
          totalRetailValuation: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
        },
      },
      {
        $project: {
          category: '$_id',
          productCount: 1,
          totalStockUnits: 1,
          totalCostValuation: { $round: ['$totalCostValuation', 2] },
          totalRetailValuation: { $round: ['$totalRetailValuation', 2] },
          potentialProfit: {
            $round: [{ $subtract: ['$totalRetailValuation', '$totalCostValuation'] }, 2],
          },
        },
      },
      { $sort: { totalRetailValuation: -1 } },
    ]);

    const lowStockItems = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$minimumStockLevel'] },
    })
      .populate('category', 'name')
      .sort({ stockQuantity: 1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        categoryValuation,
        lowStockItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getProductSalesReport,
  getCustomerReport,
  getInventoryReport,
};
