const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const AIConversation = require('../../models/AIConversation');
const OrderService = require('../../services/OrderService');
const StoreSettings = require('../../models/StoreSettings');

/**
 * Calculate pricing using backend source of truth
 */
const calculateOrder = async ({ items, discount = 0, deliveryCharge = 0 }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, message: 'At least one item required for pricing calculation' };
  }

  const calculation = await OrderService.calculateOrderPricing(items, discount, deliveryCharge);
  return {
    success: true,
    calculation,
  };
};

/**
 * Create an order draft inside conversation
 */
const createOrderDraft = async ({ conversationId, customerId, items, deliveryAddress, paymentMethod = 'COD', notes = '' }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, message: 'Draft items cannot be empty' };
  }

  // Check delivery settings
  const settings = await StoreSettings.findOne();
  const defaultDeliveryCharge = settings?.deliveryChargeDefault || 30;
  const freeThreshold = settings?.freeDeliveryThreshold || 499;

  // Calculate pricing
  const calculation = await OrderService.calculateOrderPricing(items, 0, 0);

  // Apply delivery charge policy
  let deliveryFee = defaultDeliveryCharge;
  if (calculation.subtotal >= freeThreshold) {
    deliveryFee = 0;
  }

  const finalCalculation = await OrderService.calculateOrderPricing(items, 0, deliveryFee);

  const draftData = {
    items: finalCalculation.verifiedItems.map((i) => ({
      productId: i.product,
      name: i.name,
      unit: i.unit,
      price: i.price,
      quantity: i.quantity,
      discount: i.discount || 0,
      gstRate: i.gstRate || 0,
      gst: i.gst || 0,
      total: i.total,
    })),
    subtotal: finalCalculation.subtotal,
    discount: finalCalculation.discount,
    gst: finalCalculation.gst,
    deliveryCharge: finalCalculation.deliveryCharge,
    totalAmount: finalCalculation.totalAmount,
    deliveryAddress: deliveryAddress || {
      address: '',
      city: 'New Delhi',
      pincode: '',
      phone: '',
    },
    paymentMethod,
    notes,
    status: 'DRAFT',
    updatedAt: new Date(),
  };

  if (conversationId) {
    await AIConversation.findByIdAndUpdate(conversationId, {
      currentOrderDraft: draftData,
      customerId: customerId || undefined,
      status: 'ACTIVE',
      lastMessageAt: new Date(),
    });
  }

  return {
    success: true,
    message: 'Order draft created successfully',
    draft: draftData,
  };
};

/**
 * Modify an existing order draft (add items, remove items, change quantities)
 */
const modifyOrderDraft = async ({ conversationId, addItems = [], removeProductNames = [], updateQuantities = [] }) => {
  const conv = await AIConversation.findById(conversationId);
  if (!conv || !conv.currentOrderDraft || !conv.currentOrderDraft.items?.length) {
    return { success: false, message: 'No active order draft found to modify' };
  }

  let draftItems = [...conv.currentOrderDraft.items];

  // 1. Remove items
  if (removeProductNames && removeProductNames.length > 0) {
    const removeKeywords = removeProductNames.map((n) => n.toLowerCase().trim());
    draftItems = draftItems.filter((i) => !removeKeywords.some((kw) => i.name.toLowerCase().includes(kw)));
  }

  // 2. Update existing quantities
  if (updateQuantities && updateQuantities.length > 0) {
    for (const u of updateQuantities) {
      const match = draftItems.find(
        (i) =>
          String(i.productId) === String(u.productId) ||
          i.name.toLowerCase().includes((u.name || '').toLowerCase())
      );
      if (match) {
        match.quantity = Number(u.quantity);
      }
    }
  }

  // 3. Add new items
  if (addItems && addItems.length > 0) {
    for (const add of addItems) {
      const existing = draftItems.find(
        (i) =>
          String(i.productId) === String(add.productId) ||
          i.name.toLowerCase().includes((add.name || '').toLowerCase())
      );
      if (existing) {
        existing.quantity += Number(add.quantity || 1);
      } else {
        draftItems.push(add);
      }
    }
  }

  if (draftItems.length === 0) {
    conv.currentOrderDraft.items = [];
    conv.currentOrderDraft.subtotal = 0;
    conv.currentOrderDraft.totalAmount = 0;
    conv.currentOrderDraft.status = 'CANCELLED';
    await conv.save();
    return { success: true, message: 'Draft cleared - all items removed', draft: conv.currentOrderDraft };
  }

  // Recalculate draft with backend service
  const recalcItems = draftItems.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));

  const settings = await StoreSettings.findOne();
  const defaultDeliveryCharge = settings?.deliveryChargeDefault || 30;
  const freeThreshold = settings?.freeDeliveryThreshold || 499;

  const tempCalc = await OrderService.calculateOrderPricing(recalcItems, 0, 0);
  const deliveryFee = tempCalc.subtotal >= freeThreshold ? 0 : defaultDeliveryCharge;
  const finalCalc = await OrderService.calculateOrderPricing(recalcItems, 0, deliveryFee);

  conv.currentOrderDraft.items = finalCalc.verifiedItems.map((i) => ({
    productId: i.product,
    name: i.name,
    unit: i.unit,
    price: i.price,
    quantity: i.quantity,
    discount: i.discount || 0,
    gstRate: i.gstRate || 0,
    gst: i.gst || 0,
    total: i.total,
  }));
  conv.currentOrderDraft.subtotal = finalCalc.subtotal;
  conv.currentOrderDraft.gst = finalCalc.gst;
  conv.currentOrderDraft.deliveryCharge = finalCalc.deliveryCharge;
  conv.currentOrderDraft.totalAmount = finalCalc.totalAmount;
  conv.currentOrderDraft.updatedAt = new Date();

  await conv.save();

  return {
    success: true,
    message: 'Order draft modified successfully',
    draft: conv.currentOrderDraft,
  };
};

