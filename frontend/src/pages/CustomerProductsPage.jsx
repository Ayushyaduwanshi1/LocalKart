import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Percent,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import api from '../services/api';

const CustomerProductsPage = () => {
  const { cart, addToCart, updateQuantity } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStore = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/products/categories'),
        ]);

        if (prodRes.data.success) setProducts(prodRes.data.data);
        if (catRes.data.success) setCategories(catRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStore();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category?._id === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-600/10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Neighborhood Kirana Store
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
          Fresh Groceries & Daily Needs
        </h1>
        <p className="mt-2 text-emerald-100 text-xs sm:text-sm max-w-xl">
          Order authentic pulses, flours, dairy, edible oils, spices, and cleaning supplies. Packed fresh and delivered to your doorstep in 30 minutes!
        </p>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-3">
        <div className="relative max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search atta, dal, oil, biscuits, shampoo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c._id)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === c._id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredProducts.map((p) => {
          const cartItem = cart.find((item) => item.product._id === p._id);
          const isOut = p.stockQuantity <= 0;

          return (
            <div
              key={p._id}
              className={`bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                isOut ? 'opacity-50' : ''
              }`}
            >
              <div>
                <div className="h-32 w-full rounded-2xl overflow-hidden bg-slate-100 mb-2 relative">
                  <img
                    src={p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {p.discount > 0 && (
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg">
                      ₹{p.discount} OFF
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-semibold text-slate-400 block">{p.brand}</span>
                <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight mt-0.5">
                  {p.name}
                </h4>
                <span className="text-[10px] text-slate-400 mt-1 block font-medium">1 {p.unit}</span>
              </div>

              {/* Price & Add to Cart */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900">₹{p.sellingPrice}</span>
                </div>

                {isOut ? (
                  <span className="text-[10px] text-rose-500 font-bold">Out of stock</span>
                ) : cartItem ? (
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(p._id, cartItem.quantity - 1)}
                      className="w-5 h-5 bg-white text-emerald-800 rounded-lg flex items-center justify-center font-bold text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-emerald-900">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(p, 1)}
                      className="w-5 h-5 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(p, 1)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerProductsPage;
