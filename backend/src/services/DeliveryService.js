const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const NotificationService = require('./NotificationService');
const { emitDeliveryUpdated, emitOrderUpdated } = require('../sockets/socketHandler');

class DeliveryService {
  // Assign delivery partner to order
  static async assignDeliveryPartner(deliveryId, partnerId, notes = '') {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw { statusCode: 404, message: 'Delivery record not found' };
    }

    delivery.deliveryPartner = partnerId;
    delivery.status = 'ASSIGNED';
    delivery.assignedAt = new Date();
    if (notes) delivery.notes = notes;
    await delivery.save();

    // Move order to PACKED
    const order = await Order.findByIdAndUpdate(
      delivery.order,
      { orderStatus: 'PACKED' },
      { new: true }
    );

    const populated = await Delivery.findById(delivery._id)
      .populate('order')
      .populate('customer')
      .populate('deliveryPartner', 'name phone email');

    if (order) {
      await NotificationService.notifyOrderPacked(order);
      emitOrderUpdated(order);
    }
    emitDeliveryUpdated(populated);

    return populated;
  }

  // Update delivery status with security check for delivery partners
  static async updateDeliveryStatus(deliveryId, newStatus, user, notes = '') {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw { statusCode: 404, message: 'Delivery record not found' };
    }

    // Role Security: A delivery partner can ONLY update deliveries assigned to them
    if (user && user.role === 'DELIVERY') {
      if (String(delivery.deliveryPartner) !== String(user._id)) {
        throw {
          statusCode: 403,
          message: 'Forbidden: You are not authorized to access or update another partner’s delivery.',
        };
      }
    }

    delivery.status = newStatus;
    if (notes) delivery.notes = notes;

    const order = await Order.findById(delivery.order);

    if (newStatus === 'PICKED_UP') {
      delivery.pickedUpAt = new Date();
      if (order && order.orderStatus === 'CONFIRMED') {
        order.orderStatus = 'PACKED';
        await order.save();
        emitOrderUpdated(order);
      }
    } else if (newStatus === 'OUT_FOR_DELIVERY') {
      if (order) {
        order.orderStatus = 'OUT_FOR_DELIVERY';
        await order.save();
        await NotificationService.notifyOrderOutForDelivery(order);
        emitOrderUpdated(order);
      }
    } else if (newStatus === 'DELIVERED') {
      delivery.deliveredAt = new Date();

      if (order) {
        order.orderStatus = 'DELIVERED';
        // If Cash on Delivery, finalize payment as PAID
        if (order.paymentMethod === 'COD' || order.paymentMethod === 'CASH') {
          order.paymentStatus = 'PAID';
          order.paidAmount = order.totalAmount;
          order.remainingAmount = 0;
        }
        await order.save();
        await NotificationService.notifyOrderDelivered(order);
        emitOrderUpdated(order);
      }
    }

    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate('order')
      .populate('customer')
      .populate('deliveryPartner', 'name phone email');

    emitDeliveryUpdated(populated);

    return populated;
  }
}

module.exports = DeliveryService;
