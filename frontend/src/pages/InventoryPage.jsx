import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  PackageX,
  TrendingUp,
  History,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import api from '../services/api';

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'history'
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('IN'); // 'IN' | 'OUT' | 'ADJUSTMENT'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const [invRes, histRes] = await Promise.all([
        api.get(`/inventory?${params.toString()}`),
        api.get('/inventory/history?limit=50'),
      ]);

      if (invRes.data.success) {
        setProducts(invRes.data.data);
        setMetrics(invRes.data.metrics || {});
      }
      if (histRes.data.success) {
        setTransactions(histRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [statusFilter]);

  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustType('IN');
    setAdjustQty('');
    setAdjustReason('');
    setModalError('');
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustQty || Number(adjustQty) < 0) {
      setModalError('Please enter a valid quantity');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const res = await api.post('/inventory/adjust', {
        productId: selectedProduct._id,
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason || `Manual ${adjustType} update`,
      });

      if (res.data.success) {
        setShowAdjustModal(false);
        fetchInventory();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1">Track stock levels, warehouse valuations, and audit history</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInventory}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Valuation Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Stock In Warehouse"
          value={metrics.totalItems?.toLocaleString('en-IN') || 0}
          subtitle="Total product units count"
          icon={Boxes}
          color="emerald"
        />
        <StatCard
          title="Inventory Cost Value"
          value={`₹${Math.round(metrics.totalValuation || 0).toLocaleString('en-IN')}`}
          subtitle="Valuation at purchase price"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Retail Value"
          value={`₹${Math.round(metrics.totalRetailValue || 0).toLocaleString('en-IN')}`}
          subtitle="Potential selling value"
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="Low & Out of Stock"
          value={`${metrics.lowStockCount || 0} / ${metrics.outOfStockCount || 0}`}
          subtitle="Items needing immediate restock"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Tab Selector & Controls */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              activeTab === 'stock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Current Stock Matrix
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Audit History Log ({transactions.length})
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search stock..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInventory()}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Current Stock Matrix */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">SKU / Barcode</th>
                  <th className="p-3.5 text-right">Cost</th>
                  <th className="p-3.5 text-right">Selling</th>
                  <th className="p-3.5 text-center">Current Stock</th>
                  <th className="p-3.5 text-center">Alert Limit</th>
                  <th className="p-3.5 text-right">Total Valuation</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isOut = p.stockQuantity <= 0;
                  const isLow = p.stockQuantity <= p.minimumStockLevel && !isOut;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <span className="text-[10px] text-slate-400">{p.category?.name}</span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-600">
                        {p.sku}
                      </td>

                      <td className="p-3.5 text-right text-slate-500">
                        ₹{p.purchasePrice?.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-right font-semibold text-slate-800">
                        ₹{p.sellingPrice?.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {p.stockQuantity} {p.unit}
                        </span>
                      </td>

                      <td className="p-3.5 text-center text-slate-400">
                        {p.minimumStockLevel} {p.unit}
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-700">
                        ₹{(p.stockQuantity * p.purchasePrice).toFixed(2)}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => openAdjustModal(p)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-all shadow-sm"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit History Log */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5 text-center">Qty Change</th>
                  <th className="p-3.5 text-center">Stock Before → After</th>
                  <th className="p-3.5">Reason / Order Ref</th>
                  <th className="p-3.5 text-right">Initiated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-slate-800">{t.product?.name || 'Deleted Product'}</p>
                      <span className="text-[10px] font-mono text-slate-400">{t.product?.sku}</span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.type === 'IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.type === 'OUT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-bold">
                      {t.type === 'IN' ? `+${t.quantity}` : t.type === 'OUT' ? `-${t.quantity}` : t.quantity}
                    </td>

                    <td className="p-3.5 text-center font-mono text-slate-600">
                      {t.previousStock} → <strong className="text-slate-900">{t.newStock}</strong>
                    </td>

                    <td className="p-3.5 text-slate-600">
                      {t.reason || 'General Adjustment'}
                    </td>

                    <td className="p-3.5 text-right text-slate-500">
                      {t.createdBy?.name || 'System Auto'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Adjust Stock: {selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Current Stock: {selectedProduct.stockQuantity} {selectedProduct.unit}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Action Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      adjustType === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Stock IN (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      adjustType === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Stock OUT (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      adjustType === 'ADJUSTMENT'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Override (=)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adjustType === 'ADJUSTMENT' ? 'New Total Count' : 'Quantity to Add/Remove'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Received shipment, expired item, inventory audit"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
                >
                  {modalSubmitting ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
