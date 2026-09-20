import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  IndianRupee,
  Smartphone,
  Phone,
  MessageSquare,
  User,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import WhatsAppOrderModal from '../components/WhatsAppOrderModal';
import api from '../services/api';

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart / Bill State
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [orderSource, setOrderSource] = useState('WALK_IN');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [notes, setNotes] = useState('');

  // Customer State
  const [customers, setCustomers] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerFound, setCustomerFound] = useState(false);

  // Modals & Confirmation
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [storeSettings, setStoreSettings] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const barcodeInputRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [prodRes, catRes, custRes, settingsRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/products/categories'),
        api.get('/customers?limit=100'),
        api.get('/settings'),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (settingsRes.data.success) setStoreSettings(settingsRes.data.data);
    } catch (err) {
      console.error('Failed to load initial POS data:', err);
    }
  };

  // Fast Phone Lookup
  const handlePhoneLookup = async (phoneToLook) => {
    setCustomerPhone(phoneToLook);
    const clean = phoneToLook.replace(/[^0-9]/g, '');
    if (clean.length >= 10) {
      try {
        const res = await api.get(`/customers/lookup/${clean}`);
        if (res.data.success && res.data.data) {
          const cust = res.data.data;
          setSelectedCustomerId(cust._id);
          setCustomerName(cust.name);
          setCustomerAddress(cust.address || '');
          setCustomerFound(true);
        }
      } catch (err) {
        // Customer not found: keep name blank for inline creation
        setCustomerFound(false);
        setSelectedCustomerId('');
      }
    }
  };

  // Add Product to Cart
  const handleAddToCart = (product) => {
    if (product.stockQuantity <= 0) {
      alert(`"${product.name}" is OUT OF STOCK. Available: 0 ${product.unit}`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          alert(`Cannot add more than available stock (${product.stockQuantity} ${product.unit})`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  // Fast Barcode Scanner Handler
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) =>
        p.barcode === barcodeInput.trim() ||
        p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      handleAddToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No product found with Barcode/SKU "${barcodeInput}"`);
    }
  };

  // Modify quantity
  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    const product = products.find((p) => p._id === productId);
    if (product && newQty > product.stockQuantity) {
      alert(`Insufficient stock! Only ${product.stockQuantity} ${product.unit} available.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product._id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setDeliveryCharge(0);
    setPaidAmountInput('');
    setErrorMessage('');
  };

  // Bulk add from WhatsApp modal
  const handleAddItemsFromWhatsApp = (itemsToAdd) => {
    itemsToAdd.forEach(({ product, quantity }) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.product._id === product._id);
        if (existing) {
          return prev.map((item) =>
            item.product._id === product._id
              ? { ...item, quantity: Math.min(product.stockQuantity, item.quantity + quantity) }
              : item
          );
        }
        return [...prev, { product, quantity: Math.min(product.stockQuantity, quantity), discount: 0 }];
      });
    });
    setOrderSource('WHATSAPP');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const gstTotal = cart.reduce((sum, item) => {
    const itemTotal = item.product.sellingPrice * item.quantity;
    const itemGstRate = item.product.gst || 0;
    return sum + (itemTotal * itemGstRate) / 100;
  }, 0);
  const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0) + gstTotal + Number(deliveryCharge || 0));

  // Actual paid amount: if user entered an amount, use that, else default to full grandTotal (or 0 for COD)
  const effectivePaidAmount = paidAmountInput !== ''
    ? Math.max(0, Number(paidAmountInput))
    : (paymentMethod === 'COD' ? 0 : grandTotal);

  // Submit Order
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Please add at least one product to the bill.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerId: selectedCustomerId || undefined,
        customerData: !selectedCustomerId
          ? {
              name: customerName || 'Walk-in Customer',
              phone: customerPhone || '9876543210',
              address: customerAddress,
            }
          : undefined,
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          discount: item.discount || 0,
        })),
        discount: Number(discountAmount || 0),
        deliveryCharge: Number(deliveryCharge || 0),
        paymentMethod,
        paidAmount: effectivePaidAmount,
        orderStatus: 'CONFIRMED',
        orderSource,
        deliveryAddress: customerAddress ? { address: customerAddress, phone: customerPhone } : undefined,
        notes,
      };

      const res = await api.post('/orders', orderPayload);
      if (res.data.success) {
        setCompletedOrder(res.data.data);
        setShowReceipt(true);
        handleClearCart();
        setCustomerPhone('');
        setCustomerName('');
        setCustomerAddress('');
        setSelectedCustomerId('');
        fetchInitialData(); // Refresh stock numbers from DB
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.availableStock !== undefined) {
        setErrorMessage(`${respData.message} (Available in stock: ${respData.availableStock})`);
      } else {
        setErrorMessage(respData?.message || 'Failed to process order');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category?._id === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode?.includes(productSearch);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6.5rem)]">
      {/* Left Column: Catalog & Barcode & Quick Search (60%) */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Item Catalog
            </span>
            <span className="text-xs text-slate-400">({filteredProducts.length} items)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paste WhatsApp Order</span>
            </button>
          </div>
        </div>

        {/* Search & Barcode Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan Barcode / Enter SKU..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </form>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c._id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c._id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pt-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stockQuantity <= 0;
            const isLowStock = p.stockQuantity <= p.minimumStockLevel && !isOutOfStock;

            return (
              <button
                key={p._id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => handleAddToCart(p)}
                className={`text-left p-3 rounded-2xl border transition-all flex flex-col justify-between relative group ${
                  isOutOfStock
                    ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="h-20 w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                    {p.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{p.brand}</span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-700">₹{p.sellingPrice}</span>
                    <span className="text-[9px] text-slate-400 block">/{p.unit}</span>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isOutOfStock
                        ? 'bg-rose-100 text-rose-700'
                        : isLowStock
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isOutOfStock ? 'Out of Stock' : `Available: ${p.stockQuantity} ${p.unit}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Billing & Cart Drawer (40%) */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 overflow-hidden">
        {/* Customer Header */}
        <div className="pb-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              Customer Details
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Source:</span>
              <select
                value={orderSource}
                onChange={(e) => setOrderSource(e.target.value)}
                className="bg-slate-100 font-semibold text-slate-700 rounded-lg px-2 py-0.5 focus:outline-none"
              >
                <option value="WALK_IN">Walk-In</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHONE">Phone Call</option>
                <option value="WEBSITE">Website</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <input
                type="text"
                placeholder="Phone (e.g. 9811012345)"
                value={customerPhone}
                onChange={(e) => handlePhoneLookup(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {orderSource !== 'WALK_IN' && (
            <div>
              <input
                type="text"
                placeholder="Delivery Address / Apartment / Sector..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Bill is currently empty</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click products on the left or scan barcode</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product._id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-slate-800 truncate">{item.product.name}</h5>
                  <span className="text-[10px] text-slate-400">
                    ₹{item.product.sellingPrice} × {item.quantity} {item.product.unit}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateQty(item.product._id, item.quantity - 1)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-slate-800">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQty(item.product._id, item.quantity + 1)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-16 text-right font-bold text-slate-900">
                  ₹{(item.product.sellingPrice * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => handleRemoveItem(item.product._id)}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations & Checkout */}
        <div className="pt-3 border-t border-slate-200/80 space-y-2 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500">Discount:</span>
              <span className="text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-transparent font-bold text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500">Delivery:</span>
              <span className="text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                className="w-full bg-transparent font-bold text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Est. GST Tax:</span>
            <span>₹{gstTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Grand Total:</span>
            <span className="text-emerald-600 text-lg">₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            {['CASH', 'UPI', 'CARD', 'COD'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setPaymentMethod(method);
                  if (method === 'COD') setPaidAmountInput('0');
                  else if (paidAmountInput === '0') setPaidAmountInput('');
                }}
                className={`py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                  paymentMethod === method
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Partial Payment Input */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-semibold">Amount Received / Paid:</span>
              <div className="flex items-center gap-1 w-28">
                <span className="text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  step="any"
                  placeholder={grandTotal.toFixed(2)}
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 font-bold text-xs text-right focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            {effectivePaidAmount < grandTotal && (
              <div className="flex justify-between text-[11px] font-semibold text-rose-600 pt-0.5 border-t border-slate-200/60">
                <span>Remaining Balance Due:</span>
                <span>₹{(grandTotal - effectivePaidAmount).toFixed(2)}</span>
              </div>
            )}
            {effectivePaidAmount >= grandTotal && grandTotal > 0 && (
              <div className="flex justify-between text-[10px] text-emerald-600 font-medium pt-0.5">
                <span>Status: Full Payment</span>
                <span className="font-bold">PAID</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleClearCart}
              title="Reset Bill"
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'Charging...' : `Charge ₹${grandTotal.toFixed(2)} & Print`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={completedOrder}
        settings={storeSettings}
      />

      {/* WhatsApp Helper Modal */}
      <WhatsAppOrderModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        products={products}
        onAddItems={handleAddItemsFromWhatsApp}
      />
    </div>
  );
};

export default POSPage;
