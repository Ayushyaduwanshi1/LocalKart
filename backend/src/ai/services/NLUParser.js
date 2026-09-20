/**
 * Advanced Multi-lingual Natural Language Entity & Intent Parser
 * Supports English, Hindi, and Hinglish for Indian neighborhood general store commerce.
 */

// Vocabulary maps for Hindi / Hinglish grocery terms
const HINDI_NUMBER_WORDS = {
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  aadha: 0.5,
  adha: 0.5,
  derh: 1.5,
  dedh: 1.5,
  dhai: 2.5,
};

const UNIT_SYNONYMS = {
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  g: 'g',
  gm: 'g',
  gram: 'g',
  grams: 'g',
  l: 'L',
  ltr: 'L',
  litre: 'L',
  liter: 'L',
  litres: 'L',
  packet: 'packet',
  packets: 'packet',
  pkt: 'packet',
  pkts: 'packet',
  pouch: 'pouch',
  bottle: 'bottle',
  bottles: 'bottle',
  piece: 'piece',
  pcs: 'piece',
  pc: 'piece',
  can: 'can',
  cans: 'can',
  box: 'box',
  dabba: 'box',
};

const COMMON_GROCERY_KEYWORDS = [
  'rice', 'chawal', 'basmati',
  'oil', 'tel', 'mustard', 'sunflower', 'sarso', 'ghee',
  'milk', 'doodh', 'dudh', 'taaza', 'toned',
  'biscuit', 'biscuits', 'biskut', 'parle-g', 'good day', 'oreo',
  'atta', 'aata', 'flour', 'wheat', 'chakki',
  'sugar', 'cheeni', 'chini',
  'tea', 'chai', 'patti', 'coffee',
  'salt', 'namak',
  'dal', 'daal', 'toor', 'chana', 'moong',
  'paneer', 'butter', 'makhan', 'curd', 'dahi',
  'soap', 'sabun', 'surf', 'detergent', 'shampoo',
  'noodle', 'noodles', 'maggi', 'chips', 'namkeen', 'bhujia',
];

/**
 * Detect user intent from natural language message
 */
const detectIntent = (text) => {
  const lower = (text || '').toLowerCase().trim();

  // Confirmation intents
  if (/^(haan|ha|yes|yep|yeah|sahi hai|theek hai|confirm|kar do|kar dena|bhej do|done|ok|okay)\b/i.test(lower) && lower.split(' ').length <= 4) {
    return 'CONFIRM_ORDER';
  }

  // Rejection / Cancel draft intents
  if (/^(nahi|no|cancel|mat karo|rehne do|reject|nah)\b/i.test(lower) && lower.split(' ').length <= 4) {
    return 'REJECT_ACTION';
  }

  // Conversational order modification
  if (/hata do|remove|hatao|replace|badle|add kar|aur daal|change|badal/i.test(lower)) {
    return 'MODIFY_ORDER';
  }

  // Re-order previous order
  if (/last order|pichla order|pichli baar|purana order|repeat|wahi fir se|same order/i.test(lower)) {
    return 'REORDER_PREVIOUS_ORDER';
  }

  // Order cancellation
  if (/cancel order|order cancel|order radd|cancel kar do/i.test(lower)) {
    return 'CANCEL_ORDER';
  }

  // Order status & tracking
  if (/order kaha|order status|order kab|track order|kaha tak pahucha|deliver kab|mera order/i.test(lower)) {
    return 'GET_ORDER_STATUS';
  }

  // Payment status or statement
  if (/payment status|kitna baki|baki kitna|payment ho gaya|payment kar diya|upi kar diya|paise de diye/i.test(lower)) {
    return 'CHECK_PAYMENT';
  }

  // Owner analytics commands
  if (/low stock|stock kam|khatam hone|out of stock/i.test(lower)) {
    return 'LOW_STOCK_QUERY';
  }
  if (/sales|kamai|aaj ka sale|today sales|aaj kitna bika/i.test(lower)) {
    return 'CHECK_SALES';
  }
  if (/stock kitna hai|kitna stock|bache hain|stock check/i.test(lower) && !/bhej do|dena|chahiye/i.test(lower)) {
    return 'CHECK_STOCK';
  }
  if (/stock (badha|increase|daal|add)/i.test(lower)) {
    return 'ADJUST_STOCK';
  }

  // Delivery tracking
  if (/delivery kaha|rider kaha|delivery status/i.test(lower)) {
    return 'TRACK_DELIVERY';
  }

  // Store hours / policy
  if (/dukan kab|store hours|open hai|khula hai|timing/i.test(lower)) {
    return 'CHECK_STORE_HOURS';
  }

  // General order placement (contains food/grocery names or buy verbs)
  const hasGroceryWord = COMMON_GROCERY_KEYWORDS.some((kw) => lower.includes(kw));
  const hasOrderVerb = /bhej do|bhejo|dena|chahiye|mangwana|pack kar|order|deliver/i.test(lower);

  if (hasGroceryWord || hasOrderVerb) {
    return 'CREATE_ORDER';
  }

  return 'UNKNOWN';
};

