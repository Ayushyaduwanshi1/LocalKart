const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products with filters, search, pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      stockStatus,
      brand,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 50,
      activeOnly,
    } = req.query;

    const query = {};

    if (activeOnly !== 'false') {
      query.isActive = true;
    }

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
      ];
    }

    if (stockStatus === 'out_of_stock') {
      query.stockQuantity = { $lte: 0 };
    } else if (stockStatus === 'low_stock') {
      query.$expr = {
        $and: [
          { $gt: ['$stockQuantity', 0] },
          { $lte: ['$stockQuantity', '$minimumStockLevel'] },
        ],
      };
    } else if (stockStatus === 'in_stock') {
      query.stockQuantity = { $gt: 0 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: products,
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

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug icon');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lookup product by barcode or SKU (for fast POS scanner)
// @route   GET /api/products/lookup/:code
// @access  Private (Staff/Admin)
const lookupProduct = async (req, res, next) => {
  try {
    const code = req.params.code.trim();
    const product = await Product.findOne({
      $or: [
        { barcode: code },
        { sku: code.toUpperCase() },
      ],
      isActive: true,
    }).populate('category', 'name slug icon');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No active product found with barcode or SKU '${code}'`,
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin/Staff)
const createProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };
    if (productData.sku) {
      productData.sku = productData.sku.toUpperCase().trim();
    }

    const product = await Product.create(productData);
    const populated = await Product.findById(product._id).populate('category', 'name slug icon');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin/Staff)
const updateProduct = async (req, res, next) => {
  try {
    if (req.body.sku) {
      req.body.sku = req.body.sku.toUpperCase().trim();
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug icon');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (soft delete or hard delete)
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Soft-delete to preserve order and inventory history integrity
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin/Staff)
const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  lookupProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
};
