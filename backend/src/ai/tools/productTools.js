const Product = require('../../models/Product');

/**
 * Search products with fuzzy and multi-attribute matching
 */
const searchProducts = async ({ query, category, limit = 10 }) => {
  const filter = { isActive: true };

  if (category) {
    filter.category = category;
  }

  if (query && query.trim()) {
    const rawTokens = query.trim().split(/\s+/).filter(Boolean);
    if (rawTokens.length > 1) {
      // Multi-word search (e.g. "fortune oil", "basmati rice"): each word must match name, brand, or desc
      filter.$and = rawTokens.map((t) => {
        const isShort = t.length <= 4;
        const pat = isShort ? `\\b${t}\\b` : t;
        return {
          $or: [
            { name: { $regex: pat, $options: 'i' } },
            { brand: { $regex: pat, $options: 'i' } },
            { description: { $regex: pat, $options: 'i' } },
          ],
        };
      });
    } else {
      const q = query.trim();
      const isShortWord = q.length <= 4;
      const queryPattern = isShortWord ? `\\b${q}\\b` : q;
      filter.$or = [
        { name: { $regex: queryPattern, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { description: { $regex: queryPattern, $options: 'i' } },
      ];
    }
  }

  const products = await Product.find(filter)
    .populate('category', 'name')
    .limit(limit)
    .sort({ stockQuantity: -1 });

  return products.map((p) => ({
    productId: p._id,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    sellingPrice: p.sellingPrice,
    mrp: p.mrp,
    stockQuantity: p.stockQuantity,
    gst: p.gst,
    category: p.category?.name || '',
    inStock: p.stockQuantity > 0,
  }));
};

/**
 * Get product details by ID or barcode
 */
const getProduct = async ({ productId, barcode }) => {
  let product;
  if (productId) {
    product = await Product.findById(productId).populate('category', 'name');
  } else if (barcode) {
    product = await Product.findOne({ barcode }).populate('category', 'name');
  }

  if (!product) {
    return { found: false, message: 'Product not found' };
  }

  return {
    found: true,
    product: {
      productId: product._id,
      name: product.name,
      brand: product.brand,
      unit: product.unit,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      stockQuantity: product.stockQuantity,
      gst: product.gst,
      category: product.category?.name || '',
      inStock: product.stockQuantity > 0,
    },
  };
};

/**
 * Check stock availability for an item
 */
const checkInventory = async ({ productId, quantity }) => {
  const product = await Product.findById(productId);
  if (!product) {
    return { available: false, message: 'Product not found' };
  }

  const requested = Number(quantity) || 1;
  const isAvailable = product.stockQuantity >= requested;

  return {
    productId: product._id,
    productName: product.name,
    requestedQuantity: requested,
    availableStock: product.stockQuantity,
    unit: product.unit,
    isAvailable,
    shortage: isAvailable ? 0 : requested - product.stockQuantity,
    pricePerUnit: product.sellingPrice,
  };
};

/**
 * Get low stock or out of stock items for owner insight
 */
const getLowStockProducts = async ({ limit = 10 }) => {
  const products = await Product.find({
    isActive: true,
    $expr: { $lte: ['$stockQuantity', '$minimumStockLevel'] },
  })
    .limit(limit)
    .sort({ stockQuantity: 1 });

  return products.map((p) => ({
    productId: p._id,
    name: p.name,
    stockQuantity: p.stockQuantity,
    minimumStockLevel: p.minimumStockLevel,
    unit: p.unit,
    sellingPrice: p.sellingPrice,
  }));
};

module.exports = {
  searchProducts,
  getProduct,
  checkInventory,
  getLowStockProducts,
};
