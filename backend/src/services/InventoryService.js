const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const NotificationService = require('./NotificationService');
const { emitInventoryUpdated } = require('../sockets/socketHandler');

class InventoryService {
  // Check available stock
  static async checkProductStock(productId, requestedQty) {
    const product = await Product.findById(productId);
    if (!product) {
      throw { statusCode: 404, message: `Product not found` };
    }
    if (!product.isActive) {
      throw { statusCode: 400, message: `Product "${product.name}" is no longer active` };
    }
    if (product.stockQuantity < requestedQty) {
      throw {
        statusCode: 400,
        message: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} ${product.unit} available.`,
        availableStock: product.stockQuantity,
      };
    }
    return product;
  }

  // Atomic stock decrement for order confirmation
  static async deductOrderStock(order, user) {
    if (order.stockDeducted) {
      console.log(`[InventoryService] Stock already deducted for order ${order.orderNumber}. Skipping.`);
      return;
    }

    const deductedProducts = [];

    try {
      for (const item of order.items) {
        // Atomic decrement: only update if stockQuantity >= item.quantity
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true }
        );

        if (!updatedProduct) {
          // Re-fetch current available quantity for friendly error
          const currentProd = await Product.findById(item.product);
          const avail = currentProd ? currentProd.stockQuantity : 0;
          throw {
            statusCode: 400,
            message: `Insufficient stock for "${item.name}". Only ${avail} ${item.unit || 'units'} available.`,
            availableStock: avail,
          };
        }

        const prevStock = updatedProduct.stockQuantity + item.quantity;
        deductedProducts.push({ product: updatedProduct, quantity: item.quantity });

        // Record Inventory Transaction
        const transaction = await InventoryTransaction.create({
          product: updatedProduct._id,
          order: order._id,
          type: 'SALE',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: updatedProduct.stockQuantity,
          reason: `Order #${order.orderNumber} confirmed (${order.orderSource})`,
          createdBy: user?._id,
        });

        // Trigger stock alert if necessary
        if (updatedProduct.stockQuantity <= 0) {
          await NotificationService.notifyStockAlert(updatedProduct, 'OUT_OF_STOCK');
        } else if (updatedProduct.stockQuantity <= updatedProduct.minimumStockLevel) {
          await NotificationService.notifyStockAlert(updatedProduct, 'LOW_STOCK');
        }

        emitInventoryUpdated({
          productId: updatedProduct._id,
          name: updatedProduct.name,
          stockQuantity: updatedProduct.stockQuantity,
          transaction,
        });
      }

      order.stockDeducted = true;
      await order.save();
    } catch (error) {
      // Rollback any successfully deducted products if subsequent product failed
      for (const { product, quantity } of deductedProducts) {
        await Product.findByIdAndUpdate(product._id, { $inc: { stockQuantity: quantity } });
      }
      throw error;
    }
  }

  // Restore inventory if an order is cancelled
  static async restoreOrderStock(order, user) {
    if (!order.stockDeducted) {
      console.log(`[InventoryService] Stock was never deducted for order ${order.orderNumber}. No restoration needed.`);
      return;
    }

    if (order.inventoryRestored) {
      console.log(`[InventoryService] Stock already restored for order ${order.orderNumber}. Skipping duplicate.`);
      return;
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const prevStock = product.stockQuantity;
        const updated = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: item.quantity } },
          { new: true }
        );

        const transaction = await InventoryTransaction.create({
          product: updated._id,
          order: order._id,
          type: 'ORDER_CANCELLED',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: updated.stockQuantity,
          reason: `Order #${order.orderNumber} cancelled - stock restored`,
          createdBy: user?._id,
        });

        emitInventoryUpdated({
          productId: updated._id,
          name: updated.name,
          stockQuantity: updated.stockQuantity,
          transaction,
        });
      }
    }

    order.inventoryRestored = true;
    await order.save();
  }

  // Manual stock adjustment (IN, OUT, ADJUSTMENT)
  static async adjustStock(productId, type, quantity, reason, user) {
    const product = await Product.findById(productId);
    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    const prevStock = product.stockQuantity;
    let newStock = prevStock;
    const numQty = Number(quantity);

    if (type === 'STOCK_IN' || type === 'IN') {
      newStock = prevStock + numQty;
    } else if (type === 'RETURN') {
      newStock = prevStock + numQty;
    } else if (type === 'OUT' || type === 'MANUAL_ADJUSTMENT_OUT') {
      if (prevStock < numQty) {
        throw { statusCode: 400, message: `Cannot remove ${numQty}. Current stock is only ${prevStock}` };
      }
      newStock = prevStock - numQty;
    } else if (type === 'ADJUSTMENT' || type === 'MANUAL_ADJUSTMENT') {
      newStock = numQty;
    }

    product.stockQuantity = newStock;
    await product.save();

    const txType = ['STOCK_IN', 'SALE', 'ORDER_CANCELLED', 'RETURN', 'MANUAL_ADJUSTMENT'].includes(type)
      ? type
      : (type === 'IN' ? 'STOCK_IN' : (type === 'OUT' ? 'MANUAL_ADJUSTMENT' : 'MANUAL_ADJUSTMENT'));

    const transaction = await InventoryTransaction.create({
      product: product._id,
      type: txType,
      quantity: Math.abs(newStock - prevStock),
      previousStock: prevStock,
      newStock,
      reason: reason || `Manual adjustment (${txType})`,
      createdBy: user?._id,
    });

    if (newStock <= 0) {
      await NotificationService.notifyStockAlert(product, 'OUT_OF_STOCK');
    } else if (newStock <= product.minimumStockLevel) {
      await NotificationService.notifyStockAlert(product, 'LOW_STOCK');
    }

    emitInventoryUpdated({
      productId: product._id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      transaction,
    });

    return { product, transaction };
  }
}

module.exports = InventoryService;
