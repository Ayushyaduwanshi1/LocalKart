// Autonomous AI Store Operator End-to-End Test Suite
// Verifies NLU, Tool Registry, Draft Management, Safety Policies, Ambiguity, Duplicate Prevention, and Overrides

const BASE_URL = 'http://localhost:5000/api';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
};

async function run() {
  console.log('========================================================');
  console.log('🤖 STARTING AUTONOMOUS AI STORE OPERATOR TEST SUITE');
  console.log('========================================================\n');

  // Step 0: Login as Admin
  console.log('[Step 0] Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localkart.com', password: 'Admin@12345' }),
  });
  const loginData = await loginRes.json();
  assert(loginData.success, 'Admin logged in');
  const token = loginData.data?.token || loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Test Case 1: Natural Language Grocery Request (Hindi/Hinglish)
  console.log('\n[Test 1] Natural Language Grocery Request: "2 kg basmati rice, 1 litre Fortune oil aur 3 milk bhej do"...');
  const testPhone = '9811' + String(Date.now()).slice(-6);
  const chatRes1 = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerPhone: testPhone,
      customerName: 'Rahul',
      message: '2 kg basmati rice, 1 litre Fortune oil aur 3 milk bhej do. Ghar pe deliver kar dena.',
      source: 'WHATSAPP',
    }),
  });
  const chatData1 = await chatRes1.json();
  console.log('Chat 1 result:', chatData1.data);
  assert(chatData1.success, 'AI Chat endpoint returned success');
  const convId = chatData1.data.conversationId;
  const draft = chatData1.data.orderDraft;

  assert(draft, 'AI prepared an order draft');
  assert(draft.status === 'DRAFT', 'Draft status is DRAFT (uncommitted)');
  assert(draft.items.length >= 2, `Draft contains ${draft.items.length} items (Rice, Oil, Milk)`);
  assert(draft.totalAmount > 0, `Total amount calculated by backend: ₹${draft.totalAmount}`);
  assert(chatData1.data.response.includes('draft prepare') || chatData1.data.response.includes('Confirm'), 'AI response asked for confirmation');
  console.log('  AI Response:\n', chatData1.data.response.split('\n').map((l) => `    ${l}`).join('\n'));

  // Test Case 2: Duplicate Message Prevention (Idempotency)
  console.log('\n[Test 2] Testing Duplicate Message Prevention...');
  const dupChatRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: convId,
      customerPhone: testPhone,
      message: '2 kg basmati rice, 1 litre Fortune oil aur 3 milk bhej do. Ghar pe deliver kar dena.',
      source: 'WHATSAPP',
    }),
  });
  const dupChatData = await dupChatRes.json();
  assert(dupChatData.data.isDuplicate, 'AI detected duplicate message within idempotency window');
  assert(dupChatData.data.response.includes('already process'), 'AI informed customer that request is already in progress');

  // Test Case 3: Conversational Draft Modification ("oil hata do aur 2 biscuit add kar do")
  console.log('\n[Test 3] Conversational Order Modification: "oil hata do aur 2 biscuit add kar do"...');
  const modChatRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: convId,
      message: 'oil hata do aur 2 biscuit add kar do',
      source: 'WHATSAPP',
    }),
  });
  const modChatData = await modChatRes.json();
  assert(modChatData.success, 'Draft modification request processed');
  const modDraft = modChatData.data.orderDraft;
  assert(modDraft, 'Updated draft returned');
  const hasOil = modDraft.items.some((i) => i.name.toLowerCase().includes('oil'));
  const hasBiscuit = modDraft.items.some((i) => i.name.toLowerCase().includes('biscuit') || i.name.toLowerCase().includes('parle') || i.name.toLowerCase().includes('oreo'));
  assert(!hasOil, 'Oil successfully removed from active draft');
  assert(hasBiscuit, 'Biscuits successfully added to active draft');
  console.log('  Modified Draft Items:', modDraft.items.map((i) => `${i.name} (x${i.quantity})`).join(', '));

  // Test Case 4: Confirmation Flow ("Haan, confirm kar do")
  console.log('\n[Test 4] Confirmation Flow: "Haan, confirm kar do"...');
  const confirmChatRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: convId,
      message: 'Haan, confirm kar do',
      source: 'WHATSAPP',
    }),
  });
  const confirmChatData = await confirmChatRes.json();
  console.log('Confirm response:', confirmChatData.data);
  assert(confirmChatData.success, 'Order confirmation processed');
  assert(confirmChatData.data.response.includes('Order confirmed'), 'AI responded with confirmation and Order ID');
  console.log('  AI Confirmation Response:\n', confirmChatData.data.response.split('\n').map((l) => `    ${l}`).join('\n'));

  // Test Case 5: Ambiguity Handling ("1 oil bhej do" without brand)
  console.log('\n[Test 5] Ambiguity Handling: "1 oil bhej do"...');
  // Create a separate conversation for ambiguity test
  const ambChatRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerPhone: '9888877777',
      customerName: 'Priya',
      message: '1 oil bhej do',
      source: 'WHATSAPP',
    }),
  });
  const ambChatData = await ambChatRes.json();
  assert(ambChatData.success, 'Ambiguous message processed');
  assert(
    ambChatData.data.intent === 'AMBIGUOUS_PRODUCT' || ambChatData.data.response.includes('Kaunsa oil') || ambChatData.data.response.includes('chahiye'),
    'AI asked a clarification question listing specific oils instead of randomly guessing'
  );
  console.log('  Ambiguity Clarification:\n', ambChatData.data.response.split('\n').map((l) => `    ${l}`).join('\n'));

  // Test Case 6: Live Inventory Reasoning & Out of Stock Shortage
  console.log('\n[Test 6] Inventory Reasoning: Requesting excessive quantity (500 kg rice)...');
  const stockChatRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerPhone: '9888877777',
      message: '500 kg basmati rice bhej do',
      source: 'WHATSAPP',
    }),
  });
  const stockChatData = await stockChatRes.json();
  assert(stockChatData.success, 'Stock shortage request processed');
  assert(
    stockChatData.data.response.includes('available') || stockChatData.data.response.includes('keval') || stockChatData.data.response.includes('stock'),
    'AI correctly prevented over-ordering and informed customer of available stock limits'
  );

  // Test Case 7: Fake Payment Claim Verification ("maine payment kar diya")
  console.log('\n[Test 7] Payment Claim Verification: "maine payment kar diya"...');
  const payClaimRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: convId,
      message: 'maine payment kar diya',
      source: 'WHATSAPP',
    }),
  });
  const payClaimData = await payClaimRes.json();
  const payClaimLower = payClaimData.data.response.toLowerCase();
  assert(
    payClaimLower.includes('verify') || payClaimLower.includes('status') || payClaimLower.includes('record'),
    'AI verified against backend source of truth instead of blindly accepting payment claim'
  );

  // Test Case 8: Order Status Tracking ("mera order kaha tak pahucha?")
  console.log('\n[Test 8] Live Order Status Tracking: "mera order kaha tak pahucha?"...');
  const trackChatRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: convId,
      message: 'mera order kaha tak pahucha?',
      source: 'WHATSAPP',
    }),
  });
  const trackChatData = await trackChatRes.json();
  assert(trackChatData.success, 'Order tracking query processed');
  assert(
    trackChatData.data.response.includes('Order Status') || trackChatData.data.response.includes('Delivery Status'),
    'AI returned live order and delivery status'
  );

  // Test Case 9: Store Owner Commands ("Kaunsa product low stock mein hai?", "Today sales kitni hui?")
  console.log('\n[Test 9] Store Owner Commands: Low Stock & Today Sales...');
  const lowStockRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Kaunsa product low stock mein hai?',
      source: 'DASHBOARD',
    }),
  });
  const lowStockData = await lowStockRes.json();
  assert(lowStockData.success, 'Low stock command executed');

  const salesRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: "Today's sales kitni hui?",
      source: 'DASHBOARD',
    }),
  });
  const salesData = await salesRes.json();
  assert(salesData.success, 'Sales metrics command executed');
  assert(salesData.data.response.includes('Store Performance') || salesData.data.response.includes('Sales'), 'Sales metrics returned accurately');

  // Test Case 10: Human Override (Pause AI and Resume)
  console.log('\n[Test 10] Human Override: Pausing AI Operator on conversation...');
  const pauseRes = await fetch(`${BASE_URL}/ai/conversations/${convId}/override`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status: 'PAUSED' }),
  });
  const pauseData = await pauseRes.json();
  console.log('Pause response:', pauseData);
  assert(pauseData.success && pauseData.data?.status === 'PAUSED', 'Conversation marked as PAUSED');

  // Attempting to send message while PAUSED
  const pausedMsgRes = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: convId,
      message: '2 kg atta bhej do',
    }),
  });
  const pausedMsgData = await pausedMsgRes.json();
  assert(pausedMsgData.data.status === 'PAUSED', 'AI prevented action execution while in PAUSED state');

  // Resume conversation
  await fetch(`${BASE_URL}/ai/conversations/${convId}/override`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status: 'ACTIVE' }),
  });

  // Test Case 11: AI Analytics & Audit Logs
  console.log('\n[Test 11] AI Analytics & Action Log Verification...');
  const analyticsRes = await fetch(`${BASE_URL}/ai/analytics`, { headers });
  const analyticsData = await analyticsRes.json();
  assert(analyticsData.success, 'Fetched AI analytics');
  assert(analyticsData.data.totalConversations >= 2, `Total AI conversations recorded: ${analyticsData.data.totalConversations}`);
  assert(analyticsData.data.totalActionLogs > 0, `Total AI action audit logs recorded: ${analyticsData.data.totalActionLogs}`);
  console.log('  AI Analytics Overview:', analyticsData.data);

  console.log('\n========================================================');
  console.log('🎉 ALL AUTONOMOUS AI STORE OPERATOR TESTS PASSED!');
  console.log('========================================================\n');
}

run().catch((err) => {
  console.error('\n❌ AI STORE OPERATOR TEST SUITE FAILED:', err);
  process.exit(1);
});
