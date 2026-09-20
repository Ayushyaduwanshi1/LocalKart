const AIProvider = require('./AIProvider');
const NLUParser = require('../services/NLUParser');
const { executeTool } = require('../tools/toolRegistry');
const Product = require('../../models/Product');

class RuleEngineProvider extends AIProvider {
  constructor() {
    super('RuleEngineProvider');
  }

  async processRequest({ message, conversation, user, history = [] }) {
    const rawText = (message || '').trim();
    const intent = NLUParser.detectIntent(rawText);
    const toolExecutions = [];

    // 1. INTENT: CONFIRM_ORDER
    if (intent === 'CONFIRM_ORDER') {
      if (!conversation.currentOrderDraft || !conversation.currentOrderDraft.items?.length) {
        return {
          response: 'Koi active order draft nahi mila. Aap kya mangwana chahte hain? (e.g. "2 kg rice aur 1 oil bhej do")',
          intent,
          toolCalls: [],
          orderDraft: null,
        };
      }

      const confirmRes = await executeTool('confirmOrder', {
        conversationId: conversation._id,
        customerId: conversation.customerId,
        user,
      }, { user, conversationId: conversation._id });

      toolExecutions.push({
        tool: 'confirmOrder',
        input: { conversationId: conversation._id },
        output: confirmRes.result,
        status: confirmRes.result?.success ? 'SUCCESS' : 'FAILED',
      });

      if (!confirmRes.result?.success) {
        return {
          response: `Order confirm nahi ho paya: ${confirmRes.result?.message || 'Kripya dubara koshish karein.'}`,
          intent,
          toolCalls: toolExecutions,
          orderDraft: conversation.currentOrderDraft,
        };
      }

      const order = confirmRes.result.order;
      const orderNum = order.orderNumber;
      const invoiceNum = order.invoiceNumber ? `\nInvoice: ${order.invoiceNumber}` : '';

      return {
        response: `Order confirmed ✅\n\nOrder ID: ${orderNum}${invoiceNum}\nTotal: ₹${order.totalAmount.toFixed(2)}\nPayment: ${order.paymentMethod}\n\nDelivery status: Preparing for dispatch. Thank you for shopping with us!`,
        intent,
        toolCalls: toolExecutions,
        orderDraft: { ...conversation.currentOrderDraft, status: 'CONFIRMED' },
        confirmedOrder: order,
      };
    }

    // 2. INTENT: REJECT_ACTION / CANCEL_DRAFT
    if (intent === 'REJECT_ACTION') {
      if (conversation.currentOrderDraft?.status === 'DRAFT') {
        conversation.currentOrderDraft.status = 'CANCELLED';
        await conversation.save();
        return {
          response: 'Order draft cancel kar diya gaya hai. Kuch aur chahiye toh bataiye!',
          intent,
          toolCalls: [],
          orderDraft: conversation.currentOrderDraft,
        };
      }
      return {
        response: 'Theek hai, action cancel kar diya gaya hai. Main aapki aur kya madad kar sakta hu?',
        intent,
        toolCalls: [],
        orderDraft: null,
      };
    }

    // 3. INTENT: REORDER_PREVIOUS_ORDER ("last order repeat kar do")
    if (intent === 'REORDER_PREVIOUS_ORDER') {
      const lastOrderTool = await executeTool('getLastOrder', {
        customerId: conversation.customerId,
        phone: conversation.customerPhone,
      }, { user, conversationId: conversation._id });

      toolExecutions.push({
        tool: 'getLastOrder',
        input: { customerId: conversation.customerId },
        output: lastOrderTool.result,
        status: lastOrderTool.result?.found ? 'SUCCESS' : 'FAILED',
      });

      if (!lastOrderTool.result?.found) {
        return {
          response: 'Aapka koi purana order record nahi mila. Kripya naye items list bataiye!',
          intent,
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }

      const pastOrder = lastOrderTool.result.order;
      const draftItems = [];
      const stockIssues = [];

      for (const item of pastOrder.items) {
        if (!item.inStock) {
          stockIssues.push(`${item.name} (available: ${item.currentStock})`);
        } else {
          draftItems.push({
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }

      if (draftItems.length === 0) {
        return {
          response: `Pichle order ke items abhi stock mein nahi hain: ${stockIssues.join(', ')}.`,
          intent,
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }

      const draftRes = await executeTool('createOrderDraft', {
        conversationId: conversation._id,
        customerId: conversation.customerId,
        items: draftItems,
        deliveryAddress: pastOrder.deliveryAddress,
      }, { user, conversationId: conversation._id });

      toolExecutions.push({
        tool: 'createOrderDraft',
        input: { items: draftItems },
        output: draftRes.result,
        status: draftRes.result?.success ? 'SUCCESS' : 'FAILED',
      });

      const draft = draftRes.result.draft;
      const lines = draft.items.map((i) => `• ${i.name} – ${i.quantity} ${i.unit}: ₹${i.total.toFixed(2)}`);

      let responseText = `Pichle order ke hisaab se naya order ready hai:\n\n${lines.join('\n')}\n\nSubtotal: ₹${draft.subtotal.toFixed(2)}\nDelivery: ₹${draft.deliveryCharge.toFixed(2)}\nTotal: ₹${draft.totalAmount.toFixed(2)}\n\nConfirm karu?`;
      if (stockIssues.length > 0) {
        responseText = `⚠️ Kuch items stock mein nahi the aur chhod diye gaye: ${stockIssues.join(', ')}.\n\n` + responseText;
      }

      return {
        response: responseText,
        intent,
        toolCalls: toolExecutions,
        orderDraft: draft,
      };
    }

    // 4. INTENT: MODIFY_ORDER ("oil hata do aur 2 biscuit add kar do")
    if (intent === 'MODIFY_ORDER') {
      const removeNames = [];
      const addItems = [];

      // Split into clauses by 'aur', 'and', ',', '+'
      const clauses = rawText.split(/(?:,|\baur\b|\band\b|\bplus\b|\+)/i);
      for (const clause of clauses) {
        const cl = clause.trim();
        if (/hata do|remove|hatao|delete/i.test(cl)) {
          const remName = cl.replace(/hata do|remove|hatao|delete/gi, '').trim();
          if (remName) removeNames.push(remName);
        } else if (/add kar|daal do|bhi de do|aur do|bhi chahiye|biscuit|chawal|rice|milk|oil/i.test(cl) || /\d+/.test(cl)) {
          const parsed = NLUParser.extractOrderItems(cl);
          for (const item of parsed) {
            const prodSearch = await executeTool('searchProducts', { query: item.rawName, limit: 1 });
            if (prodSearch.result?.length > 0) {
              addItems.push({
                productId: prodSearch.result[0].productId,
                name: prodSearch.result[0].name,
                quantity: item.quantity,
              });
            }
          }
        }
      }

      const modRes = await executeTool('modifyOrderDraft', {
        conversationId: conversation._id,
        removeProductNames: removeNames,
        addItems,
      }, { user, conversationId: conversation._id });

      toolExecutions.push({
        tool: 'modifyOrderDraft',
        input: { removeProductNames: removeNames, addItems },
        output: modRes.result,
        status: modRes.result?.success ? 'SUCCESS' : 'FAILED',
      });

      const updatedDraft = modRes.result.draft;
      if (!updatedDraft || !updatedDraft.items?.length) {
        return {
          response: 'Sabhi items draft se hata diye gaye hain. Draft ab khali hai.',
          intent,
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }

      const lines = updatedDraft.items.map((i) => `• ${i.name} – ${i.quantity} ${i.unit}: ₹${i.total.toFixed(2)}`);
      return {
        response: `Order update ho gaya hai:\n\n${lines.join('\n')}\n\nSubtotal: ₹${updatedDraft.subtotal.toFixed(2)}\nDelivery: ₹${updatedDraft.deliveryCharge.toFixed(2)}\nTotal: ₹${updatedDraft.totalAmount.toFixed(2)}\n\nConfirm kar du?`,
        intent,
        toolCalls: toolExecutions,
        orderDraft: updatedDraft,
      };
    }

    // 5. INTENT: GET_ORDER_STATUS ("mera order kaha tak pahucha?")
    if (intent === 'GET_ORDER_STATUS') {
      // Find order number in text or look up customer's latest order
      const orderNumMatch = rawText.match(/ORD-\d{4}-\d+/i);
      const statusRes = await executeTool('getOrderStatus', {
        orderNumber: orderNumMatch ? orderNumMatch[0].toUpperCase() : undefined,
      }, { user, conversationId: conversation._id });

      let orderStatusResult = statusRes.result;
      if (!orderStatusResult.found && conversation.currentOrderDraft?.confirmedOrderId) {
        const detailRes = await executeTool('getOrderStatus', { orderId: conversation.currentOrderDraft.confirmedOrderId });
        orderStatusResult = detailRes.result;
      }
      if (!orderStatusResult.found && conversation.customerId) {
        const lastOrderRes = await executeTool('getLastOrder', { customerId: conversation.customerId });
        if (lastOrderRes.result?.found) {
          const detailRes = await executeTool('getOrderStatus', { orderId: lastOrderRes.result.order.orderId });
          orderStatusResult = detailRes.result;
        }
      }
      if (!orderStatusResult.found && conversation.customerPhone) {
        const Customer = require('../../models/Customer');
        const cust = await Customer.findOne({ phone: conversation.customerPhone });
        if (cust) {
          const lastOrderRes = await executeTool('getLastOrder', { customerId: cust._id });
          if (lastOrderRes.result?.found) {
            const detailRes = await executeTool('getOrderStatus', { orderId: lastOrderRes.result.order.orderId });
            orderStatusResult = detailRes.result;
          }
        }
      }

      toolExecutions.push({
        tool: 'getOrderStatus',
        input: { orderNumber: orderNumMatch ? orderNumMatch[0] : 'LATEST' },
        output: orderStatusResult,
        status: orderStatusResult.found ? 'SUCCESS' : 'FAILED',
      });

      if (!orderStatusResult.found) {
        return {
          response: 'Kripya apna Order Number bataiye (e.g. ORD-2026-000001) taaki main status check kar saku.',
          intent,
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }

      let deliveryMsg = `Delivery Status: ${orderStatusResult.deliveryStatus}`;
      if (orderStatusResult.deliveryPartner) {
        deliveryMsg += ` (Rider: ${orderStatusResult.deliveryPartner.name}, Phone: ${orderStatusResult.deliveryPartner.phone})`;
      }

      return {
        response: `Order #${orderStatusResult.orderNumber} ka current status:\n\n• Order Status: ${orderStatusResult.orderStatus}\n• ${deliveryMsg}\n• Payment: ${orderStatusResult.paymentStatus} (${orderStatusResult.paymentMethod})\n• Total: ₹${orderStatusResult.totalAmount.toFixed(2)}`,
        intent,
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    // 6. INTENT: CHECK_PAYMENT ("maine payment kar diya")
    if (intent === 'CHECK_PAYMENT') {
      const orderNumMatch = rawText.match(/ORD-\d{4}-\d+/i);
      let orderToCheck = orderNumMatch ? orderNumMatch[0] : null;

      if (!orderToCheck && conversation.currentOrderDraft?.confirmedOrderId) {
        orderToCheck = conversation.currentOrderDraft.confirmedOrderId;
      }

      let payStatusRes;
      if (orderToCheck) {
        const isNum = typeof orderToCheck === 'string' && orderToCheck.startsWith('ORD-');
        payStatusRes = await executeTool('getPaymentStatus', {
          orderNumber: isNum ? orderToCheck : undefined,
          orderId: !isNum ? orderToCheck : undefined,
        });
      } else if (conversation.customerId) {
        const lastOrder = await executeTool('getLastOrder', { customerId: conversation.customerId });
        if (lastOrder.result?.found) {
          payStatusRes = await executeTool('getPaymentStatus', { orderId: lastOrder.result.order.orderId });
        }
      }

      if (!payStatusRes || !payStatusRes.result?.found) {
        return {
          response: 'Maine note kar liya hai. Payment verify karne ke liye kripya apna Order ID ya transaction reference provide karein.',
          intent,
          toolCalls: [],
          orderDraft: null,
        };
      }

      const p = payStatusRes.result;
      toolExecutions.push({
        tool: 'getPaymentStatus',
        input: { orderNumber: p.orderNumber },
        output: p,
        status: 'SUCCESS',
      });

      if (p.isPaid) {
        return {
          response: `Backend records ke anusaar Order #${p.orderNumber} ka payment fully PAID hai! (Total: ₹${p.totalAmount.toFixed(2)}). Shukriya!`,
          intent,
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }

      return {
        response: `Order #${p.orderNumber} ka verified payment status abhi "${p.paymentStatus}" hai.\n• Paid: ₹${p.paidAmount.toFixed(2)}\n• Remaining Due: ₹${p.remainingAmount.toFixed(2)}.\n\nAgar aapne UPI se pay kiya hai toh transaction ID share karein.`,
        intent,
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    // 7. INTENT: CANCEL_ORDER ("order cancel kar do")
    if (intent === 'CANCEL_ORDER') {
      const orderNumMatch = rawText.match(/ORD-\d{4}-\d+/i);
      let targetOrderNum = orderNumMatch ? orderNumMatch[0] : null;

      if (!targetOrderNum && conversation.customerId) {
        const lastOrder = await executeTool('getLastOrder', { customerId: conversation.customerId });
        if (lastOrder.result?.found) {
          targetOrderNum = lastOrder.result.order.orderNumber;
        }
      }

      if (!targetOrderNum) {
        return {
          response: 'Kaunsa order cancel karna hai? Kripya Order Number bataiye (e.g. ORD-2026-000001).',
          intent,
          toolCalls: [],
          orderDraft: null,
        };
      }

      const cancelRes = await executeTool('cancelOrder', {
        orderNumber: targetOrderNum,
        reason: 'Customer requested cancellation via AI Operator',
        user,
      }, { user, conversationId: conversation._id });

      toolExecutions.push({
        tool: 'cancelOrder',
        input: { orderNumber: targetOrderNum },
        output: cancelRes.result,
        status: cancelRes.result?.success ? 'SUCCESS' : 'FAILED',
      });

      return {
        response: cancelRes.result?.message || 'Order cancel ho gaya hai.',
        intent,
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    // 8. INTENT: LOW_STOCK_QUERY (Store Owner Command)
    if (intent === 'LOW_STOCK_QUERY') {
      const lowStockTool = await executeTool('getLowStockProducts', { limit: 10 });
      toolExecutions.push({
        tool: 'getLowStockProducts',
        input: {},
        output: lowStockTool.result,
        status: 'SUCCESS',
      });

      const prods = lowStockTool.result;
      if (!prods || prods.length === 0) {
        return {
          response: 'Sabhi products ka stock adequate level par hai! Koi low stock item nahi hai.',
          intent,
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }

      const lines = prods.map((p) => `• ${p.name}: ${p.stockQuantity} ${p.unit} remaining (Min: ${p.minimumStockLevel})`);
      return {
        response: `⚠️ Low Stock Items List:\n\n${lines.join('\n')}\n\nInhe restock karne ke liye Inventory management use karein.`,
        intent,
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    // 9. INTENT: CHECK_SALES (Store Owner Command)
    if (intent === 'CHECK_SALES') {
      const salesTool = await executeTool('getSalesMetrics', { period: 'TODAY' });
      toolExecutions.push({
        tool: 'getSalesMetrics',
        input: { period: 'TODAY' },
        output: salesTool.result,
        status: 'SUCCESS',
      });

      const s = salesTool.result;
      return {
        response: `📊 Today's Store Performance:\n\n• Total Orders: ${s.totalOrders}\n• Gross Sales: ₹${s.totalSales.toFixed(2)}\n• Cash/UPI Collected: ₹${s.totalCollected.toFixed(2)}\n• Active Pending Deliveries: ${s.pendingOrdersCount}`,
        intent,
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    // 10. INTENT: CHECK_STORE_HOURS
    if (intent === 'CHECK_STORE_HOURS') {
      const storeTool = await executeTool('getStoreSettings', {});
      const settings = storeTool.result;
      return {
        response: `🏪 ${settings.storeName}\nTiming: ${settings.operatingHours}\nAddress: ${settings.address}\nPhone: ${settings.phone}\nFree delivery on orders above ₹${settings.freeDeliveryThreshold}.`,
        intent,
        toolCalls: [],
        orderDraft: null,
      };
    }

    // 11. INTENT: CREATE_ORDER / ORDER DRAFT (Main Grocery Shopping Workflow)
    const rawItems = NLUParser.extractOrderItems(rawText);
    if (rawItems.length === 0) {
      return {
        response: 'Sorry, mujhe request completely samajh nahi aayi. Aap product aur quantity bata sakte hain? (e.g. "2 kg basmati rice, 1 litre oil aur 3 biscuit bhej do")',
        intent: 'UNKNOWN',
        toolCalls: [],
        orderDraft: null,
      };
    }

    // Identify customer if not already linked
    if (!conversation.customerId && conversation.customerPhone) {
      const custFind = await executeTool('findCustomer', { phone: conversation.customerPhone });
      if (custFind.result?.found) {
        conversation.customerId = custFind.result.customer.customerId;
        await conversation.save();
        toolExecutions.push({
          tool: 'findCustomer',
          input: { phone: conversation.customerPhone },
          output: custFind.result,
          status: 'SUCCESS',
        });
      }
    }

    // Match products in MongoDB database
    const matchedItems = [];
    const ambiguousItems = [];
    const stockShortages = [];

    for (const item of rawItems) {
      const searchRes = await executeTool('searchProducts', { query: item.rawName, limit: 5 });
      toolExecutions.push({
        tool: 'searchProducts',
        input: { query: item.rawName },
        output: searchRes.result,
        status: 'SUCCESS',
      });

      const candidates = searchRes.result || [];

      if (candidates.length === 0) {
        ambiguousItems.push({ item, reason: 'NOT_FOUND' });
        continue;
      }

      // Check for Ambiguity (multiple distinct products match)
      if (candidates.length > 1 && !candidates.some((c) => c.name.toLowerCase() === item.rawName.toLowerCase())) {
        // e.g. "oil" matches Fortune Oil, Saffola Oil, etc.
        const isVeryGeneric = ['oil', 'tel', 'rice', 'chawal', 'biscuit', 'biscuits', 'soap', 'shampoo', 'dal', 'tea'].includes(item.rawName.toLowerCase());
        if (isVeryGeneric) {
          ambiguousItems.push({
            item,
            reason: 'MULTIPLE_MATCHES',
            candidates: candidates.slice(0, 4),
          });
          continue;
        }
      }

      const selectedProduct = candidates[0];

      // Check Live Inventory
      const invCheck = await executeTool('checkInventory', {
        productId: selectedProduct.productId,
        quantity: item.quantity,
      });

      toolExecutions.push({
        tool: 'checkInventory',
        input: { productId: selectedProduct.productId, quantity: item.quantity },
        output: invCheck.result,
        status: 'SUCCESS',
      });

      if (!invCheck.result.isAvailable) {
        stockShortages.push({
          product: selectedProduct,
          requested: item.quantity,
          available: invCheck.result.availableStock,
          unit: selectedProduct.unit,
        });
      }

      // Cap at available stock if stock > 0, or exclude if 0
      if (invCheck.result.availableStock > 0) {
        matchedItems.push({
          productId: selectedProduct.productId,
          quantity: Math.min(item.quantity, invCheck.result.availableStock),
          name: selectedProduct.name,
        });
      }
    }

    // Handle Ambiguity Clarifications (Never guess!)
    if (ambiguousItems.length > 0) {
      const amb = ambiguousItems[0];
      if (amb.reason === 'MULTIPLE_MATCHES') {
        const candidateNames = amb.candidates.map((c, idx) => `${idx + 1}. ${c.name} (₹${c.sellingPrice})`).join('\n');
        return {
          response: `Kaunsa ${amb.item.rawName} chahiye?\n\n${candidateNames}\n\nKripya specific naam bataiye.`,
          intent: 'AMBIGUOUS_PRODUCT',
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }
      return {
        response: `Maaf kijiye, "${amb.item.rawName}" hamare store inventory mein nahi mila. Kripya dusra product try karein.`,
        intent: 'PRODUCT_NOT_FOUND',
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    if (matchedItems.length === 0) {
      const short = stockShortages[0];
      if (short) {
        return {
          response: `Abhi ${short.product.name} out of stock hai. Kripya thodi der baad try karein.`,
          intent: 'OUT_OF_STOCK',
          toolCalls: toolExecutions,
          orderDraft: null,
        };
      }
      return {
        response: 'Aapke mangwaye gaye items available nahi hain.',
        intent: 'OUT_OF_STOCK',
        toolCalls: toolExecutions,
        orderDraft: null,
      };
    }

    // Resolve address preferences
    const deliveryPref = NLUParser.extractDeliveryPreferences(rawText);
    const paymentPref = NLUParser.extractPaymentMethod(rawText);

    let customerAddress = {
      address: '',
      city: 'New Delhi',
      pincode: '',
      phone: conversation.customerPhone || '',
    };

    if (conversation.customerId) {
      const custObj = await executeTool('findCustomer', { phone: conversation.customerPhone });
      if (custObj.result?.found && custObj.result.customer.address) {
        customerAddress.address = custObj.result.customer.address;
        customerAddress.pincode = custObj.result.customer.pincode || '';
        customerAddress.city = custObj.result.customer.city || 'New Delhi';
      }
    }

    // Create Order Draft in backend
    const draftRes = await executeTool('createOrderDraft', {
      conversationId: conversation._id,
      customerId: conversation.customerId,
      items: matchedItems,
      deliveryAddress: customerAddress,
      paymentMethod: paymentPref,
    }, { user, conversationId: conversation._id });

    toolExecutions.push({
      tool: 'createOrderDraft',
      input: { items: matchedItems },
      output: draftRes.result,
      status: 'SUCCESS',
    });

    const draft = draftRes.result.draft;
    const lines = draft.items.map((i) => `• ${i.name} – ${i.quantity} ${i.unit}: ₹${i.total.toFixed(2)}`);

    let responseMsg = `Bilkul! Maine order draft prepare kar diya hai:\n\n${lines.join('\n')}\n\nSubtotal: ₹${draft.subtotal.toFixed(2)}\nDelivery: ₹${draft.deliveryCharge.toFixed(2)}\nTotal: ₹${draft.totalAmount.toFixed(2)}\nPayment: ${draft.paymentMethod}\n`;

    if (draft.deliveryAddress?.address) {
      responseMsg += `Address: ${draft.deliveryAddress.address}\n`;
    }

    if (stockShortages.length > 0) {
      const shortageNotes = stockShortages.map((s) => `⚠️ ${s.product.name} ka keval ${s.available} ${s.unit} available tha, isliye ${s.available} add kiya gaya hai.`);
      responseMsg = shortageNotes.join('\n') + '\n\n' + responseMsg;
    }

    responseMsg += '\nConfirm karu? (Reply "Haan" to place order)';

    return {
      response: responseMsg,
      intent: 'CREATE_ORDER',
      toolCalls: toolExecutions,
      orderDraft: draft,
    };
  }
}

module.exports = RuleEngineProvider;
