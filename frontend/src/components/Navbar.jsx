import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShoppingBag,
  ExternalLink,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const Navbar = ({ setMobileOpen }) => {
  const { user, quickLogin } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef(null);
  const switcherRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.warn('Could not load notifications', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('newOrder', () => fetchNotifications());
      socket.on('newNotification', () => fetchNotifications());
      socket.on('inventoryUpdated', () => fetchNotifications());
    }
  }, [socket]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowRoleSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/orders?search=${encodeURIComponent(searchQuery)}`);
  };

  const switchRole = async (role) => {
    setShowRoleSwitcher(false);
    await quickLogin(role);
    if (role === 'DELIVERY') navigate('/delivery');
    else if (role === 'CUSTOMER') navigate('/store');
    else navigate('/dashboard');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search orders, SKU, phone, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* Right: Quick POS, Notifications, Role Switcher */}
      <div className="flex items-center gap-3">
        {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
          <button
            onClick={() => navigate('/pos')}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <span>POS Billing</span>
          </button>
        )}

        {/* Role Quick Switcher Demo Pill */}
        <div className="relative" ref={switcherRef}>
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{user?.role || 'Guest'}</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Switch Demo Role
              </div>
              <button
                onClick={() => switchRole('ADMIN')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
              >
                <span>Store Owner (Admin)</span>
                {user?.role === 'ADMIN' && <span className="text-emerald-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => switchRole('STAFF')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
              >
                <span>Staff / Cashier</span>
                {user?.role === 'STAFF' && <span className="text-emerald-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => switchRole('DELIVERY')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
              >
                <span>Delivery Partner</span>
                {user?.role === 'DELIVERY' && <span className="text-emerald-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => switchRole('CUSTOMER')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
              >
                <span>Customer</span>
                {user?.role === 'CUSTOMER' && <span className="text-emerald-600 font-bold">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        if (n.link) navigate(n.link);
                        setShowNotifs(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                        !n.isRead ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-700 mt-0.5">
                        {n.type === 'NEW_ORDER' && <ShoppingBag className="w-4 h-4 text-emerald-600" />}
                        {n.type === 'LOW_STOCK' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {n.type === 'OUT_OF_STOCK' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        {n.type === 'DELIVERY_COMPLETED' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        {!['NEW_ORDER', 'LOW_STOCK', 'OUT_OF_STOCK', 'DELIVERY_COMPLETED'].includes(n.type) && (
                          <Package className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
