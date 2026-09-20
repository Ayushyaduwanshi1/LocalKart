const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const InventoryService = require('./InventoryService');
const InvoiceService = require('./InvoiceService');
const NotificationService = require('./NotificationService');
const { emitNewOrder, emitOrderUpdated, emitDeliveryUpdated } = require('../sockets/socketHandler');

class OrderService {
  // Generate human-readable Order Number (e.g. ORD-2026-000001)
  static async generateOrderNumber() {
    const year = new Date().getFullYear();
    const count = await Order.countDocuments();
    const seq = String(count + 1).padStart(6, '0');
    return `ORD-${year}-${seq}`;
  }

  // Independent Backend Calculation: NEVER trust price from client
  static async calculateOrderPricing(items, orderDiscount = 0, deliveryCharge = 0) {
    let subtotal = 0;
    let gstTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const productId = item.productId || item.product;
      const requestedQty = Number(item.quantity);

      if (isNaN(requestedQty) || requestedQty <= 0) {
        throw { statusCode: 400, message: 'Item quantity must be at least 1' };
      }

      // 1. Fetch real product price & GST rate directly from database
      const product = await InventoryService.checkProductStock(productId, requestedQty);

      const realPrice = Number(product.sellingPrice);
      const purchasePrice = Number(product.purchasePrice || 0);
      const gstRate = Number(product.gst || 0);
      const itemDiscount = Number(item.discount || 0);

      const lineGross = realPrice * requestedQty;
      const lineNet = Math.max(0, lineGross - itemDiscount);
      const lineGst = (lineNet * gstRate) / 100;
      const lineTotal = lineNet + lineGst;

      subtotal += lineGross;
      gstTotal += lineGst;

      // Price snapshot to preserve history
      verifiedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        unit: product.unit || 'piece',
        price: realPrice,
        purchasePrice,
        quantity: requestedQty,
        discount: itemDiscount,
        gstRate,
        gst: Math.round(lineGst * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
      });
    }

    const appliedDiscount = Number(orderDiscount) || 0;
    const appliedDelivery = Number(deliveryCharge) || 0;
    const unroundedTotal = Math.max(0, subtotal - appliedDiscount + gstTotal + appliedDelivery);
    const roundedTotal = Math.round(unroundedTotal);
    const roundOff = Math.round((roundedTotal - unroundedTotal) * 100) / 100;

    return {
      verifiedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(appliedDiscount * 100) / 100,
      gst: Math.round(gstTotal * 100) / 100,
      deliveryCharge: Math.round(appliedDelivery * 100) / 100,
      roundOff,
      totalAmount: roundedTotal,
    };
  }

  // Create Order with Atomic Stock Deduction
  static async createOrder(orderData, user) {
    const {
      customerId,
      customerData,
      items,
      discount = 0,
      deliveryCharge = 0,
      paymentMethod = 'CASH',
      paidAmount = 0,
      orderSource = 'WALK_IN',
      deliveryAddress,
      notes = '',
    } = orderData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: 'Order must contain at least one item' };
    }

    // 1. Resolve or create customer
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else if (customerData && customerData.phone) {
      const cleanPhone = customerData.phone.trim();
      customer = await Customer.findOne({ phone: cleanPhone });
      if (!customer) {
        customer = await Customer.create({
          name: customerData.name || 'Walk-in Customer',
          phone: cleanPhone,
          email: customerData.email || '',
          address: customerData.address || deliveryAddress?.address || '',
          city: customerData.city || deliveryAddress?.city || 'New Delhi',
          pincode: customerData.pincode || deliveryAddress?.pincode || '',
        });
      }
    }

    if (!customer) {
      throw { statusCode: 400, message: 'Customer phone number or customer ID is required' };
    }

    // 2. Compute safe server-side prices & validate stock
    const pricing = await this.calculateOrderPricing(items, discount, deliveryCharge);

    // 3. Generate unique order & invoice numbers
    const orderNumber = await this.generateOrderNumber();
    const invoiceNumber = await InvoiceService.generateInvoiceNumber();

    // 4. Payment calculations
    const totalAmount = pricing.totalAmount;
    const initialPaid = paymentMethod === 'CASH' && paidAmount === 0 ? totalAmount : Number(paidAmount || 0);
    const remainingAmount = Math.max(0, totalAmount - initialPaid);
    let paymentStatus = 'PENDING';

    if (initialPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (initialPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // 5. Create Order document
    const order = await Order.create({
      orderNumber,
      invoiceNumber,
      customer: customer._id,
      items: pricing.verifiedItems,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      gst: pricing.gst,
      deliveryCharge: pricing.deliveryCharge,
      roundOff: pricing.roundOff,
      totalAmount,
      paidAmount: initialPaid,
      remainingAmount,
      paymentMethod,
      paymentStatus,
      orderStatus: 'CONFIRMED',
      orderSource,
      deliveryAddress: deliveryAddress || {
        address: customer.address || '',
        city: customer.city || 'New Delhi',
        pincode: customer.pincode || '',
        phone: customer.phone || '',
      },
      notes,
      stockDeducted: false,
      createdBy: user?._id,
    });

    // 6. Atomically deduct inventory
    await InventoryService.deductOrderStock(order, user);

    // 7. Update Customer metrics
    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.totalSpending = (customer.totalSpending || 0) + order.totalAmount;
    customer.lastOrderDate = new Date();
    await customer.save();

    // 8. Create Delivery record for delivery orders
    if (['WHATSAPP', 'PHONE', 'WEBSITE', 'APP'].includes(orderSource) || deliveryAddress?.address) {
      const delivery = await Delivery.create({
        order: order._id,
        customer: customer._id,
        phone: deliveryAddress?.phone || customer.phone,
        address: `${deliveryAddress?.address || customer.address}, ${deliveryAddress?.city || customer.city || ''}`.trim(),
        status: 'PENDING',
        notes: notes || `Order #${order.orderNumber}`,
      });
      emitDeliveryUpdated(delivery);
    }

    // 9. Record initial payment record
    await Payment.create({
      order: order._id,
      amount: totalAmount,
      paidAmount: initialPaid,
      remainingAmount,
      method: paymentMethod,
      status: paymentStatus,
      transactionId: paymentMethod === 'UPI' ? `UPI-${Date.now()}` : '',
      notes: `Initial order payment (${paymentStatus})`,
    });

    // 10. Notifications & Socket.IO
    await NotificationService.notifyOrderConfirmed(order);

    const populatedOrder = await Order.findById(order._id)
      .populate('customer')
      .populate('items.product')
      .populate('createdBy', 'name email role');

    emitNewOrder(populatedOrder);

    return populatedOrder;
  }

  // Update order status with stock restoration guard
  static async updateOrderStatus(orderId, newStatus, user) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw { statusCode: 404, message: 'Order not found' };
    }

    const previousStatus = order.orderStatus;
    if (previousStatus === newStatus) {
      return order; // Idempotent
    }

    // Cancellation: restore stock exactly once
    if (newStatus === 'CANCELLED') {
      await InventoryService.restoreOrderStock(order, user);
      await NotificationService.notifyOrderCancelled(order);
      await Delivery.findOneAndUpdate({ order: order._id }, { status: 'FAILED' });
    } else if (newStatus === 'PACKED') {
      await NotificationService.notifyOrderPacked(order);
    } else if (newStatus === 'OUT_FOR_DELIVERY') {
      await NotificationService.notifyOrderOutForDelivery(order);
    } else if (newStatus === 'DELIVERED') {
      await NotificationService.notifyOrderDelivered(order);
      if (order.paymentMethod === 'COD' || order.paymentMethod === 'CASH') {
        order.paymentStatus = 'PAID';
        order.paidAmount = order.totalAmount;
        order.remainingAmount = 0;
      }
    }

    order.orderStatus = newStatus;
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer')
      .populate('items.product');

    emitOrderUpdated(populated);
    return populated;
  }

  // Public order tracking view for customer
  static async getOrderForTracking(orderNumber) {
    const order = await Order.findOne({ orderNumber: orderNumber.trim() })
      .populate('customer', 'name phone address')
      .populate('items.product', 'name image unit');

    if (!order) {
      throw { statusCode: 404, message: `No order found with number "${orderNumber}"` };
    }

    const delivery = await Delivery.findOne({ order: order._id }).populate('deliveryPartner', 'name phone');

    return {
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      orderSource: order.orderSource,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        total: i.total,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      gst: order.gst,
      deliveryCharge: order.deliveryCharge,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      remainingAmount: order.remainingAmount,
      deliveryAddress: order.deliveryAddress,
      deliveryStatus: delivery?.status || 'NOT_REQUIRED',
      deliveryPartner: delivery?.deliveryPartner ? { name: delivery.deliveryPartner.name, phone: delivery.deliveryPartner.phone } : null,
    };
  }
}

module.exports = OrderService;