/**
 * Extract grocery items, quantities, and units from natural text
 */
const extractOrderItems = (text) => {
  const lower = (text || '').toLowerCase().trim();
  const items = [];

  // Split by common delimiters like comma, "aur", "and", "plus", "+"
  const clauses = lower.split(/,| aur |\band\b|\bplus\b|\+|\n/);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    // Pattern 1: Number + Unit + Product (e.g. "2 kg basmati rice", "1 litre oil", "3 packet biscuit")
    const match1 = trimmed.match(/(\d+(?:\.\d+)?|\b(?:ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das|aadha|adha|derh|dhai)\b)\s*(kg|kilo|kilos|kgs|kilogram|g|gm|gram|grams|l|ltr|litre|liter|litres|packet|packets|pkt|pkts|pouch|bottle|bottles|can|piece|pcs|pc|dabba)?\s+([a-zA-Z0-9\s\-]+)/i);

    // Pattern 2: Unit + Number (e.g. "rice 2 kg", "oil 1 l")
    const match2 = trimmed.match(/([a-zA-Z\s\-]+)\s+(\d+(?:\.\d+)?|\b(?:ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das)\b)\s*(kg|kilo|kilos|kgs|kilogram|g|gm|gram|grams|l|ltr|litre|liter|litres|packet|packets|pkt|pkts|pouch|bottle|bottles|can|piece|pcs|pc)?/i);

    if (match1) {
      let rawQty = match1[1].toLowerCase();
      let rawUnit = (match1[2] || '').toLowerCase();
      let rawProduct = match1[3].trim();

      // Clean up common suffix verbs from product name (e.g. "bhej do", "dena", "chahiye", "add kar do")
      rawProduct = rawProduct
        .replace(/\b(bhej do|bhej dena|bhejo|dena|dedo|de do|chahiye|mangwana|pack kar do|deliver kar dena|add kar do|add kar dena|add kar|daal do|daal dena)\b/gi, '')
        .trim();

      let quantity = parseFloat(rawQty);
      if (isNaN(quantity) && HINDI_NUMBER_WORDS[rawQty] !== undefined) {
        quantity = HINDI_NUMBER_WORDS[rawQty];
      }
      if (isNaN(quantity)) quantity = 1;

      const unit = UNIT_SYNONYMS[rawUnit] || (rawUnit ? rawUnit : 'piece');

      if (rawProduct && rawProduct.length >= 2) {
        items.push({
          rawName: rawProduct,
          quantity,
          unit,
        });
      }
    } else if (match2) {
      let rawProduct = match2[1].trim();
      let rawQty = match2[2].toLowerCase();
      let rawUnit = (match2[3] || '').toLowerCase();

      rawProduct = rawProduct
        .replace(/\b(bhej do|bhej dena|bhejo|dena|dedo|de do|chahiye|mangwana|pack kar do|deliver kar dena)\b/gi, '')
        .trim();

      let quantity = parseFloat(rawQty);
      if (isNaN(quantity) && HINDI_NUMBER_WORDS[rawQty] !== undefined) {
        quantity = HINDI_NUMBER_WORDS[rawQty];
      }
      if (isNaN(quantity)) quantity = 1;

      const unit = UNIT_SYNONYMS[rawUnit] || (rawUnit ? rawUnit : 'piece');

      if (rawProduct && rawProduct.length >= 2) {
        items.push({
          rawName: rawProduct,
          quantity,
          unit,
        });
      }
    } else {
      // Fallback: check if clause contains any known product keyword without explicit numbers
      for (const kw of COMMON_GROCERY_KEYWORDS) {
        if (trimmed.includes(kw)) {
          items.push({
            rawName: kw,
            quantity: 1,
            unit: 'piece',
          });
          break;
        }
      }
    }
  }

  return items;
};

/**
 * Check if message mentions home delivery or address
 */
const extractDeliveryPreferences = (text) => {
  const lower = (text || '').toLowerCase();
  const deliveryRequired = /ghar pe|home deliver|delivery|deliver|bhej dena|bhejo|address par/i.test(lower);
  const useSavedAddress = /same address|saved address|purane address|wahi address/i.test(lower);

  return {
    deliveryRequired,
    useSavedAddress,
  };
};

/**
 * Check if customer mentions payment preference
 */
const extractPaymentMethod = (text) => {
  const lower = (text || '').toLowerCase();
  if (/cash on delivery|cod|cash dena/i.test(lower)) return 'COD';
  if (/upi|google pay|phonepe|paytm|gpay/i.test(lower)) return 'UPI';
  if (/card|debit|credit/i.test(lower)) return 'CARD';
  if (/cash|rokad/i.test(lower)) return 'CASH';
  if (/online/i.test(lower)) return 'ONLINE';
  return 'COD'; // Default
};

module.exports = {
  detectIntent,
  extractOrderItems,
  extractDeliveryPreferences,
  extractPaymentMethod,
};
