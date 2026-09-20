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
  ExternalLink,
  CreditCard,
  Phone,
  Calendar,
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

  // Payment Recording State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'CANCELLED') {
      if (!window.confirm('Cancelling will automatically restore product inventory back to stock. Are you sure?')) {
        return;
      }
    }

    try {
      await api.patch(`/orders/${id}/status`, { orderStatus: newStatus });
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

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

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    if (amount > (order.remainingAmount || 0)) {
      alert(`Paid amount cannot exceed remaining balance of ₹${order.remainingAmount}`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      await api.post('/payments', {
        orderId: order._id,
        paidAmount: amount,
        paymentMethod: payMethod,
        notes: payNotes || `Payment recorded by staff`,
      });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayNotes('');
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsProcessingPayment(false);
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

  const remainingAmt = order.remainingAmount ?? Math.max(0, order.totalAmount - (order.paidAmount || 0));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
                {order.orderNumber}
              </h1>
              <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
              <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString('en-IN')} • Source: <span className="font-bold text-slate-700 uppercase">{order.orderSource}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/track-order/${order.orderNumber}`}
            target="_blank"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>Public Tracking</span>
          </Link>
          <button
            onClick={() => setShowReceipt(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Order Status Action Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Update Order Lifecycle Status:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {['CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              disabled={order.orderStatus === st}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                order.orderStatus === st
                  ? 'bg-slate-900 text-white shadow-sm cursor-default'
                  : st === 'CANCELLED'
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.sku ? `SKU: ${item.sku}` : ''} {item.unit ? `• Unit: ${item.unit}` : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">₹{item.price?.toFixed(2)} × {item.quantity}</p>
                    <p className="font-bold text-slate-900">₹{(item.total || item.price * item.quantity).toFixed(2)}</p>
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
              {order.roundOff !== undefined && order.roundOff !== 0 && (
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Round Off:</span>
                  <span>{order.roundOff > 0 ? `+₹${order.roundOff.toFixed(2)}` : `-₹${Math.abs(order.roundOff).toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-emerald-700">₹{order.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer, Payment & Delivery Info (1 col) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Customer Information
            </h3>
            <div>
              <p className="font-bold text-slate-800">{order.customer?.name || 'Walk-in Customer'}</p>
              <p className="text-slate-500 font-mono mt-0.5">{order.customer?.phone || '-'}</p>
              <p className="text-slate-500 mt-1">
                {order.deliveryAddress?.address || order.customer?.address || 'Walk-in Store Purchase'}
                {order.deliveryAddress?.pincode ? ` - ${order.deliveryAddress.pincode}` : ''}
              </p>
              {order.customer?.email && (
                <p className="text-slate-400 text-[11px] mt-0.5">{order.customer.email}</p>
              )}
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Payment Summary
              </h3>
              <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-slate-500">
                <span>Method:</span>
                <span className="font-bold text-slate-800">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900">₹{order.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid Amount:</span>
                <span className="font-bold text-emerald-600">₹{(order.paidAmount || 0).toFixed(2)}</span>
              </div>
              {remainingAmt > 0 && (
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-100">
                  <span>Balance Due:</span>
                  <span>₹{remainingAmt.toFixed(2)}</span>
                </div>
              )}
            </div>

            {remainingAmt > 0 && (
              <button
                onClick={() => {
                  setPayAmount(remainingAmt.toString());
                  setShowPaymentModal(true);
                }}
                className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                + Record Payment (₹{remainingAmt.toFixed(2)})
              </button>
            )}
          </div>

          {/* Delivery Dispatch Card */}
          {order.delivery && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  Delivery Dispatch
                </h3>
                <Badge variant={order.delivery.status}>{order.delivery.status}</Badge>
              </div>

              {order.delivery.deliveryPartner ? (
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Delivery Rider</span>
                  <p className="font-bold text-slate-800">{order.delivery.deliveryPartner.name}</p>
                  <p className="text-slate-500 font-mono">{order.delivery.deliveryPartner.phone}</p>
                  {order.delivery.deliveredAt && (
                    <p className="text-emerald-600 text-[11px] font-semibold mt-1">
                      Delivered at {new Date(order.delivery.deliveredAt).toLocaleString()}
                    </p>
                  )}
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
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
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
                      className="px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs"
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

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Record Payment for #{order.orderNumber}</h3>
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Amount (₹)*</label>
                <input
                  type="number"
                  step="any"
                  max={remainingAmt}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-800"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="ONLINE">ONLINE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Received via GPay"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {isProcessingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
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

