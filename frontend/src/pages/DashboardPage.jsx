import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Users,
  AlertTriangle,
  PackageX,
  Truck,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  CreditCard,
  Smartphone,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

const DashboardPage = () => {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();

    if (socket) {
      socket.on('newOrder', () => fetchDashboardStats());
      socket.on('orderUpdated', () => fetchDashboardStats());
      socket.on('inventoryUpdated', () => fetchDashboardStats());
      socket.on('deliveryUpdated', () => fetchDashboardStats());
    }
  }, [socket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const { cards, charts, lists } = data || {
    cards: {},
    charts: { dailySales: [], topProducts: [], orderStatus: [], paymentMethods: [] },
    lists: { recentOrders: [], lowStockProducts: [], pendingDeliveries: [], recentCustomers: [] },
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Store Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Live analytics & neighborhood Kirana operations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardStats}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/pos"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <span>+ New POS Bill</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`₹${cards.todaySales?.toLocaleString('en-IN') || 0}`}
          subtitle={`${cards.todayOrders || 0} orders today`}
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          title="Pending Orders"
          value={cards.pendingOrders || 0}
          subtitle="Awaiting packing or delivery"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Completed Orders"
          value={cards.completedOrders || 0}
          subtitle={`${cards.totalOrders || 0} lifetime orders`}
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Total Customers"
          value={cards.totalCustomers || 0}
          subtitle="Registered customer profiles"
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Payment Collections Breakdown Row */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Collections & Balances</h3>
              <p className="text-[11px] text-slate-500">Real-time payment tracking across cash, UPI, card and pending COD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Today Collected:</span>
            <span className="text-sm font-black text-emerald-600">
              ₹{(cards.todayCollectedPayment || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Today's Paid</span>
            <p className="text-base font-extrabold text-emerald-800 mt-0.5">
              ₹{(cards.todayCollectedPayment || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] text-emerald-600">Settled today</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/70">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Total Pending</span>
            <p className="text-base font-extrabold text-rose-800 mt-0.5">
              ₹{(cards.totalPendingPayment || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] text-rose-600">Across pending orders</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <span>Cash</span>
              <IndianRupee className="w-3 h-3 text-emerald-600" />
            </div>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">
              ₹{(cards.cashCollection || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] text-slate-400">Cash in drawer</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              <span>UPI / QR</span>
              <Smartphone className="w-3 h-3 text-blue-600" />
            </div>
            <p className="text-base font-extrabold text-blue-900 mt-0.5">
              ₹{(cards.upiCollection || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] text-blue-500">Digital settlements</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              <span>Card (POS)</span>
              <CreditCard className="w-3 h-3 text-purple-600" />
            </div>
            <p className="text-base font-extrabold text-purple-900 mt-0.5">
              ₹{(cards.cardCollection || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] text-purple-500">Debit / Credit card</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              <span>COD Due</span>
              <Truck className="w-3 h-3 text-amber-600" />
            </div>
            <p className="text-base font-extrabold text-amber-900 mt-0.5">
              ₹{(cards.codPending || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] text-amber-600">Pending rider collection</span>
          </div>
        </div>
      </div>

      {/* Secondary Alerts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800">Low Stock Warning</span>
            <h4 className="text-xl font-bold text-amber-900 mt-0.5">{cards.lowStockProducts || 0} Products</h4>
            <Link to="/inventory?status=low_stock" className="text-[11px] font-bold text-amber-700 hover:underline mt-1 inline-block">
              Restock Items →
            </Link>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800">Out of Stock</span>
            <h4 className="text-xl font-bold text-rose-900 mt-0.5">{cards.outOfStockProducts || 0} Products</h4>
            <Link to="/inventory?status=out_of_stock" className="text-[11px] font-bold text-rose-700 hover:underline mt-1 inline-block">
              Update Inventory →
            </Link>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
            <PackageX className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-800">Active Deliveries</span>
            <h4 className="text-xl font-bold text-purple-900 mt-0.5">{cards.pendingDeliveries || 0} Pending</h4>
            <Link to="/deliveries" className="text-[11px] font-bold text-purple-700 hover:underline mt-1 inline-block">
              View Dispatch Board →
            </Link>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (Last 7 Days) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Sales Revenue (₹)</h3>
              <p className="text-xs text-slate-400">Revenue over the past 7 days</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.dailySales || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val) => [`₹${val}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Payment Methods</h3>
            <p className="text-xs text-slate-400">UPI, Cash, Card, COD</p>
          </div>
          <div className="h-56 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.paymentMethods || []}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {(charts.paymentMethods || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products & Order Status Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Top Selling Products</h3>
            <p className="text-xs text-slate-400">By gross revenue generated</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topProducts || []} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="_id" type="category" width={80} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Order Status Breakdown</h3>
            <p className="text-xs text-slate-400">Total orders categorized by current state</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.orderStatus || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Tables (Recent Orders & Low Stock Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Orders</h3>
              <p className="text-xs text-slate-400">Latest transactions across all channels</p>
            </div>
            <Link to="/orders" className="text-xs font-bold text-emerald-600 hover:underline">
              View All Orders →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(lists.recentOrders || []).map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      <Link to={`/orders/${order._id}`} className="hover:text-emerald-600">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-700">
                      <div>{order.customer?.name || 'Walk-in'}</div>
                      <span className="text-[10px] text-slate-400">{order.customer?.phone}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={order.orderSource}>{order.orderSource}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{order.totalAmount?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Low Stock Alerts</h3>
              <p className="text-xs text-slate-400">Needs immediate reorder</p>
            </div>
            <Link to="/inventory" className="text-xs font-bold text-amber-600 hover:underline">
              Inventory →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(lists.lowStockProducts || []).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No low stock items!</div>
            ) : (
              (lists.lowStockProducts || []).map((prod) => (
                <div key={prod._id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                  <div>
                    <p className="font-semibold text-slate-800 line-clamp-1">{prod.name}</p>
                    <span className="text-[10px] text-slate-400">Min: {prod.minimumStockLevel} {prod.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                      {prod.stockQuantity} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
