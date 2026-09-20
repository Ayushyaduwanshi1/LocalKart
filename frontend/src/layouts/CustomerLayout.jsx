import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, LogOut, Store, Clock, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <div className="bg-emerald-800 text-emerald-100 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-4">
        <span>⚡ Free delivery on orders above ₹499 in 30 mins!</span>
        <span className="hidden sm:inline">|</span>
        <span className="hidden sm:inline flex items-center gap-1">
          <Phone className="w-3.5 h-3.5" /> Call/WhatsApp: +91 98100 23456
        </span>
      </div>

      {/* Main Storefront Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/store" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              LK
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">LocalKart</span>
              <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Kirana & Grocery</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link to="/store" className="hover:text-emerald-600 transition-colors">Products</Link>
            {user && <Link to="/orders" className="hover:text-emerald-600 transition-colors">My Orders</Link>}
            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <Link to="/dashboard" className="text-emerald-600 font-bold hover:underline">
                Store Dashboard →
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span className="hidden sm:inline text-xs font-bold">Cart</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 p-2 rounded-xl hover:bg-slate-100"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    {user.name ? user.name[0] : 'U'}
                  </div>
                  <span className="hidden lg:inline">{user.name}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-500"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Customer Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-bold text-sm mb-2">LocalKart Neighborhood Store</h4>
            <p className="leading-relaxed text-slate-400">
              Delivering daily essentials, pantry staples, dairy, and household products right to your doorstep.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-2">Store Hours</h4>
            <p>Monday - Sunday: 7:00 AM - 10:30 PM</p>
            <p className="mt-1">Order on WhatsApp: +91 98100 23456</p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-2">Quick Switch Demo</h4>
            <p className="mb-2 text-slate-400">Log in as Store Owner or Cashier to manage stock & POS.</p>
            <Link to="/login" className="text-emerald-400 font-semibold hover:underline">
              Go to Employee / Admin Login →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
