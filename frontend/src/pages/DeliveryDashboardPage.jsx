import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
  Phone,
  MapPin,
  CheckCircle2,
  Navigation,
  MessageSquare,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const DeliveryDashboardPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignedDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deliveries');
      if (res.data.success) {
        setDeliveries(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedDeliveries();

    if (socket) {
      socket.on('deliveryUpdated', () => fetchAssignedDeliveries());
    }
  }, [socket]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/deliveries/${id}/status`, { status });
      fetchAssignedDeliveries();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Rider Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Rider Dispatch: {user?.name}
            </h1>
            <p className="text-xs text-slate-500">Your assigned grocery delivery tasks</p>
          </div>
        </div>
        <button
          onClick={fetchAssignedDeliveries}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading assigned deliveries...</div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">All caught up!</h3>
            <p className="text-xs text-slate-400 mt-1">No pending delivery orders assigned to you right now.</p>
          </div>
        ) : (
          deliveries.map((del) => {
            const cleanPhone = del.phone?.replace(/[^0-9]/g, '') || '';
            const isCompleted = del.status === 'DELIVERED';

            return (
              <div
                key={del._id}
                className={`bg-white rounded-3xl p-6 border shadow-sm transition-all space-y-4 ${
                  isCompleted ? 'border-slate-200 opacity-60' : 'border-purple-200 shadow-purple-500/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Order #{del.order?.orderNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{del.customer?.name}</h3>
                  </div>
                  <Badge variant={del.status}>{del.status}</Badge>
                </div>

                {/* Turn-by-Turn Address & Phone Call */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700">Delivery Destination:</span>
                      <p className="text-slate-600 font-medium mt-0.5">{del.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 hover:bg-slate-100"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call Customer</span>
                    </a>

                    <a
                      href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1.5 hover:bg-emerald-100"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Amount to collect if COD */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Payment:</span>{' '}
                    <strong className="text-slate-800">{del.order?.paymentMethod} ({del.order?.paymentStatus})</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Bill Total</span>
                    <span className="text-base font-black text-slate-900">₹{del.order?.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rider Actions */}
                {!isCompleted && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {del.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateStatus(del._id, 'PICKED_UP')}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                      >
                        Confirm Picked Up from Store
                      </button>
                    )}

                    {del.status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleUpdateStatus(del._id, 'OUT_FOR_DELIVERY')}
                        className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm"
                      >
                        Start Trip (Out for Delivery)
                      </button>
                    )}

                    {del.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleUpdateStatus(del._id, 'DELIVERED')}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Order as Delivered</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboardPage;