/**
 * Confirm draft into a real order: commits stock, creates delivery, and generates invoice
 */
const confirmOrder = async ({ conversationId, customerId, user, paymentMethod, notes }) => {
  const conv = await AIConversation.findById(conversationId);
  if (!conv || !conv.currentOrderDraft || !conv.currentOrderDraft.items?.length) {
    return { success: false, message: 'No valid order draft available to confirm' };
  }

  const draft = conv.currentOrderDraft;

  // Retrieve customer info
  let customer;
  const targetCustId = customerId || conv.customerId;
  if (targetCustId) {
    customer = await Customer.findById(targetCustId);
  } else if (conv.customerPhone) {
    customer = await Customer.findOne({ phone: conv.customerPhone });
  }

  if (!customer && conv.customerPhone) {
    customer = await Customer.create({
      name: conv.customerName || 'Valued Customer',
      phone: conv.customerPhone,
      address: draft.deliveryAddress?.address || '',
      city: draft.deliveryAddress?.city || 'New Delhi',
      pincode: draft.deliveryAddress?.pincode || '',
    });
    conv.customerId = customer._id;
    await conv.save();
  }

  if (!customer) {
    return { success: false, message: 'Customer profile or phone number required before confirming order' };
  }

  const orderPayload = {
    customerId: customer._id,
    customerData: {
      name: customer.name,
      phone: customer.phone,
      address: draft.deliveryAddress?.address || customer.address || '',
      pincode: draft.deliveryAddress?.pincode || customer.pincode || '',
    },
    items: draft.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      discount: i.discount || 0,
    })),
    deliveryCharge: draft.deliveryCharge,
    paymentMethod: paymentMethod || draft.paymentMethod || 'COD',
    orderSource: conv.source || 'WHATSAPP',
    deliveryAddress: draft.deliveryAddress?.address
      ? draft.deliveryAddress
      : {
          address: customer.address || '',
          pincode: customer.pincode || '',
          phone: customer.phone,
        },
    notes: notes || draft.notes || 'Created by AI Store Operator',
    paidAmount: 0,
  };

  // Commit order via core OrderService (validates stock, deducts atomic, generates INV, creates Delivery)
  const createdOrder = await OrderService.createOrder(orderPayload, user);

  // Update conversation draft status
  conv.currentOrderDraft.status = 'CONFIRMED';
  conv.currentOrderDraft.confirmedOrderId = createdOrder._id;
  await conv.save();

  return {
    success: true,
    message: 'Order confirmed successfully',
    order: {
      orderId: createdOrder._id,
      orderNumber: createdOrder.orderNumber,
      invoiceNumber: createdOrder.invoiceNumber,
      totalAmount: createdOrder.totalAmount,
      orderStatus: createdOrder.orderStatus,
      paymentMethod: createdOrder.paymentMethod,
      deliveryAddress: createdOrder.deliveryAddress,
      itemCount: createdOrder.items.length,
    },
  };
};

/**
 * Cancel an order and restore stock automatically
 */
const cancelOrder = async ({ orderNumber, orderId, reason, user }) => {
  let order;
  if (orderId) {
    order = await Order.findById(orderId);
  } else if (orderNumber) {
    order = await Order.findOne({ orderNumber: orderNumber.trim() });
  }

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.orderStatus === 'DELIVERED') {
    return { success: false, message: 'Delivered orders cannot be cancelled via AI. Please request store return.' };
  }

  if (order.orderStatus === 'CANCELLED') {
    return { success: true, message: 'Order is already cancelled' };
  }

  const cancelledOrder = await OrderService.updateOrderStatus(order._id, 'CANCELLED', user);

  return {
    success: true,
    message: `Order #${cancelledOrder.orderNumber} has been cancelled and stock was restored`,
    orderNumber: cancelledOrder.orderNumber,
    orderStatus: cancelledOrder.orderStatus,
  };
};

/**
 * Get real-time status of an order
 */
const getOrderStatus = async ({ orderNumber, orderId }) => {
  let order;
  if (orderId) {
    order = await Order.findById(orderId).populate('customer', 'name phone');
  } else if (orderNumber) {
    order = await Order.findOne({ orderNumber: orderNumber.trim() }).populate('customer', 'name phone');
  }

  if (!order) {
    return { found: false, message: 'Order not found' };
  }

  const Delivery = require('../../models/Delivery');
  const delivery = await Delivery.findOne({ order: order._id }).populate('deliveryPartner', 'name phone');

  return {
    found: true,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt || delivery?.deliveredAt,
    deliveryPartner: delivery?.deliveryPartner
      ? { name: delivery.deliveryPartner.name, phone: delivery.deliveryPartner.phone }
      : null,
    deliveryStatus: delivery?.status || 'PENDING',
  };
};

module.exports = {
  calculateOrder,
  createOrderDraft,
  modifyOrderDraft,
  confirmOrder,
  cancelOrder,
  getOrderStatus,
};
