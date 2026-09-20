const Notification = require('../models/Notification');
const { emitNotification } = require('../sockets/socketHandler');

class NotificationService {
  static async sendNotification({ title, message, type = 'NEW_ORDER', link = '', metadata = {} }) {
    try {
      const notification = await Notification.create({
        title,
        message,
        type,
        link,
        metadata,
      });

      emitNotification(notification);

      // Webhook extension point for future WhatsApp/SMS/Email providers
      // e.g. if (process.env.WHATSAPP_API_ENABLED) { ... }

      return notification;
    } catch (err) {
      console.error('[NotificationService Error]', err.message);
    }
  }

  static async notifyOrderConfirmed(order) {
    return this.sendNotification({
      title: 'Order Confirmed',
      message: `Your order ${order.orderNumber} has been confirmed. Total: ₹${order.totalAmount}`,
      type: 'ORDER_CONFIRMED',
      link: `/orders/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });
  }

  static async notifyOrderPacked(order) {
    return this.sendNotification({
      title: 'Order Packed',
      message: `Your order ${order.orderNumber} has been packed and is ready for dispatch.`,
      type: 'ORDER_CONFIRMED',
      link: `/orders/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });
  }

  static async notifyOrderOutForDelivery(order) {
    return this.sendNotification({
      title: 'Out for Delivery',
      message: `Your order ${order.orderNumber} is out for delivery with our delivery partner.`,
      type: 'DELIVERY_ASSIGNED',
      link: `/orders/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });
  }

  static async notifyOrderDelivered(order) {
    return this.sendNotification({
      title: 'Order Delivered',
      message: `Your order ${order.orderNumber} has been delivered successfully. Thank you for shopping with us!`,
      type: 'DELIVERY_COMPLETED',
      link: `/orders/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });
  }

  static async notifyOrderCancelled(order) {
    return this.sendNotification({
      title: 'Order Cancelled',
      message: `Order ${order.orderNumber} was cancelled and inventory has been restored.`,
      type: 'ORDER_CANCELLED',
      link: `/orders/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });
  }

  static async notifyStockAlert(product, type = 'LOW_STOCK') {
    return this.sendNotification({
      title: type === 'OUT_OF_STOCK' ? 'Out of Stock Alert' : 'Low Stock Alert',
      message: type === 'OUT_OF_STOCK'
        ? `Product "${product.name}" is now OUT OF STOCK!`
        : `Product "${product.name}" has reached low stock (${product.stockQuantity} ${product.unit} left).`,
      type,
      link: '/inventory',
      metadata: { productId: product._id, stockQuantity: product.stockQuantity },
    });
  }
}

module.exports = NotificationService;
