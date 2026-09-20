const productTools = require('./productTools');
const customerTools = require('./customerTools');
const orderTools = require('./orderTools');
const paymentTools = require('./paymentTools');
const deliveryTools = require('./deliveryTools');
const storeTools = require('./storeTools');

// Tool definitions, handler bindings, and risk classification
const TOOL_DEFINITIONS = {
  // Products & Inventory
  searchProducts: {
    handler: productTools.searchProducts,
    risk: 'LOW',
    description: 'Search products by keyword (rice, oil, milk, biscuits, atta, etc.) or category',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product search term or keyword' },
        category: { type: 'string', description: 'Category ID or name' },
        limit: { type: 'number', description: 'Maximum products to return' },
      },
    },
  },
  getProduct: {
    handler: productTools.getProduct,
    risk: 'LOW',
    description: 'Retrieve detailed information for a specific product by ID or barcode',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'MongoDB ObjectId of the product' },
        barcode: { type: 'string', description: 'Product barcode' },
      },
    },
  },
  checkInventory: {
    handler: productTools.checkInventory,
    risk: 'LOW',
    description: 'Verify current live stock quantity and shortage for a product before adding to order',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ObjectId' },
        quantity: { type: 'number', description: 'Desired purchase quantity' },
      },
      required: ['productId', 'quantity'],
    },
  },
  getLowStockProducts: {
    handler: productTools.getLowStockProducts,
    risk: 'LOW',
    description: 'List products currently below their minimum threshold or out of stock',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max items to return' },
      },
    },
  },

  // Customer Management
  findCustomer: {
    handler: customerTools.findCustomer,
    risk: 'LOW',
    description: 'Find existing customer record by phone number or name',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer 10-digit mobile number' },
        name: { type: 'string', description: 'Customer full or partial name' },
        query: { type: 'string', description: 'Search term' },
      },
    },
  },
  createCustomer: {
    handler: customerTools.createCustomer,
    risk: 'MEDIUM',
    description: 'Create a new customer profile if they do not already exist in the database',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer name' },
        phone: { type: 'string', description: 'Customer phone number' },
        address: { type: 'string', description: 'Customer delivery address' },
        city: { type: 'string', description: 'City name' },
        pincode: { type: 'string', description: 'Pin code' },
        email: { type: 'string', description: 'Email address' },
      },
      required: ['phone'],
    },
  },
  getCustomerOrders: {
    handler: customerTools.getCustomerOrders,
    risk: 'LOW',
    description: 'Retrieve order history for a customer',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ObjectId' },
        phone: { type: 'string', description: 'Customer phone' },
        limit: { type: 'number', description: 'Max orders to return' },
      },
    },
  },
  getLastOrder: {
    handler: customerTools.getLastOrder,
    risk: 'LOW',
    description: 'Fetch customer last completed order for repeat order requests ("pichli baar wala bhej do")',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ObjectId' },
        phone: { type: 'string', description: 'Customer phone number' },
      },
    },
  },

  // Orders & Drafts
  calculateOrder: {
    handler: orderTools.calculateOrder,
    risk: 'LOW',
    description: 'Calculate item pricing, GST, delivery charge, and grand total using backend rules',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['productId', 'quantity'],
          },
        },
        discount: { type: 'number' },
        deliveryCharge: { type: 'number' },
      },
      required: ['items'],
    },
  },
  createOrderDraft: {
    handler: orderTools.createOrderDraft,
    risk: 'MEDIUM',
    description: 'Prepare an uncommitted order draft with verified prices and stock for user confirmation',
    parameters: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'Current conversation session ID' },
        customerId: { type: 'string', description: 'Customer ObjectId' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['productId', 'quantity'],
          },
        },
        deliveryAddress: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            city: { type: 'string' },
            pincode: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        paymentMethod: { type: 'string', enum: ['CASH', 'UPI', 'CARD', 'COD', 'ONLINE'] },
        notes: { type: 'string' },
      },
      required: ['items'],
    },
  },
  modifyOrderDraft: {
    handler: orderTools.modifyOrderDraft,
    risk: 'MEDIUM',
    description: 'Update the existing active order draft by removing items or changing quantities',
    parameters: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'Conversation session ID' },
        addItems: { type: 'array' },
        removeProductNames: { type: 'array', items: { type: 'string' } },
        updateQuantities: { type: 'array' },
      },
      required: ['conversationId'],
    },
  },
  confirmOrder: {
    handler: orderTools.confirmOrder,
    risk: 'HIGH',
    description: 'Commit order draft into real database order, deduct inventory, and initiate delivery dispatch',
    parameters: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'Conversation ID containing the draft' },
        customerId: { type: 'string' },
        paymentMethod: { type: 'string', enum: ['CASH', 'UPI', 'CARD', 'COD', 'ONLINE'] },
        notes: { type: 'string' },
      },
      required: ['conversationId'],
    },
  },
  cancelOrder: {
    handler: orderTools.cancelOrder,
    risk: 'HIGH',
    description: 'Cancel an order and restore deducted inventory back to database',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string', description: 'Order number e.g. ORD-2026-000001' },
        orderId: { type: 'string', description: 'Order ObjectId' },
        reason: { type: 'string', description: 'Reason for cancellation' },
      },
    },
  },
  getOrderStatus: {
    handler: orderTools.getOrderStatus,
    risk: 'LOW',
    description: 'Check status, delivery partner assignment, and live timeline of an existing order',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string', description: 'Order number' },
        orderId: { type: 'string', description: 'Order ObjectId' },
      },
    },
  },

  // Payments
  getPaymentStatus: {
    handler: paymentTools.getPaymentStatus,
    risk: 'LOW',
    description: 'Retrieve verified payment records and outstanding balance for an order',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        orderId: { type: 'string' },
      },
    },
  },
  recordPayment: {
    handler: paymentTools.recordPayment,
    risk: 'HIGH',
    description: 'Record a payment transaction against an order',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        orderId: { type: 'string' },
        paidAmount: { type: 'number' },
        paymentMethod: { type: 'string', enum: ['CASH', 'UPI', 'CARD', 'ONLINE'] },
        transactionId: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['paidAmount'],
    },
  },

  // Delivery
  getDeliveryStatus: {
    handler: deliveryTools.getDeliveryStatus,
    risk: 'LOW',
    description: 'Get delivery tracking and rider contact details',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        orderId: { type: 'string' },
      },
    },
  },
  assignDeliveryPartner: {
    handler: deliveryTools.assignDeliveryPartner,
    risk: 'HIGH',
    description: 'Assign a delivery rider to dispatch an order',
    parameters: {
      type: 'object',
      properties: {
        deliveryId: { type: 'string' },
        orderNumber: { type: 'string' },
        deliveryPartnerId: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  },

  // Store Analytics & Invoices
  getStoreSettings: {
    handler: storeTools.getStoreSettings,
    risk: 'LOW',
    description: 'Get store operating hours, free delivery threshold, address, and contact info',
    parameters: { type: 'object', properties: {} },
  },
  getSalesMetrics: {
    handler: storeTools.getSalesMetrics,
    risk: 'LOW',
    description: 'Get today sales figures, revenue collected, and order counts for the owner',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['TODAY', 'WEEK', 'MONTH'], default: 'TODAY' },
      },
    },
  },
  generateInvoice: {
    handler: storeTools.generateInvoice,
    risk: 'LOW',
    description: 'Generate tax invoice details and pre-formatted WhatsApp share link',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        orderId: { type: 'string' },
      },
    },
  },
  adjustProductStock: {
    handler: storeTools.adjustProductStock,
    risk: 'HIGH',
    description: 'Manually adjust stock quantity for a product (Store owner command only)',
    parameters: {
      type: 'object',
      properties: {
        productName: { type: 'string' },
        productId: { type: 'string' },
        quantity: { type: 'number' },
        type: { type: 'string', enum: ['STOCK_IN', 'MANUAL_ADJUSTMENT', 'RETURN'] },
        reason: { type: 'string' },
      },
      required: ['quantity'],
    },
  },
};

/**
 * Executes a tool by name with arguments and context
 */
const executeTool = async (toolName, args = {}, context = {}) => {
  const tool = TOOL_DEFINITIONS[toolName];
  if (!tool) {
    throw new Error(`Tool "${toolName}" is not registered in AI Tool Registry`);
  }

  // Inject contextual user/conversation if not provided
  const enrichedArgs = {
    ...args,
    user: context.user || args.user,
    conversationId: args.conversationId || context.conversationId,
  };

  const result = await tool.handler(enrichedArgs);
  return {
    tool: toolName,
    risk: tool.risk,
    result,
  };
};

/**
 * Formats tool definitions for LLM function calling schemas
 */
const getToolDeclarations = () => {
  return Object.entries(TOOL_DEFINITIONS).map(([name, def]) => ({
    name,
    description: def.description,
    parameters: def.parameters,
  }));
};

module.exports = {
  TOOL_DEFINITIONS,
  executeTool,
  getToolDeclarations,
};
