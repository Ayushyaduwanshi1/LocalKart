import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Truck,
  User,
  MapPin,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Badge from '../components/Badge';
import ReceiptModal from '../components/ReceiptModal';
import api from '../services/api';

const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [deliveryRiders, setDeliveryRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [storeSettings, setStoreSettings] = useState(null);

  const fetchDetails = async () => {
    try {
      const [orderRes, ridersRes, settingsRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get('/users?role=DELIVERY'),
        api.get('/settings'),
      ]);

      if (orderRes.data.success) {
        setOrder(orderRes.data.data);
      }
      if (ridersRes.data.success) setDeliveryRiders(ridersRes.data.data);
      if (settingsRes.data.success) setStoreSettings(settingsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleAssignRider = async () => {
    if (!order.delivery?._id || !selectedRider) return;

    try {
      await api.post(`/deliveries/${order.delivery._id}/assign`, {
        deliveryPartnerId: selectedRider,
      });
      fetchDetails();
      alert('Delivery partner assigned successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-center text-slate-400">Order not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Order {order.orderNumber}
            </h1>
            <p className="text-xs text-slate-500">
              Placed on {new Date(order.createdAt).toLocaleString()} via {order.orderSource}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowReceipt(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print Tax Invoice</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Order Items ({order.items?.length})</h3>
            <div className="divide-y divide-slate-100">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">{item.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || '-'}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">₹{item.price} × {item.quantity}</p>
                    <p className="font-bold text-slate-900">₹{item.total?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>₹{order.subtotal?.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{order.discount?.toFixed(2)}</span>
                </div>
              )}
              {order.gst > 0 && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>₹{order.gst?.toFixed(2)}</span>
                </div>
              )}
              {order.deliveryCharge > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>₹{order.deliveryCharge?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-emerald-700">₹{order.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Info (1 col) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Customer Information
            </h3>
            <div>
              <p className="font-semibold text-slate-800">{order.customer?.name}</p>
              <p className="text-slate-500 font-mono">{order.customer?.phone}</p>
              <p className="text-slate-500 mt-1">{order.deliveryAddress?.address || order.customer?.address || 'Walk-in Store Purchase'}</p>
            </div>
          </div>

          {/* Delivery Card */}
          {order.delivery && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3 text-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                Delivery Dispatch
              </h3>
              <div>
                <span className="text-slate-400 block text-[10px]">Status</span>
                <Badge variant={order.delivery.status}>{order.delivery.status}</Badge>
              </div>

              {order.delivery.deliveryPartner ? (
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Partner</span>
                  <p className="font-bold text-slate-800">{order.delivery.deliveryPartner.name}</p>
                  <p className="text-slate-500">{order.delivery.deliveryPartner.phone}</p>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Assign Delivery Rider:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedRider}
                      onChange={(e) => setSelectedRider(e.target.value)}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="">Select Rider</option>
                      {deliveryRiders.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignRider}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={order}
        settings={storeSettings}
      />
    </div>
  );
};

export default AdminOrderDetailPage;
