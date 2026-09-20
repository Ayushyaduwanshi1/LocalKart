const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const { emitInventoryUpdated, emitNotification } = require('../sockets/socketHandler');

// @desc    Get inventory summary & list of products with stock metrics
// @route   GET /api/inventory
// @access  Private (Admin/Staff)
const getInventory = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [{ name: searchRegex }, { sku: searchRegex }, { barcode: searchRegex }];
    }

    if (status === 'out_of_stock') {
      query.stockQuantity = { $lte: 0 };
    } else if (status === 'low_stock') {
      query.$expr = {
        $and: [
          { $gt: ['$stockQuantity', 0] },
          { $lte: ['$stockQuantity', '$minimumStockLevel'] },
        ],
      };
    } else if (status === 'in_stock') {
      query.stockQuantity = { $gt: 0 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [products, total, totalStockValue, lowStockCount, outOfStockCount] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort({ stockQuantity: 1 })
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalValuation: { $sum: { $multiply: ['$stockQuantity', '$purchasePrice'] } },
            totalRetailValue: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
            totalItems: { $sum: '$stockQuantity' },
          },
        },
      ]),
      Product.countDocuments({
        isActive: true,
        $expr: {
          $and: [
            { $gt: ['$stockQuantity', 0] },
            { $lte: ['$stockQuantity', '$minimumStockLevel'] },
          ],
        },
      }),
      Product.countDocuments({ isActive: true, stockQuantity: { $lte: 0 } }),
    ]);

    res.status(200).json({
      success: true,
      data: products,
      metrics: {
        totalItems: totalStockValue[0]?.totalItems || 0,
        totalValuation: totalStockValue[0]?.totalValuation || 0,
        totalRetailValue: totalStockValue[0]?.totalRetailValue || 0,
        lowStockCount,
        outOfStockCount,
      },
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

// @desc    Adjust product stock (IN / OUT / ADJUSTMENT)
// @route   POST /api/inventory/adjust
// @access  Private (Admin/Staff)
const adjustStock = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, adjustment type (IN/OUT/ADJUSTMENT), and quantity are required',
      });
    }

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const previousStock = product.stockQuantity;
    let newStock = previousStock;

    if (type === 'IN') {
      newStock = previousStock + numQuantity;
    } else if (type === 'OUT') {
      if (previousStock < numQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Current stock is ${previousStock}, cannot remove ${numQuantity}.`,
        });
      }
      newStock = previousStock - numQuantity;
    } else if (type === 'ADJUSTMENT') {
      // Direct count override
      newStock = numQuantity;
    } else {
      return res.status(400).json({
        success: false,
        message: "Type must be 'IN', 'OUT', or 'ADJUSTMENT'",
      });
    }

    product.stockQuantity = newStock;
    await product.save();

    // Create audit record
    const transaction = await InventoryTransaction.create({
      product: product._id,
      type,
      quantity: type === 'ADJUSTMENT' ? Math.abs(newStock - previousStock) : numQuantity,
      previousStock,
      newStock,
      reason: reason || `Manual stock adjustment (${type})`,
      createdBy: req.user?._id,
    });

    // Check for stock alerts
    if (newStock <= 0) {
      const notif = await Notification.create({
        title: 'Out of Stock Alert',
        message: `Product "${product.name}" is now OUT OF STOCK!`,
        type: 'OUT_OF_STOCK',
        link: '/inventory',
        metadata: { productId: product._id, stock: newStock },
      });
      emitNotification(notif);
    } else if (newStock <= product.minimumStockLevel) {
      const notif = await Notification.create({
        title: 'Low Stock Alert',
        message: `Product "${product.name}" is running low (${newStock} ${product.unit} remaining).`,
        type: 'LOW_STOCK',
        link: '/inventory',
        metadata: { productId: product._id, stock: newStock },
      });
      emitNotification(notif);
    }

    // Real-time socket broadcast
    emitInventoryUpdated({
      productId: product._id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      transaction,
    });

    res.status(200).json({
      success: true,
      message: `Stock updated successfully from ${previousStock} to ${newStock}`,
      data: {
        product,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory audit transactions history
// @route   GET /api/inventory/history
// @access  Private (Admin/Staff)
const getInventoryHistory = async (req, res, next) => {
  try {
    const { productId, type, page = 1, limit = 50 } = req.query;
    const query = {};

    if (productId) {
      query.product = productId;
    }

    if (type) {
      query.type = type;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('product', 'name sku barcode unit')
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      InventoryTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
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

module.exports = {
  getInventory,
  adjustStock,
  getInventoryHistory,
};
