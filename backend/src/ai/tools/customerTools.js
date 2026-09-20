const Customer = require('../../models/Customer');
const Order = require('../../models/Order');

/**
 * Find customer by phone or search string
 */
const findCustomer = async ({ phone, name, query }) => {
  const filter = {};
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    filter.phone = { $regex: cleanPhone, $options: 'i' };
  } else if (name) {
    filter.name = { $regex: name, $options: 'i' };
  } else if (query) {
    filter.$or = [
      { name: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
    ];
  }

  const customer = await Customer.findOne(filter);
  if (!customer) {
    return { found: false, message: 'Customer not found' };
  }

  return {
    found: true,
    customer: {
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      pincode: customer.pincode,
      totalOrders: customer.totalOrders || 0,
      totalSpent: customer.totalSpent || 0,
    },
  };
};

/**
 * Create a new customer profile
 */
const createCustomer = async ({ name, phone, address, city = 'New Delhi', pincode, email }) => {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    return { success: false, message: 'Valid phone number required' };
  }

  let customer = await Customer.findOne({ phone: cleanPhone });
  if (customer) {
    return {
      success: true,
      alreadyExisted: true,
      customer: {
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        pincode: customer.pincode,
      },
    };
  }

  customer = await Customer.create({
    name: name || 'Valued Customer',
    phone: cleanPhone,
    address: address || '',
    city,
    pincode: pincode || '',
    email: email || '',
  });

  return {
    success: true,
    customer: {
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      pincode: customer.pincode,
    },
  };
};

/**
 * Get customer orders history
 */
const getCustomerOrders = async ({ customerId, phone, limit = 5 }) => {
  let custId = customerId;
  if (!custId && phone) {
    const cust = await Customer.findOne({ phone: phone.replace(/[^0-9]/g, '') });
    if (cust) custId = cust._id;
  }

  if (!custId) {
    return { success: false, message: 'Customer ID or phone required' };
  }

  const orders = await Order.find({ customer: custId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('items.product', 'name unit');

  return {
    success: true,
    orders: orders.map((o) => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount,
      itemCount: o.items.length,
      createdAt: o.createdAt,
      itemsSummary: o.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', '),
    })),
  };
};

/**
 * Get customer's last order for repeat order requests
 */
const getLastOrder = async ({ customerId, phone }) => {
  let custId = customerId;
  if (!custId && phone) {
    const cust = await Customer.findOne({ phone: phone.replace(/[^0-9]/g, '') });
    if (cust) custId = cust._id;
  }

  if (!custId) {
    return { found: false, message: 'Customer not found' };
  }

  const lastOrder = await Order.findOne({ customer: custId })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name sellingPrice stockQuantity unit gst');

  if (!lastOrder) {
    return { found: false, message: 'No prior orders found for this customer' };
  }

  return {
    found: true,
    order: {
      orderId: lastOrder._id,
      orderNumber: lastOrder.orderNumber,
      totalAmount: lastOrder.totalAmount,
      deliveryAddress: lastOrder.deliveryAddress,
      paymentMethod: lastOrder.paymentMethod,
      items: lastOrder.items.map((i) => ({
        productId: i.product?._id || i.product,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        currentPrice: i.product?.sellingPrice || i.price,
        currentStock: i.product?.stockQuantity || 0,
        inStock: (i.product?.stockQuantity || 0) >= i.quantity,
      })),
      createdAt: lastOrder.createdAt,
    },
  };
};

module.exports = {
  findCustomer,
  createCustomer,
  getCustomerOrders,
  getLastOrder,
};
