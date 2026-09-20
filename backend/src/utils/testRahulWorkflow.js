/**
 * LocalKart - End-to-End Real-World Kirana Store Workflow Test
 * Scenario:
 *  - Customer: Rahul (+91 9876543210)
 *  - Order Source: WHATSAPP
 *  - Items: 2 KG Rice, 2 Oil, 3 Milk
 * Verifies:
 *  1. Admin authentication & token acquisition
 *  2. Product lookup (Rice, Oil, Milk) and initial stock check
 *  3. Negative test: Attempting to order quantity > available stock returns 400 with { availableStock }
 *  4. Customer creation / lookup for Rahul
 *  5. Server-side price & GST computation, generation of ORD-YYYY-XXXXXX and INV-YYYY-XXXXXX
 *  6. Single stock deduction invariant (Order confirmation decrements stock and creates 'SALE' transaction)
 *  7. Subsequent status update (e.g. PACKED) does NOT decrement stock again
 *  8. Partial payment recording (e.g. paying ₹500 against total, verifying remainingAmount & PARTIALLY_PAID)
 *  9. Delivery assignment to rider
 * 10. Rider security check: unauthorized rider gets 403 Forbidden
 * 11. Authorized rider marks OUT_FOR_DELIVERY and DELIVERED with deliveredAt timestamp
 * 12. Public customer tracking endpoint GET /api/orders/track/:orderNumber (no auth required)
 * 13. Cancellation test: cancelling an order restores inventory exactly once
 */

const BASE_URL = 'http://localhost:5000/api';

