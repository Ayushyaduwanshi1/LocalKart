import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartSubtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const freeDeliveryThreshold = 499;
  const deliveryFee = cartSubtotal >= freeDeliveryThreshold || cartSubtotal === 0 ? 0 : 30;
  const grandTotal = cartSubtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Your basket is empty</h2>
        <p className="text-xs text-slate-500">Add fresh groceries and daily essentials to get started.</p>
        <Link
          to="/store"
          className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
        >
          Browse Store Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Shopping Basket</h1>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:underline"
        >
          Empty Basket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 divide-y divide-slate-100">
          {cart.map((item) => (
            <div key={item.product._id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={item.product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80'}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="truncate">
                  <h4 className="font-bold text-slate-900 truncate">{item.product.name}</h4>
                  <span className="text-[10px] text-slate-400">₹{item.product.sellingPrice} per {item.product.unit}</span>
                </div>
              </div>

              {/* Quantity Changer */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                  className="w-6 h-6 bg-white rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-bold text-slate-800">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                  className="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="w-20 text-right font-black text-slate-900 text-sm">
                ₹{(item.product.sellingPrice * item.quantity).toFixed(2)}
              </div>

              <button
                onClick={() => removeFromCart(item.product._id)}
                className="p-1.5 text-slate-300 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary Card (1 col) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4 h-fit text-xs">
          <h3 className="font-bold text-sm text-slate-900">Order Bill Summary</h3>

          <div className="space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-slate-800">₹{cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className={deliveryFee === 0 ? 'text-emerald-600 font-bold' : 'text-slate-800'}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>
            {cartSubtotal < freeDeliveryThreshold && (
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-100">
                Add ₹{(freeDeliveryThreshold - cartSubtotal).toFixed(2)} more for FREE Delivery!
              </p>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>To Pay:</span>
              <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <span>Proceed to Delivery & Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
