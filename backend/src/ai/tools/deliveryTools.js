const Delivery = require('../../models/Delivery');
const Order = require('../../models/Order');
const User = require('../../models/User');
const DeliveryService = require('../../services/DeliveryService');

/**
 * Check delivery status and rider details
 */
const getDeliveryStatus = async ({ orderNumber, orderId }) => {
  let targetOrderId = orderId;
  if (!targetOrderId && orderNumber) {
    const order = await Order.findOne({ orderNumber: orderNumber.trim() });
    if (order) targetOrderId = order._id;
  }

  if (!targetOrderId) {
    return { found: false, message: 'Valid order ID or order number required' };
  }

  const delivery = await Delivery.findOne({ order: targetOrderId })
    .populate('deliveryPartner', 'name phone email')
    .populate('customer', 'name address phone');

  if (!delivery) {
    return { found: false, message: 'No delivery dispatch created for this order' };
  }

  return {
    found: true,
    status: delivery.status,
    address: delivery.address,
    customerName: delivery.customer?.name || delivery.customerName,
    assignedRider: delivery.deliveryPartner
      ? {
          name: delivery.deliveryPartner.name,
          phone: delivery.deliveryPartner.phone,
        }
      : null,
    assignedAt: delivery.assignedAt,
    pickedUpAt: delivery.pickedUpAt,
    deliveredAt: delivery.deliveredAt,
  };
};

/**
 * Assign delivery partner to an order
 */
const assignDeliveryPartner = async ({ deliveryId, orderNumber, deliveryPartnerId, notes }) => {
  let targetDeliveryId = deliveryId;
  if (!targetDeliveryId && orderNumber) {
    const order = await Order.findOne({ orderNumber: orderNumber.trim() });
    if (order) {
      const delivery = await Delivery.findOne({ order: order._id });
      if (delivery) targetDeliveryId = delivery._id;
    }
  }

  if (!targetDeliveryId) {
    return { success: false, message: 'Delivery record not found' };
  }

  // If partner not explicitly provided, find first active delivery partner
  let partnerId = deliveryPartnerId;
  if (!partnerId) {
    const rider = await User.findOne({ role: 'DELIVERY', isActive: true });
    if (rider) partnerId = rider._id;
  }

  if (!partnerId) {
    return { success: false, message: 'No active delivery rider available for assignment' };
  }

  const updatedDelivery = await DeliveryService.assignDeliveryPartner(targetDeliveryId, partnerId, notes);

  return {
    success: true,
    message: `Delivery assigned to rider ${updatedDelivery.deliveryPartner?.name || ''}`,
    status: updatedDelivery.status,
    rider: {
      name: updatedDelivery.deliveryPartner?.name,
      phone: updatedDelivery.deliveryPartner?.phone,
    },
  };
};

module.exports = {
  getDeliveryStatus,
  assignDeliveryPartner,
};
