import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PackageCheck,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Phone,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Store,
  Calendar,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', desc: 'Order received by store' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Accepted & stock verified' },
  { key: 'PACKED', label: 'Packed', desc: 'Goods bagged & ready for pickup' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider is on the way' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Delivered to your doorstep' },
];

const OrderTrackingPage = () => {
  const { orderNumber } = useParams();
  const { socket } = useSocket();
  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/orders/track/${orderNumber}`);
      if (res.data.success) {
        setOrder(res.data.data.order);
        setDelivery(res.data.data.delivery);
        setStore(res.data.data.store);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to locate order. Please check the order number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      fetchTrackingData();
    }
  }, [orderNumber]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket || !orderNumber) return;

    const handleOrderUpdate = (updatedOrder) => {
      if (
        updatedOrder?.orderNumber === orderNumber ||
        (order?._id && updatedOrder?._id === order._id)
      ) {
        fetchTrackingData();
      }
    };

    const handleDeliveryUpdate = (updatedDelivery) => {
      if (
        order?._id &&
        (updatedDelivery?.order === order._id || updatedDelivery?.order?._id === order._id)
      ) {
        fetchTrackingData();
      }
    };

    socket.on('orderUpdated', handleOrderUpdate);
    socket.on('deliveryUpdated', handleDeliveryUpdate);

    return () => {
      socket.off('orderUpdated', handleOrderUpdate);
      socket.off('deliveryUpdated', handleDeliveryUpdate);
    };
  }, [socket, orderNumber, order?._id]);

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PACKED':
        return 2;
      case 'OUT_FOR_DELIVERY':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-700">Locating your order #{orderNumber}...</p>
          <p className="text-xs text-slate-400">Connecting to live store tracking</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
            <p className="text-xs text-slate-500 mt-1">{error || `No active order found matching #${orderNumber}`}</p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={fetchTrackingData}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Try Again
            </button>
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
            >
              Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.orderStatus === 'CANCELLED';
  const currentStepIdx = getStepIndex(order.orderStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Store Topbar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
              LK
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">
                {store?.storeName || 'LocalKart Store'}
              </h1>
              <p className="text-[11px] text-slate-500">
                {store?.city || 'Neighborhood Kirana'} • {store?.phone || '+91 98100 23456'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTrackingData}
              title="Refresh order status"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">Live Refresh</span>
            </button>
            <Link
              to="/"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Store</span>
            </Link>
          </div>
        </div>

        {/* Order Headline Hero Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 tracking-wider uppercase">
                Order Tracking
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                  #{order.orderNumber}
                </h2>
                {order.invoiceNumber && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                    {order.invoiceNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex flex-col sm:items-end">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isCancelled
                    ? 'bg-rose-100 text-rose-700'
                    : order.orderStatus === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {order.orderStatus.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                Last checked: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Cancelled Banner */}
          {isCancelled ? (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">Order Cancelled</h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  This order has been cancelled and any reserved inventory has been restored back to store stock.
                </p>
              </div>
            </div>
          ) : (
            /* Visual Progress Stepper */
            <div className="mt-8">
              <div className="relative">
                {/* Horizontal Progress Bar Track */}
                <div className="hidden sm:block absolute top-4 left-6 right-6 h-1 bg-slate-100 -z-0">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                    style={{
                      width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Steps List */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                  {STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:text-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all duration-300 ${
                            isCurrent
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md scale-110'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent
                                ? 'text-emerald-700'
                                : isDone
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delivery Partner Details (If Assigned) */}
        {delivery && delivery.deliveryPartner && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Assigned Delivery Partner
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {delivery.deliveryPartner.name}
                </h4>
                <p className="text-xs text-slate-500">
                  Status: <span className="font-semibold text-slate-800">{delivery.status?.replace(/_/g, ' ')}</span>
                  {delivery.deliveredAt && (
                    <span className="text-emerald-600 font-semibold ml-2">
                      • Delivered at {new Date(delivery.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {delivery.deliveryPartner.phone && (
              <a
                href={`tel:${delivery.deliveryPartner.phone}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Rider ({delivery.deliveryPartner.phone})</span>
              </a>
            )}
          </div>
        )}

        {/* Two-Column Grid: Delivery Address & Payment Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer & Address Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Customer & Delivery Destination</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 pt-1">
              <p className="font-bold text-slate-900">{order.customer?.name || 'Valued Customer'}</p>
              <p>Phone: {order.customer?.phone || '-'}</p>
              <p className="text-slate-500">
                Address: {order.deliveryAddress?.address || order.customer?.address || 'Store Pickup / Walk-in'}
              </p>
              <p className="text-[10px] text-slate-400 pt-1">
                Order Source: <span className="font-semibold uppercase text-slate-700">{order.orderSource}</span>
              </p>
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payment Summary</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-700'
                    : order.paymentStatus === 'PARTIALLY_PAID'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div className="text-xs space-y-1.5 pt-1">
              <div className="flex justify-between text-slate-500">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-800">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900">₹{order.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid Amount:</span>
                <span className="font-semibold text-emerald-600">₹{(order.paidAmount ?? (order.paymentStatus === 'PAID' ? order.totalAmount : 0)).toFixed(2)}</span>
              </div>
              {order.remainingAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-100">
                  <span>Balance Due:</span>
                  <span>₹{order.remainingAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Order Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Ordered Items ({order.items?.length || 0})</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <h5 className="font-semibold text-slate-900">{item.name}</h5>
                  <span className="text-[10px] text-slate-400">
                    ₹{item.price?.toFixed(2)} × {item.quantity} {item.unit || 'PCS'}
                    {item.gstRate > 0 && ` (GST ${item.gstRate}%)`}
                  </span>
                </div>
                <div className="font-bold text-slate-900">
                  ₹{(item.total || item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-dashed border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>₹{order.subtotal?.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>GST Tax:</span>
                <span>₹{order.tax.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Delivery Charge:</span>
                <span>₹{order.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {order.roundOff !== undefined && order.roundOff !== 0 && (
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Round Off:</span>
                <span>{order.roundOff > 0 ? `+₹${order.roundOff.toFixed(2)}` : `-₹${Math.abs(order.roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Bill:</span>
              <span className="text-emerald-600">₹{order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Need Help / Contact Card */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <Store className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Have questions or need modifications to your order?</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/91${(store?.phone || '9810023456').replace(/\D/g, '').slice(-10)}?text=Hi%2C%20I%20have%20an%20inquiry%20regarding%20my%20order%20${order.orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Store</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
