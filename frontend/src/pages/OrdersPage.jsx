import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Filter,
  Printer,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Truck,
  RefreshCw,
} from 'lucide-react';
import Badge from '../components/Badge';
import ReceiptModal from '../components/ReceiptModal';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const OrdersPage = () => {
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Receipt Modal
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 50,
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('orderStatus', statusFilter);
      if (sourceFilter) params.append('orderSource', sourceFilter);
      if (paymentFilter) params.append('paymentStatus', paymentFilter);

      const [res, setRes] = await Promise.all([
        api.get(`/orders?${params.toString()}`),
        api.get('/settings'),
      ]);

      if (res.data.success) {
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      }
      if (setRes.data.success) setStoreSettings(setRes.data.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (socket) {
      socket.on('newOrder', () => fetchOrders());
      socket.on('orderUpdated', () => fetchOrders());
    }
  }, [page, statusFilter, sourceFilter, paymentFilter, socket]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'CANCELLED') {
      if (!window.confirm('Cancelling will restore product inventory automatically. Proceed?')) {
        return;
      }
    }

    try {
      await api.patch(`/orders/${orderId}/status`, { orderStatus: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  const handlePrintClick = (order) => {
    setSelectedOrderForPrint(order);
    setShowReceipt(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-xs text-slate-500 mt-1">Fulfill orders from WhatsApp, phone, walk-in, and online</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/pos"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            + Create POS Order
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order number or customer phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Order Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="PACKED">PACKED</option>
            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Order Sources</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PHONE">Phone Call</option>
            <option value="WALK_IN">Walk-In</option>
            <option value="WEBSITE">Website</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Payment States</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Channel / Source</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Order Status</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">No orders found matching criteria.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <Link
                        to={`/orders/${order._id}`}
                        className="font-bold text-slate-900 hover:text-emerald-600 block"
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{order.customer?.name || 'Walk-in'}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{order.customer?.phone}</span>
                    </td>

                    <td className="p-3.5 text-slate-600">
                      <span>{order.items?.length} items</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                        {order.items?.map((i) => i.name).join(', ')}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <Badge variant={order.orderSource}>{order.orderSource}</Badge>
                    </td>

                    <td className="p-3.5">
                      <span className="font-medium text-slate-800">{order.paymentMethod}</span>
                      <span className="block text-[10px]">
                        <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
                      </span>
                    </td>

                    <td className="p-3.5">
                      <select
                        value={order.orderStatus}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="p-1 rounded-lg border border-slate-200 bg-white font-semibold text-xs focus:outline-none"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="PACKED">PACKED</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>

                    <td className="p-3.5 text-right font-black text-slate-900 text-sm">
                      ₹{order.totalAmount?.toFixed(2)}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintClick(order)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/orders/${order._id}`}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={selectedOrderForPrint}
        settings={storeSettings}
      />
    </div>
  );
};

export default OrdersPage;
