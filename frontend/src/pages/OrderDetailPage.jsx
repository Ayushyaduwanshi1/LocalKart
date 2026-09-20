import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  MapPin,
  Printer,
} from 'lucide-react';
import Badge from '../components/Badge';
import ReceiptModal from '../components/ReceiptModal';
import api from '../services/api';

const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${id}`);
        if (res.data.success) {
          setOrder(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

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

  // Visual tracking steps
  const steps = [
    { label: 'Order Confirmed', status: ['CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Order Packed', status: ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Out for Delivery', status: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Delivered', status: ['DELIVERED'] },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-xs">
      <div className="flex items-center justify-between">
        <Link
          to="/orders"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <button
          onClick={() => setShowReceipt(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>View Invoice</span>
        </button>
      </div>

      {/* Visual Tracking Progress Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tracking Timeline</span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">Order #{order.orderNumber}</h2>
          </div>
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
        </div>

        {/* Step Progression */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {steps.map((s, idx) => {
            const isPassed = s.status.includes(order.orderStatus);
            return (
              <div key={idx} className="text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1.5 font-bold ${
                    isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isPassed ? '✓' : idx + 1}
                </div>
                <span className={`text-[11px] font-semibold ${isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Ordered Items</h3>
        <div className="divide-y divide-slate-100">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{item.name}</p>
                <span className="text-slate-400 text-[10px]">₹{item.price} × {item.quantity}</span>
              </div>
              <span className="font-black text-slate-900">₹{item.total?.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-1 text-slate-500">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{order.subtotal?.toFixed(2)}</span>
          </div>
          {order.deliveryCharge > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>₹{order.deliveryCharge?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>Grand Total:</span>
            <span className="text-emerald-700">₹{order.totalAmount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={order}
      />
    </div>
  );
};

export default OrderDetailPage;
