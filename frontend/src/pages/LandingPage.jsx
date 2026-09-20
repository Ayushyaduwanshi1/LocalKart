import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Calculator,
  Truck,
  Boxes,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Store,
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Navbar */}
      <nav className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-600/20">
              LK
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">LocalKart</span>
              <span className="hidden sm:inline text-xs text-slate-500 font-medium ml-2">Neighborhood Store OS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-emerald-600 transition-colors"
            >
              Browse Grocery Store
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              Store Staff Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-6 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Modern POS & Kirana Store Management System
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
          Manage WhatsApp Orders, Walk-Ins & Inventory in <span className="text-emerald-600">One Place</span>.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          LocalKart empowers neighborhood general stores to streamline WhatsApp grocery requests, phone orders, high-speed POS billing, automated inventory deduction, and local delivery dispatch.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all flex items-center gap-2"
          >
            <span>Open Store Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/pos"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Launch POS Terminal</span>
          </Link>
          <Link
            to="/store"
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Customer Storefront</span>
          </Link>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-600 mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">WhatsApp Order Converter</h4>
            <p className="text-xs text-slate-500 mt-1">Paste customer WhatsApp messages directly into POS bill items.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-blue-50 text-blue-600 mb-2">
              <Boxes className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Real-Time Inventory</h4>
            <p className="text-xs text-slate-500 mt-1">Auto-deductions, low-stock warnings, and cancellation restorations.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-purple-50 text-purple-600 mb-2">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Delivery Dispatch</h4>
            <p className="text-xs text-slate-500 mt-1">Assign orders to delivery riders and track deliveries live.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-amber-50 text-amber-600 mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Profit & Sales Analytics</h4>
            <p className="text-xs text-slate-500 mt-1">Gross margins, daily trends, GST breakdowns & CSV exports.</p>
          </div>
        </div>
      </section>

      {/* Demo Credentials Helper Card */}
      <section className="py-12 bg-slate-100 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-xl font-bold text-slate-900">Ready to test? Pre-seeded with 50 products & accounts:</h3>
          <p className="text-xs text-slate-500 mt-1">Click below or use the 1-click switcher on the login page</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
              <span className="font-bold text-emerald-700 block">Store Owner (Admin)</span>
              <p className="text-slate-600 mt-1">admin@localkart.com</p>
              <p className="text-slate-400">Pass: Admin@12345</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
              <span className="font-bold text-blue-700 block">Staff / Cashier</span>
              <p className="text-slate-600 mt-1">staff1@localkart.com</p>
              <p className="text-slate-400">Pass: Staff@12345</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
              <span className="font-bold text-purple-700 block">Delivery Partner</span>
              <p className="text-slate-600 mt-1">delivery1@localkart.com</p>
              <p className="text-slate-400">Pass: Delivery@12345</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
              <span className="font-bold text-amber-700 block">Customer</span>
              <p className="text-slate-600 mt-1">customer1@localkart.com</p>
              <p className="text-slate-400">Pass: Customer@12345</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
