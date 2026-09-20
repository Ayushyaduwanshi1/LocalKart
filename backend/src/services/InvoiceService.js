const Order = require('../models/Order');
const StoreSettings = require('../models/StoreSettings');

class InvoiceService {
  static async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await Order.countDocuments({ invoiceNumber: { $exists: true, $ne: null } });
    const seq = String(count + 1).padStart(6, '0');
    return `INV-${year}-${seq}`;
  }

  static async getInvoiceData(orderId) {
    const [order, settings] = await Promise.all([
      Order.findById(orderId)
        .populate('customer')
        .populate('createdBy', 'name email role'),
      StoreSettings.findOne(),
    ]);

    if (!order) {
      throw { statusCode: 404, message: 'Order not found' };
    }

    const store = settings || {
      storeName: 'LocalKart General Store',
      tagline: 'Your Trusted Neighborhood Kirana',
      address: 'Shop No. 7 & 8, Main Market, Green Park',
      city: 'New Delhi',
      pincode: '110016',
      phone: '+91 98100 23456',
      gstin: '07AAACL9999F1Z2',
      receiptFooter: 'Thank you for shopping at LocalKart! Visit again.',
    };

    return {
      order,
      store,
    };
  }

  // Prepares pre-formatted WhatsApp share message
  static generateWhatsAppShareText(order, store) {
    const storeName = store?.storeName || 'LocalKart Store';
    const lines = [
      `*${storeName} - Bill / Tax Invoice*`,
      `Invoice #: ${order.invoiceNumber || order.orderNumber}`,
      `Order #: ${order.orderNumber}`,
      `Date: ${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `Customer: ${order.customer?.name || 'Valued Customer'}`,
      `-----------------------------`,
      `*Items:*`,
    ];

    order.items.forEach((item) => {
      lines.push(`• ${item.name} (${item.quantity} ${item.unit}) - ₹${item.total.toFixed(2)}`);
    });

    lines.push(`-----------------------------`);
    lines.push(`Subtotal: ₹${order.subtotal.toFixed(2)}`);
    if (order.discount > 0) lines.push(`Discount: -₹${order.discount.toFixed(2)}`);
    if (order.gst > 0) lines.push(`GST: ₹${order.gst.toFixed(2)}`);
    if (order.deliveryCharge > 0) lines.push(`Delivery: ₹${order.deliveryCharge.toFixed(2)}`);
    lines.push(`*Grand Total: ₹${order.totalAmount.toFixed(2)}*`);
    lines.push(`Payment: ${order.paymentMethod} (${order.paymentStatus})`);
    lines.push(`-----------------------------`);
    lines.push(`Track live order status: ${process.env.CLIENT_URL || 'http://localhost:5173'}/track-order/${order.orderNumber}`);
    lines.push(`Thank you for shopping with us!`);

    return lines.join('\n');
  }
}

module.exports = InvoiceService;
