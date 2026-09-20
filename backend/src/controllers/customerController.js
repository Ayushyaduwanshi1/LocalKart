const Customer = require('../models/Customer');
const Order = require('../models/Order');

// @desc    Get all customers with search & pagination
// @route   GET /api/customers
// @access  Private (Admin/Staff)
const getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50, sortBy = 'totalSpending', order = 'desc' } = req.query;
    const query = {};

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Customer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: customers,
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

// @desc    Lookup customer by phone number (for Phone / WhatsApp / POS order creation)
// @route   GET /api/customers/lookup/:phone
// @access  Private (Admin/Staff)
const lookupCustomerByPhone = async (req, res, next) => {
  try {
    const phone = req.params.phone.replace(/[^0-9+]/g, '');
    const customer = await Customer.findOne({
      phone: { $regex: phone.slice(-10), $options: 'i' },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `No customer found with phone ${phone}`,
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer by ID with full order history
// @route   GET /api/customers/:id
// @access  Private (Admin/Staff)
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const orders = await Order.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        ...customer.toObject(),
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer (or return existing if phone exists)
// @route   POST /api/customers
// @access  Private (Admin/Staff)
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, city, pincode, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone number are required',
      });
    }

    const cleanPhone = phone.trim();
    let customer = await Customer.findOne({ phone: cleanPhone });

    if (customer) {
      // Update any updated address or details
      if (address) customer.address = address;
      if (city) customer.city = city;
      if (pincode) customer.pincode = pincode;
      if (email && !customer.email) customer.email = email;
      await customer.save();

      return res.status(200).json({
        success: true,
        message: 'Existing customer found and updated',
        data: customer,
      });
    }

    customer = await Customer.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : '',
      address: address || '',
      city: city || '',
      pincode: pincode || '',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (Admin/Staff)
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin)
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  lookupCustomerByPhone,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
