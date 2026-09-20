import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  IndianRupee,
  Calendar,
  MessageSquare,
  Clock,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import api from '../services/api';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await api.get(`/customers/${id}`);
        if (res.data.success) {
          setCustomer(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!customer) {
    return <div className="p-8 text-center text-slate-400">Customer not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/customers"
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{customer.name}</h1>
          <p className="text-xs text-slate-500">Customer profile and historical purchase timeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Lifetime Spend"
          value={`₹${customer.totalSpending?.toFixed(2) || '0.00'}`}
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          title="Completed Orders"
          value={customer.totalOrders || 0}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${customer.totalOrders ? (customer.totalSpending / customer.totalOrders).toFixed(2) : '0.00'}`}
          icon={Clock}
          color="indigo"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Order History ({customer.orders?.length || 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(customer.orders || []).map((o) => (
                <tr key={o._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900">
                    <Link to={`/orders/${o._id}`} className="hover:text-emerald-600">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3.5">
                    <Badge variant={o.orderSource}>{o.orderSource}</Badge>
                  </td>
                  <td className="p-3.5">
                    {o.paymentMethod} ({o.paymentStatus})
                  </td>
                  <td className="p-3.5">
                    <Badge variant={o.orderStatus}>{o.orderStatus}</Badge>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    ₹{o.totalAmount?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
