const Order = require('../models/Order');
const Customer = require('../models/Customer');
const OrderService = require('../services/OrderService');
const InvoiceService = require('../services/InvoiceService');

// @desc    Get all orders with filters, search, pagination
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const {
      search,
      orderStatus,
      paymentStatus,
      orderSource,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      customerId,
    } = req.query;

    const query = {};

    if (req.user && req.user.role === 'CUSTOMER') {
      const customer = await Customer.findOne({
        $or: [{ email: req.user.email }, { phone: req.user.phone }],
      });
      if (!customer) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 50, total: 0, pages: 0 },
        });
      }
      query.customer = customer._id;
    } else if (customerId) {
      query.customer = customerId;
    }

    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (orderSource) query.orderSource = orderSource;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const matchedCustomers = await Customer.find({
        $or: [{ name: searchRegex }, { phone: searchRegex }],
      }).select('_id');
      const customerIds = matchedCustomers.map((c) => c._id);

      query.$or = [
        { orderNumber: searchRegex },
        { invoiceNumber: searchRegex },
        { customer: { $in: customerIds } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name phone email address city pincode')
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
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

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('items.product')
      .populate('createdBy', 'name email role');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Customer authorization check
    if (req.user && req.user.role === 'CUSTOMER') {
      const customer = await Customer.findOne({
        $or: [{ email: req.user.email }, { phone: req.user.phone }],
      });
      if (!customer || String(order.customer._id) !== String(customer._id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this order' });
      }
    }

    const Delivery = require('../models/Delivery');
    const delivery = await Delivery.findOne({ order: order._id }).populate('deliveryPartner', 'name phone email');

    res.status(200).json({
      success: true,
      data: {
        ...order.toObject(),
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const order = await OrderService.createOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        availableStock: error.availableStock,
      });
    }
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Admin/Staff)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const order = await OrderService.updateOrderStatus(req.params.id, orderStatus, req.user);

    res.status(200).json({
      success: true,
      message: `Order status updated to ${order.orderStatus}`,
      data: order,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Public Customer Order Tracking
// @route   GET /api/orders/track/:orderNumber
// @access  Public
const trackOrder = async (req, res, next) => {
  try {
    const trackingData = await OrderService.getOrderForTracking(req.params.orderNumber);
    res.status(200).json({
      success: true,
      data: trackingData,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get Invoice Data & WhatsApp Share text
// @route   GET /api/orders/:id/invoice
// @access  Private
const getInvoice = async (req, res, next) => {
  try {
    const invoiceData = await InvoiceService.getInvoiceData(req.params.id);
    const whatsappText = InvoiceService.generateWhatsAppShareText(invoiceData.order, invoiceData.store);

    res.status(200).json({
      success: true,
      data: {
        ...invoiceData,
        whatsappText,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Delete order (Admin only)
// @route   DELETE /api/orders/:id
// @access  Private (Admin)
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, message: 'Order deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  trackOrder,
  getInvoice,
  deleteOrder,
};
