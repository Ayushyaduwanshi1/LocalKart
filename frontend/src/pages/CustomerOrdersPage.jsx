import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Clock } from 'lucide-react';
import Badge from '../components/Badge';
import api from '../services/api';

const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        const res = await api.get('/orders');
        if (res.data.success) {
          setOrders(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyOrders();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Orders</h1>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No orders yet</h3>
          <p className="text-xs text-slate-400">You haven't placed any grocery orders yet.</p>
          <Link
            to="/store"
            className="inline-block px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o._id}
              to={`/orders/${o._id}`}
              className="block bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{o.orderNumber}</span>
                  <Badge variant={o.orderStatus}>{o.orderStatus}</Badge>
                </div>
                <p className="text-slate-500 mt-1">
                  {new Date(o.createdAt).toLocaleDateString()} • {o.items?.length} items
                </p>
                <p className="text-slate-400 text-[10px] mt-0.5 truncate max-w-sm">
                  {o.items?.map((i) => i.name).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-black text-slate-900 text-sm">₹{o.totalAmount?.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 block">{o.paymentMethod}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrdersPage;