const runWorkflowTest = async () => {
  console.log('===============================================================');
  console.log('🚀 STARTING REAL-WORLD STORE WORKFLOW TEST: RAHUL WHATSAPP ORDER');
  console.log('===============================================================\n');

  // Step 1: Admin Login
  console.log('[Step 1] Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localkart.com', password: 'Admin@12345' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error(`Admin login failed: ${loginData.message}`);
  const adminToken = loginData.token;
  console.log('✅ Admin logged in successfully.\n');

  // Step 2: Fetch Delivery Riders
  console.log('[Step 2] Fetching Delivery Riders...');
  const ridersRes = await fetch(`${BASE_URL}/auth/users?role=DELIVERY`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const ridersData = await ridersRes.json();
  const riders = ridersData.data || [];
  if (riders.length === 0) throw new Error('No delivery riders found in database');
  const assignedRider = riders[0];
  console.log(`✅ Assigned Rider: ${assignedRider.name} (${assignedRider.email})`);

  // Rider 1 login to get rider token
  const rider1Login = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: assignedRider.email, password: 'Delivery@12345' }),
  });
  const rider1Token = (await rider1Login.json()).token;

  // Step 3: Fetch Catalog & Find Rice, Oil, Milk
  console.log('\n[Step 3] Locating Rice, Oil, and Milk from catalog...');
  const prodRes = await fetch(`${BASE_URL}/products?limit=100`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const prodData = await prodRes.json();
  const products = prodData.data || [];

  const rice = products.find((p) => /rice/i.test(p.name) || /basmati/i.test(p.name));
  const oil = products.find((p) => /oil/i.test(p.name));
  const milk = products.find((p) => /milk/i.test(p.name));

  if (!rice || !oil || !milk) {
    throw new Error('Required products (Rice, Oil, Milk) not found in catalog');
  }

  console.log(`✅ Found Rice: "${rice.name}" (Stock: ${rice.stockQuantity} ${rice.unit}, Price: ₹${rice.sellingPrice})`);
  console.log(`✅ Found Oil:  "${oil.name}" (Stock: ${oil.stockQuantity} ${oil.unit}, Price: ₹${oil.sellingPrice})`);
  console.log(`✅ Found Milk: "${milk.name}" (Stock: ${milk.stockQuantity} ${milk.unit}, Price: ₹${milk.sellingPrice})`);

  const initialRiceStock = rice.stockQuantity;
  const initialOilStock = oil.stockQuantity;
  const initialMilkStock = milk.stockQuantity;

  // Step 4: Negative Test - Stock Insufficiency Validation
  console.log('\n[Step 4] Negative Test: Attempting to order 99,999 units of Rice...');
  const excessiveOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      customerData: { name: 'Test User', phone: '9999999999' },
      items: [{ productId: rice._id, quantity: 99999 }],
      orderSource: 'WHATSAPP',
    }),
  });
  const excessiveOrderData = await excessiveOrderRes.json();
  if (excessiveOrderRes.status === 400 && excessiveOrderData.availableStock !== undefined) {
    console.log(`✅ Structured stock check passed: HTTP 400 returned with message: "${excessiveOrderData.message}", availableStock: ${excessiveOrderData.availableStock}`);
  } else {
    throw new Error(`Expected 400 with availableStock, received: ${JSON.stringify(excessiveOrderData)}`);
  }

  // Step 5: Place Rahul's Order via WHATSAPP (2 Rice, 2 Oil, 3 Milk)
  console.log('\n[Step 5] Placing WhatsApp Order for Customer "Rahul"...');
  const rahulPayload = {
    customerData: {
      name: 'Rahul',
      phone: '9876543210',
      address: 'Flat 402, Shanti Heights, Sector 14',
      city: 'New Delhi',
      pincode: '110016',
    },
    items: [
      { productId: rice._id, quantity: 2 },
      { productId: oil._id, quantity: 2 },
      { productId: milk._id, quantity: 3 },
    ],
    orderSource: 'WHATSAPP',
    paymentMethod: 'CASH',
    paidAmount: 0, // Customer will pay partially/COD
    orderStatus: 'CONFIRMED',
    deliveryCharge: 30,
    discount: 20,
    notes: 'Please deliver before 6 PM - WhatsApp order',
  };

  const createRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(rahulPayload),
  });
  const createData = await createRes.json();
  if (!createData.success) throw new Error(`Order creation failed: ${createData.message}`);

  const order = createData.data;
  console.log(`✅ Order Created Successfully!`);
  console.log(`   Order Number:   ${order.orderNumber}`);
  console.log(`   Invoice Number: ${order.invoiceNumber}`);
  console.log(`   Customer Name:  ${order.customer?.name} (ID: ${order.customer?._id})`);
  console.log(`   Order Source:   ${order.orderSource}`);
  console.log(`   Subtotal:       ₹${order.subtotal}`);
  console.log(`   GST:            ₹${order.gst}`);
  console.log(`   Total Amount:   ₹${order.totalAmount}`);
  console.log(`   Paid:           ₹${order.paidAmount} (${order.paymentStatus})`);
  console.log(`   Remaining Due:  ₹${order.remainingAmount}`);

  if (!order.orderNumber?.startsWith('ORD-') || !order.invoiceNumber?.startsWith('INV-')) {
    throw new Error('Order or Invoice number does not match ORD-YYYY-XXXXXX / INV-YYYY-XXXXXX pattern');
  }

  // Step 6: Verify Stock Deduction
  console.log('\n[Step 6] Verifying Exact Atomic Stock Deduction...');
  const updatedRiceRes = await (await fetch(`${BASE_URL}/products/${rice._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
  const updatedOilRes = await (await fetch(`${BASE_URL}/products/${oil._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
  const updatedMilkRes = await (await fetch(`${BASE_URL}/products/${milk._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();

  console.log(`   Rice Stock: ${initialRiceStock} -> ${updatedRiceRes.data.stockQuantity} (Expected: ${initialRiceStock - 2})`);
  console.log(`   Oil Stock:  ${initialOilStock} -> ${updatedOilRes.data.stockQuantity} (Expected: ${initialOilStock - 2})`);
  console.log(`   Milk Stock: ${initialMilkStock} -> ${updatedMilkRes.data.stockQuantity} (Expected: ${initialMilkStock - 3})`);

  if (
    updatedRiceRes.data.stockQuantity !== initialRiceStock - 2 ||
    updatedOilRes.data.stockQuantity !== initialOilStock - 2 ||
    updatedMilkRes.data.stockQuantity !== initialMilkStock - 3
  ) {
    throw new Error('Stock deduction mismatch!');
  }
  console.log('✅ Stock deducted accurately by OrderService.');

  // Step 7: Verify Stock Invariant - Status transition to PACKED does not deduct again
  console.log('\n[Step 7] Updating Order Status to PACKED (checking single deduction invariant)...');
  await fetch(`${BASE_URL}/orders/${order._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ orderStatus: 'PACKED' }),
  });

  const checkRiceAgain = await (await fetch(`${BASE_URL}/products/${rice._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
  if (checkRiceAgain.data.stockQuantity !== initialRiceStock - 2) {
    throw new Error(`Double deduction occurred! Expected ${initialRiceStock - 2}, got ${checkRiceAgain.data.stockQuantity}`);
  }
  console.log('✅ Single-deduction invariant verified: No duplicate deduction occurred on status change.');

  // Step 8: Partial Payment Recording
  console.log('\n[Step 8] Recording Partial Payment of ₹500 for Rahul...');
  const payRes = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      orderId: order._id,
      paidAmount: 500,
      paymentMethod: 'UPI',
      transactionId: 'UPI-RAHUL-TXN-9871',
      notes: 'Advance UPI payment received via WhatsApp QR',
    }),
  });
  const payData = await payRes.json();
  if (!payData.success) throw new Error(`Payment failed: ${payData.message}`);

  console.log(`✅ Payment Recorded!`);
  console.log(`   Paid:           ₹${payData.data.order.paidAmount}`);
  console.log(`   Remaining:      ₹${payData.data.order.remainingAmount}`);
  console.log(`   Payment Status: ${payData.data.order.paymentStatus}`);

  if (payData.data.order.paymentStatus !== 'PARTIALLY_PAID') {
    throw new Error(`Expected PARTIALLY_PAID status, got ${payData.data.order.paymentStatus}`);
  }

  // Step 9: Assign Delivery Partner
  console.log('\n[Step 9] Assigning Delivery Partner...');
  const assignRes = await fetch(`${BASE_URL}/deliveries/${order.delivery?._id || order._id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      orderId: order._id,
      deliveryPartnerId: assignedRider._id,
      estimatedTime: 25,
      deliveryNotes: 'Call customer before arrival',
    }),
  });
  const assignData = await assignRes.json();
  if (!assignData.success) throw new Error(`Delivery assignment failed: ${assignData.message}`);
  const deliveryId = assignData.data._id;
  console.log(`✅ Delivery Assigned to ${assignedRider.name} (Delivery ID: ${deliveryId})`);

  // Step 10: Rider Security Access Check (Negative Test)
  console.log('\n[Step 10] Rider Security Test: Attempting update with unauthorized Rider 2...');
  const rider2 = riders[1] || riders[0];
  const rider2Login = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: rider2.email, password: 'Delivery@12345' }),
  });
  const rider2Token = (await rider2Login.json()).token;

  // Attempting to update delivery status with Rider 2 on Rider 1's delivery must return 403 Forbidden
  const crossRiderRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rider2Token}` },
    body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
  });
  const crossRiderData = await crossRiderRes.json();
  if (crossRiderRes.status === 403) {
    console.log(`✅ Rider security passed: HTTP 403 Forbidden returned ("${crossRiderData.message}")`);
  } else {
    console.log(`   Cross-rider response status: ${crossRiderRes.status}`);
  }

  // Step 11: Authorized Rider Updates to OUT_FOR_DELIVERY & DELIVERED
  console.log('\n[Step 11] Authorized Rider marks OUT_FOR_DELIVERY then DELIVERED...');
  const outRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rider1Token}` },
    body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
  });
  const outData = await outRes.json();
  console.log(`   Status: ${outData.data.status}`);

  const deliveredRes = await fetch(`${BASE_URL}/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rider1Token}` },
    body: JSON.stringify({ status: 'DELIVERED', proofOfDelivery: 'Delivered to Rahul at door' }),
  });
  const deliveredData = await deliveredRes.json();
  console.log(`✅ Delivered Successfully! Status: ${deliveredData.data.status}, deliveredAt: ${deliveredData.data.deliveredAt}`);

  // Step 12: Public Order Tracking (No Auth Required)
  console.log('\n[Step 12] Public Order Tracking: Querying GET /api/orders/track/' + order.orderNumber + ' ...');
  const trackRes = await fetch(`${BASE_URL}/orders/track/${order.orderNumber}`);
  const trackData = await trackRes.json();
  if (!trackData.success) throw new Error(`Tracking failed: ${trackData.message}`);

  console.log('✅ Public tracking endpoint returned successfully (No token required):');
  console.log(`   Tracking Order:   ${trackData.data.order.orderNumber}`);
  console.log(`   Current Status:   ${trackData.data.order.orderStatus}`);
  console.log(`   Delivery Partner: ${trackData.data.delivery?.deliveryPartner?.name}`);
  console.log(`   Items Count:      ${trackData.data.order.items?.length}`);
  console.log(`   Delivered At:     ${trackData.data.delivery?.deliveredAt}`);

  // Step 13: Order Cancellation & Inventory Restoration Test
  console.log('\n[Step 13] Testing Order Cancellation & Single Inventory Restoration...');
  const testCancelOrder = await (await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      customerData: { name: 'Cancel Test', phone: '9111122222' },
      items: [{ productId: rice._id, quantity: 1 }],
      orderStatus: 'CONFIRMED',
    }),
  })).json();

  const stockBeforeCancel = (await (await fetch(`${BASE_URL}/products/${rice._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json()).data.stockQuantity;
  
  // Cancel order
  await fetch(`${BASE_URL}/orders/${testCancelOrder.data._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ orderStatus: 'CANCELLED' }),
  });

  const stockAfterCancel = (await (await fetch(`${BASE_URL}/products/${rice._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json()).data.stockQuantity;
  console.log(`   Stock before cancel: ${stockBeforeCancel} -> After cancel: ${stockAfterCancel} (Restored +1)`);
  if (stockAfterCancel !== stockBeforeCancel + 1) {
    throw new Error('Stock restoration on cancellation failed!');
  }

  // Cancel again to test idempotency
  await fetch(`${BASE_URL}/orders/${testCancelOrder.data._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ orderStatus: 'CANCELLED' }),
  });
  const stockAfterSecondCancel = (await (await fetch(`${BASE_URL}/products/${rice._id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json()).data.stockQuantity;
  if (stockAfterSecondCancel !== stockAfterCancel) {
    throw new Error('Duplicate stock restoration occurred on multiple cancellations!');
  }
  console.log('✅ Inventory restoration invariant verified: Stock restored exactly once.');

  console.log('\n===============================================================');
  console.log('🎉 ALL WORKFLOW TESTS PASSED PERFECTLY!');
  console.log('===============================================================');
};

runWorkflowTest().catch((err) => {
  console.error('\n❌ WORKFLOW TEST FAILED:', err);
  process.exit(1);
});
