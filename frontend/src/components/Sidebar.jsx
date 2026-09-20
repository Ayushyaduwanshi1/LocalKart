import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Calculator,
  Package,
  Boxes,
  Users,
  Truck,
  BarChart3,
  UserCog,
  Settings,
  Store,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Bike,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout, isAdmin, isStaff, isDelivery } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF'] },
    { label: 'POS Terminal', path: '/pos', icon: Calculator, roles: ['ADMIN', 'STAFF'], badge: 'POS' },
    { label: 'Orders', path: '/orders', icon: ShoppingCart, roles: ['ADMIN', 'STAFF'] },
    { label: 'Products', path: '/products', icon: Package, roles: ['ADMIN', 'STAFF'] },
    { label: 'Inventory', path: '/inventory', icon: Boxes, roles: ['ADMIN', 'STAFF'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['ADMIN', 'STAFF'] },
    { label: 'Deliveries', path: '/deliveries', icon: Truck, roles: ['ADMIN', 'STAFF'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN'] },
    { label: 'Staff Management', path: '/users', icon: UserCog, roles: ['ADMIN'] },
    { label: 'Store Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
    { label: 'Delivery Dashboard', path: '/delivery', icon: Bike, roles: ['DELIVERY'] },
  ];

  const allowedNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-bold text-xl">
              LK
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">LocalKart</h1>
              <p className="text-[11px] text-slate-400 font-medium">Store Management</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Store Ops
          </div>
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'hover:bg-slate-800 hover:text-white text-slate-300'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 opacity-80" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-emerald-700/80 text-emerald-100 rounded">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Public View
          </div>
          <NavLink
            to="/store"
            target="_blank"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 opacity-80" />
              <span>Customer Storefront</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </NavLink>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                <span className="inline-block text-[11px] font-medium text-emerald-400">
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
