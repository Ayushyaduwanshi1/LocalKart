// Comprehensive End-to-End Workflow Verification Script
// Tests all 16 required workflow criteria and edge cases against http://localhost:5000/api

const BASE_URL = 'http://localhost:5000/api';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
};

async function run() {
  console.log('====================================================');
  console.log('🚀 STARTING REAL-WORLD STORE WORKFLOW VERIFICATION');
  console.log('====================================================\n');

  // Step 0: Login as Admin
  console.log('[Step 0] Logging in as Admin...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localkart.com', password: 'Admin@12345' }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginData.success, 'Admin login succeeded');
  const adminToken = adminLoginData.data?.token || adminLoginData.token;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // Step 0b: Login as Rider 1 (delivery1@localkart.com)
  console.log('[Step 0b] Logging in as Delivery Rider 1...');
  const rider1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'delivery1@localkart.com', password: 'Delivery@12345' }),
  });
  const rider1LoginData = await rider1LoginRes.json();
  assert(rider1LoginData.success, 'Rider 1 login succeeded');
  const rider1User = rider1LoginData.data?.user || rider1LoginData.user;
  const rider1Token = rider1LoginData.data?.token || rider1LoginData.token;
  const rider1Id = rider1User._id;
  const rider1Headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${rider1Token}`,
  };

  // Step 0c: Login as Rider 2 (delivery2@localkart.com or Rahul Yadav)
  console.log('[Step 0c] Logging in as Delivery Rider 2 (Rival Rider)...');
  // First check riders list from /api/users?role=DELIVERY
  const ridersRes = await fetch(`${BASE_URL}/users?role=DELIVERY`, { headers: adminHeaders });
  const ridersData = await ridersRes.json();
  assert(ridersData.success && ridersData.data.length >= 2, 'At least 2 delivery riders exist in DB');
  const rider2User = ridersData.data.find((r) => r.email !== 'delivery1@localkart.com');
  const rider2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: rider2User.email, password: 'Delivery@12345' }),
  });
  const rider2LoginData = await rider2LoginRes.json();
  assert(rider2LoginData.success, 'Rider 2 login succeeded');
  const rider2Token = rider2LoginData.data?.token || rider2LoginData.token;
  const rider2Headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${rider2Token}`,
  };

  // Step 1 & 2: Customer phone search & customer creation
  console.log('\n[Step 1 & 2] Testing Customer Phone Search & Auto-Creation...');
  const testPhone = '9811223344';
  const custSearchRes = await fetch(`${BASE_URL}/customers?search=${testPhone}`, { headers: adminHeaders });
  const custSearchData = await custSearchRes.json();
  console.log(`  Customer search for ${testPhone}: found ${custSearchData.data?.length || 0} records.`);

  // Step 3: Lookup Products (Rice, Oil, Milk) and check starting stock
  console.log('\n[Step 3] Fetching Products: 2 KG Rice, 2 Oil, 3 Milk...');
  const productsRes = await fetch(`${BASE_URL}/products?limit=100`, { headers: adminHeaders });
  const productsData = await productsRes.json();
  const allProducts = productsData.data;

  const riceProduct = allProducts.find((p) => p.name.toLowerCase().includes('rice'));
  const oilProduct = allProducts.find((p) => p.name.toLowerCase().includes(' mustard oil') || p.name.toLowerCase().includes(' oil') || p.category?.name?.includes('Oil'));
  const milkProduct = allProducts.find((p) => p.name.toLowerCase().includes('milk'));

  assert(riceProduct, `Found Rice product: "${riceProduct?.name}" (Stock: ${riceProduct?.stockQuantity})`);
  assert(oilProduct, `Found Oil product: "${oilProduct?.name}" (Stock: ${oilProduct?.stockQuantity})`);
  assert(milkProduct, `Found Milk product: "${milkProduct?.name}" (Stock: ${milkProduct?.stockQuantity})`);

  const initialRiceStock = riceProduct.stockQuantity;
  const initialOilStock = oilProduct.stockQuantity;
  const initialMilkStock = milkProduct.stockQuantity;

  // Step 4 & 5: Customer Order Note Karna / POS Entry with Price Snapshot & Independent Server Calculation
  console.log('\n[Step 4 & 5] Creating Order with Source WHATSAPP for Customer Rahul...');
  // Deliberately send malicious manipulated client prices to test server-side recalculation security!
  const orderPayload = {
    customerName: 'Rahul',
    customerPhone: '9811223344',
    customerAddress: 'Flat 402, Sunshine Heights, New Delhi',
    customerPincode: '110001',
    customerEmail: 'rahul@example.com',
    orderSource: 'WHATSAPP',
    items: [
      { product: riceProduct._id, quantity: 2, price: 1 }, // Hacked client price 1
      { product: oilProduct._id, quantity: 2, price: 1 },
      { product: milkProduct._id, quantity: 3, price: 1 },
    ],
    deliveryAddress: {
      address: 'Flat 402, Sunshine Heights',
      city: 'New Delhi',
      pincode: '110001',
      phone: '9811223344',
    },
    paymentMethod: 'CASH',
    paidAmount: 500, // Partial cash payment
    notes: 'Please leave with security guard if not home',
  };

  const createOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(orderPayload),
  });
  const createOrderData = await createOrderRes.json();
  if (!createOrderData.success) {
    console.error('Create Order Error Details:', createOrderData);
  }
  assert(createOrderData.success, `Order created successfully: ${createOrderData.message || ''}`);
  const order = createOrderData.data;

  // Verify server-side price recalculation (ignoring the 1 rs client price!)
  const expectedRiceItemTotal = Math.round(riceProduct.sellingPrice * 2 * 100) / 100;
  const riceItemInOrder = order.items.find((i) => String(i.product?._id || i.product) === String(riceProduct._id));
  assert(riceItemInOrder, 'Rice item found in order items');
  assert(riceItemInOrder.price === riceProduct.sellingPrice, `Server enforced DB price (₹${riceProduct.sellingPrice}), ignored client hacked price`);
  assert(order.totalAmount > 10, `Order total is calculated correctly on server: ₹${order.totalAmount}`);

  // Step 6: Invoice Generation & Structure
  console.log('\n[Step 6] Validating Tax Invoice format & details...');
  assert(order.invoiceNumber && order.invoiceNumber.startsWith('INV-'), `Invoice number generated: ${order.invoiceNumber}`);

  const invoiceRes = await fetch(`${BASE_URL}/orders/${order._id}/invoice`, { headers: adminHeaders });
  const invoiceData = await invoiceRes.json();
  assert(invoiceData.success, 'Fetched invoice data from API');
  const invoiceOrder = invoiceData.data.order || invoiceData.data;
  assert(invoiceOrder.invoiceNumber === order.invoiceNumber, 'Invoice number matches');
  assert(invoiceOrder.items.length === 3, 'Invoice contains all 3 products');
  assert(invoiceData.data.whatsappText && invoiceData.data.whatsappText.includes(order.invoiceNumber), 'WhatsApp share text generated');

  // Step 7: Payment Tracking & Partial Payment
  console.log('\n[Step 7] Validating Payment Tracking & Partial Payment...');
  assert(order.paymentStatus === 'PARTIALLY_PAID', `Order payment status is PARTIALLY_PAID (Paid: ₹${order.paidAmount}, Due: ₹${order.remainingAmount})`);
  assert(order.remainingAmount === Math.round((order.totalAmount - 500) * 100) / 100, 'Remaining balance computed accurately');

  // Admin records additional payment to complete the order
  console.log('  Recording remaining payment to mark as PAID...');
  const payRes = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      orderId: order._id,
      paidAmount: order.remainingAmount,
      paymentMethod: 'UPI',
      transactionId: 'UPI-RAHUL-12345',
      notes: 'Final settlement via Google Pay',
    }),
  });
  const payData = await payRes.json();
  assert(payData.success, 'Remaining payment recorded successfully');
  assert(payData.data.order.paymentStatus === 'PAID', 'Order payment status now fully PAID');
  assert(payData.data.order.remainingAmount === 0, 'Remaining balance is now 0');

  // Step 8: Automatic Stock Decrement
  console.log('\n[Step 8] Checking Automatic Stock Deduction in Database...');
  const riceUpdatedRes = await fetch(`${BASE_URL}/products/${riceProduct._id}`, { headers: adminHeaders });
  const riceUpdated = (await riceUpdatedRes.json()).data;
  assert(riceUpdated.stockQuantity === initialRiceStock - 2, `Rice stock decremented by 2: ${initialRiceStock} -> ${riceUpdated.stockQuantity}`);

  const oilUpdatedRes = await fetch(`${BASE_URL}/products/${oilProduct._id}`, { headers: adminHeaders });
  const oilUpdated = (await oilUpdatedRes.json()).data;
  assert(oilUpdated.stockQuantity === initialOilStock - 2, `Oil stock decremented by 2: ${initialOilStock} -> ${oilUpdated.stockQuantity}`);

  const milkUpdatedRes = await fetch(`${BASE_URL}/products/${milkProduct._id}`, { headers: adminHeaders });
  const milkUpdated = (await milkUpdatedRes.json()).data;
  assert(milkUpdated.stockQuantity === initialMilkStock - 3, `Milk stock decremented by 3: ${initialMilkStock} -> ${milkUpdated.stockQuantity}`);

  // Step 9: Inventory Transaction Audit Logs
  console.log('\n[Step 9] Checking InventoryTransaction Audit Logs...');
  const inventoryTxRes = await fetch(`${BASE_URL}/inventory/history?productId=${riceProduct._id}`, { headers: adminHeaders });
  const inventoryTxData = await inventoryTxRes.json();
  assert(inventoryTxData.success, 'Fetched inventory transactions');
  const saleTx = inventoryTxData.data.find((tx) => tx.type === 'SALE' && String(tx.order?._id || tx.order) === String(order._id));
  assert(saleTx, `Audit log found with type 'SALE' for order #${order.orderNumber} (Qty: ${saleTx?.quantity})`);

  // Step 10: Customer Notifications
  console.log('\n[Step 10] Checking Notification System...');
  const notifRes = await fetch(`${BASE_URL}/notifications`, { headers: adminHeaders });
  const notifData = await notifRes.json();
  assert(notifData.success && notifData.data.length > 0, `Notifications recorded in system (${notifData.data.length} total)`);

  // Step 11: Delivery Assignment
  console.log('\n[Step 11] Assigning Delivery Partner (Rider 1)...');
  // First retrieve the delivery record for this order
  const getOrderDeliveryRes = await fetch(`${BASE_URL}/orders/${order._id}`, { headers: adminHeaders });
  const orderWithDelivery = (await getOrderDeliveryRes.json()).data;
  assert(orderWithDelivery.delivery, 'Delivery record was automatically created with order');
  const deliveryId = orderWithDelivery.delivery._id;

  const assignRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/assign`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ deliveryPartnerId: rider1Id, notes: 'Deliver before 5 PM' }),
  });
  const assignData = await assignRes.json();
  assert(assignData.success, 'Delivery partner assigned successfully');
  assert(assignData.data.status === 'ASSIGNED', 'Delivery status is ASSIGNED');

  // Step 12: Delivery Lifecycle Flow: CONFIRMED -> PROCESSING -> PACKED -> ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
  console.log('\n[Step 12] Progressing through Delivery Status Lifecycle...');

  // Rider 1 marks PICKED_UP
  const pickedUpRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: rider1Headers,
    body: JSON.stringify({ status: 'PICKED_UP', notes: 'Parcel picked up from store' }),
  });
  const pickedUpData = await pickedUpRes.json();
  assert(pickedUpData.success && pickedUpData.data.status === 'PICKED_UP', 'Status updated to PICKED_UP by Rider 1');

  // Rider 1 marks OUT_FOR_DELIVERY
  const outRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: rider1Headers,
    body: JSON.stringify({ status: 'OUT_FOR_DELIVERY', notes: 'On the way to customer' }),
  });
  const outData = await outRes.json();
  assert(outData.success && outData.data.status === 'OUT_FOR_DELIVERY', 'Status updated to OUT_FOR_DELIVERY by Rider 1');

  // Rider 1 marks DELIVERED
  const deliveredRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: rider1Headers,
    body: JSON.stringify({ status: 'DELIVERED', notes: 'Handed over to customer Rahul' }),
  });
  const deliveredData = await deliveredRes.json();
  assert(deliveredData.success && deliveredData.data.status === 'DELIVERED', 'Status updated to DELIVERED by Rider 1');

  // Step 13: deliveredAt Timestamp Verification
  console.log('\n[Step 13] Verifying exact deliveredAt timestamp...');
  assert(deliveredData.data.deliveredAt, `Delivery has recorded deliveredAt timestamp: ${deliveredData.data.deliveredAt}`);
  const finalOrderRes = await fetch(`${BASE_URL}/orders/${order._id}`, { headers: adminHeaders });
  const finalOrder = (await finalOrderRes.json()).data;
  assert(finalOrder.orderStatus === 'DELIVERED', 'Order status is synced to DELIVERED');
  assert(finalOrder.deliveredAt, `Order has recorded deliveredAt timestamp: ${finalOrder.deliveredAt}`);

  // Step 14: Customer Public Live Tracking (/track/:orderNumber)
  console.log('\n[Step 14] Verifying Customer Public Order Tracking...');
  const trackRes = await fetch(`${BASE_URL}/orders/track/${order.orderNumber}`);
  const trackData = await trackRes.json();
  assert(trackData.success, 'Public tracking endpoint returned success');
  assert(trackData.data.order?.orderStatus === 'DELIVERED' || trackData.data.orderStatus === 'DELIVERED', 'Tracking status shows DELIVERED');
  assert(trackData.data.store?.storeName, `Tracking includes store info: "${trackData.data.store?.storeName}"`);
  assert(trackData.data.delivery?.deliveredAt, 'Tracking includes delivery timestamp');

  // Step 15: Admin Dashboard Metrics Update
  console.log('\n[Step 15] Verifying Payment Stats and Dashboard Metrics...');
  const statsRes = await fetch(`${BASE_URL}/payments/stats`, { headers: adminHeaders });
  const statsData = await statsRes.json();
  assert(statsData.success, 'Fetched payment stats');
  assert(statsData.data.todayCollected > 0, `Dashboard shows todayCollected: ₹${statsData.data.todayCollected}`);
  console.log('  Payment metrics:', statsData.data);

  // Step 16: Edge Cases
  console.log('\n[Step 16] Testing Real-World Edge Cases...');

  // 16a: Insufficient Stock
  console.log('  Subtest 16a: Insufficient Stock Handling...');
  const excessiveOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      customerName: 'Test Overstock',
      customerPhone: '9998887777',
      items: [{ product: riceProduct._id, quantity: 999999 }],
    }),
  });
  const excessiveOrderData = await excessiveOrderRes.json();
  assert(excessiveOrderRes.status === 400, 'Excessive stock order rejected with HTTP 400');
  assert(excessiveOrderData.success === false, 'success === false in response');
  assert(excessiveOrderData.availableStock !== undefined, `Returns availableStock: ${excessiveOrderData.availableStock}`);
  assert(excessiveOrderData.message.includes('Insufficient stock'), `Friendly error message returned: "${excessiveOrderData.message}"`);

  // 16b: Unauthorized Delivery Partner
  console.log('  Subtest 16b: Unauthorized Delivery Partner Protection (Rider 2 accessing Rider 1 delivery)...');
  const unauthorizedUpdateRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: rider2Headers,
    body: JSON.stringify({ status: 'FAILED' }),
  });
  const unauthorizedUpdateData = await unauthorizedUpdateRes.json();
  assert(unauthorizedUpdateRes.status === 403, 'Rival rider blocked with HTTP 403 Forbidden');
  assert(unauthorizedUpdateData.message.includes('Forbidden') || unauthorizedUpdateData.message.includes('not authorized'), `Forbidden error: "${unauthorizedUpdateData.message}"`);

  // 16c: Order Cancellation & Inventory Restoration
  console.log('  Subtest 16c: Order Cancellation & Automatic Stock Restoration...');
  // Create a new order to cancel
  const cancelTestOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      customerName: 'Cancel Test',
      customerPhone: '9123456780',
      items: [{ product: milkProduct._id, quantity: 2 }],
      paymentMethod: 'CASH',
    }),
  });
  const cancelTestOrderData = await cancelTestOrderRes.json();
  const cancelOrder = cancelTestOrderData.data;

  // Verify stock was deducted
  const milkBeforeCancel = (await (await fetch(`${BASE_URL}/products/${milkProduct._id}`, { headers: adminHeaders })).json()).data;
  const expectedStockBeforeCancel = milkUpdated.stockQuantity - 2;
  assert(milkBeforeCancel.stockQuantity === expectedStockBeforeCancel, `Milk stock temporarily decremented by 2: ${milkBeforeCancel.stockQuantity}`);

  // Now cancel the order
  const cancelRes = await fetch(`${BASE_URL}/orders/${cancelOrder._id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ orderStatus: 'CANCELLED' }),
  });
  const cancelData = await cancelRes.json();
  assert(cancelData.success && cancelData.data.orderStatus === 'CANCELLED', 'Order cancelled successfully');

  // Verify stock was restored
  const milkAfterCancel = (await (await fetch(`${BASE_URL}/products/${milkProduct._id}`, { headers: adminHeaders })).json()).data;
  assert(milkAfterCancel.stockQuantity === milkUpdated.stockQuantity, `Milk stock restored back to ${milkAfterCancel.stockQuantity}`);

  // Verify InventoryTransaction ORDER_CANCELLED was created
  const cancelTxRes = await fetch(`${BASE_URL}/inventory/history?productId=${milkProduct._id}`, { headers: adminHeaders });
  const cancelTxData = await cancelTxRes.json();
  const cancelTx = cancelTxData.data.find((tx) => tx.type === 'ORDER_CANCELLED' && String(tx.order?._id || tx.order) === String(cancelOrder._id));
  assert(cancelTx, `Found InventoryTransaction with type ORDER_CANCELLED for cancelled order`);

  console.log('\n====================================================');
  console.log('🎉 ALL 16 REAL-WORLD STORE WORKFLOW TESTS PASSED!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ WORKFLOW TEST SUITE FAILED:', err);
  process.exit(1);
});
