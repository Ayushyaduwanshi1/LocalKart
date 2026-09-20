const Delivery = require('../models/Delivery');
const DeliveryService = require('../services/DeliveryService');

// @desc    Get all deliveries
// @route   GET /api/deliveries
// @access  Private (Admin/Staff/Delivery)
const getDeliveries = async (req, res, next) => {
  try {
    const { status, partnerId, page = 1, limit = 50 } = req.query;
    const query = {};

    // Delivery rider can only see their own assigned deliveries
    if (req.user && req.user.role === 'DELIVERY') {
      query.deliveryPartner = req.user._id;
    } else if (partnerId) {
      query.deliveryPartner = partnerId;
    }

    if (status) query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate('order')
        .populate('customer', 'name phone address city pincode')
        .populate('deliveryPartner', 'name phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Delivery.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: deliveries,
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

// @desc    Get single delivery
// @route   GET /api/deliveries/:id
// @access  Private
const getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('order')
      .populate('customer')
      .populate('deliveryPartner', 'name phone email');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    // Role check: Delivery partner cannot view another rider's delivery
    if (req.user && req.user.role === 'DELIVERY' && String(delivery.deliveryPartner?._id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view another partner’s delivery details.',
      });
    }

    res.status(200).json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign delivery partner
// @route   POST /api/deliveries/:id/assign
// @access  Private (Admin/Staff)
const assignDelivery = async (req, res, next) => {
  try {
    const { deliveryPartnerId, notes } = req.body;
    const delivery = await DeliveryService.assignDeliveryPartner(req.params.id, deliveryPartnerId, notes);
    res.status(200).json({
      success: true,
      message: 'Delivery partner assigned successfully',
      data: delivery,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update delivery status
// @route   PATCH /api/deliveries/:id/status
// @access  Private (Admin/Staff/Delivery)
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const delivery = await DeliveryService.updateDeliveryStatus(req.params.id, status, req.user, notes);
    res.status(200).json({
      success: true,
      message: `Delivery status updated to ${status}`,
      data: delivery,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getDeliveries,
  getDeliveryById,
  assignDelivery,
  updateDeliveryStatus,
};
