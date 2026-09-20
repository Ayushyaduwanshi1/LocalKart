import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Phone,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Badge from '../components/Badge';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const DeliveriesPage = () => {
  const { socket } = useSocket();
  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Assign Modal
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedRider, setSelectedRider] = useState('');

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (statusFilter) params.append('status', statusFilter);

      const [delRes, ridRes] = await Promise.all([
        api.get(`/deliveries?${params.toString()}`),
        api.get('/users?role=DELIVERY'),
      ]);

      if (delRes.data.success) setDeliveries(delRes.data.data);
      if (ridRes.data.success) setRiders(ridRes.data.data);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    if (socket) {
      socket.on('deliveryUpdated', () => fetchDeliveries());
      socket.on('newOrder', () => fetchDeliveries());
    }
  }, [statusFilter, socket]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRider || !selectedDelivery) return;

    try {
      await api.post(`/deliveries/${selectedDelivery._id}/assign`, {
        deliveryPartnerId: selectedRider,
      });
      setSelectedDelivery(null);
      setSelectedRider('');
      fetchDeliveries();
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    try {
      await api.patch(`/deliveries/${deliveryId}/status`, { status: newStatus });
      fetchDeliveries();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Delivery Dispatch</h1>
          <p className="text-xs text-slate-500 mt-1">Assign orders to delivery riders and track status</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDeliveries}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
        {['', 'PENDING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st || 'All Deliveries'}
          </button>
        ))}
      </div>

      {/* Delivery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {deliveries.map((del) => (
          <div
            key={del._id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/orders/${del.order?._id}`}
                    className="font-bold text-sm text-slate-900 hover:text-emerald-600"
                  >
                    Order #{del.order?.orderNumber}
                  </Link>
                  <span className="text-[10px] text-slate-400 block">
                    {new Date(del.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <Badge variant={del.status}>{del.status}</Badge>
              </div>

              {/* Customer Details */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{del.customer?.name}</p>
                <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{del.phone}</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{del.address}</span>
                </div>
              </div>

              {/* Assigned Partner */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Assigned Rider:</span>
                  <span className="font-bold text-slate-800">
                    {del.deliveryPartner?.name || 'Not assigned'}
                  </span>
                </div>
                {!del.deliveryPartner && (
                  <button
                    onClick={() => setSelectedDelivery(del)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                  >
                    Assign
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <select
                value={del.status}
                onChange={(e) => handleStatusUpdate(del._id, e.target.value)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none"
              >
                <option value="PENDING">PENDING</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED UP</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
              </select>

              <Link
                to={`/orders/${del.order?._id}`}
                className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1"
              >
                <span>View Order</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Rider Assignment Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Assign Rider for Order #{selectedDelivery.order?.orderNumber}
            </h3>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Delivery Partner:</label>
                <select
                  required
                  value={selectedRider}
                  onChange={(e) => setSelectedRider(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                >
                  <option value="">Choose rider...</option>
                  {riders.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDelivery(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveriesPage;
