import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Percent,
  IndianRupee,
  ShoppingBag,
  FileSpreadsheet,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../services/api';

const ReportsPage = () => {
  const [salesReport, setSalesReport] = useState(null);
  const [productReport, setProductReport] = useState([]);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'products' | 'inventory'
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, prodRes, invRes] = await Promise.all([
        api.get('/reports/sales'),
        api.get('/reports/products'),
        api.get('/reports/inventory'),
      ]);

      if (salesRes.data.success) setSalesReport(salesRes.data.data);
      if (prodRes.data.success) setProductReport(prodRes.data.data);
      if (invRes.data.success) setInventoryReport(invRes.data.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // CSV Export utility
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) => Object.values(obj).map((val) => `"${val}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (activeTab === 'sales' && salesReport?.timeline) {
      exportToCSV(salesReport.timeline, 'sales_timeline_report');
    } else if (activeTab === 'products') {
      exportToCSV(productReport, 'product_profitability_report');
    } else if (activeTab === 'inventory' && inventoryReport?.categoryValuation) {
      exportToCSV(inventoryReport.categoryValuation, 'category_inventory_report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Business Insights</h1>
          <p className="text-xs text-slate-500 mt-1">Financial performance, profit margins, and inventory valuation</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 w-fit"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={`₹${Math.round(salesReport?.summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtitle={`${salesReport?.summary?.totalOrders || 0} lifetime orders`}
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          title="Average Order Value"
          value={`₹${Math.round(salesReport?.summary?.averageOrderValue || 0).toLocaleString('en-IN')}`}
          subtitle="Per customer transaction"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Total GST Collected"
          value={`₹${Math.round(salesReport?.summary?.totalGst || 0).toLocaleString('en-IN')}`}
          subtitle="Tax liability"
          icon={Percent}
          color="indigo"
        />
        <StatCard
          title="Discounts Given"
          value={`₹${Math.round(salesReport?.summary?.totalDiscount || 0).toLocaleString('en-IN')}`}
          subtitle="Promotional savings"
          icon={ShoppingBag}
          color="amber"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors ${
            activeTab === 'sales' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sales Timeline
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors ${
            activeTab === 'products' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Product Profit Margins
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors ${
            activeTab === 'inventory' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Category Valuation
        </button>
      </div>

      {/* Tab 1: Sales Timeline */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-center">Orders</th>
                  <th className="p-3.5 text-right">Items Subtotal</th>
                  <th className="p-3.5 text-right">Discounts</th>
                  <th className="p-3.5 text-right">GST</th>
                  <th className="p-3.5 text-right">Delivery Fees</th>
                  <th className="p-3.5 text-right">Gross Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(salesReport?.timeline || []).map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">{row._id}</td>
                    <td className="p-3.5 text-center">{row.orderCount}</td>
                    <td className="p-3.5 text-right">₹{row.subtotal?.toFixed(2)}</td>
                    <td className="p-3.5 text-right text-emerald-600">-₹{row.totalDiscount?.toFixed(2)}</td>
                    <td className="p-3.5 text-right">₹{row.totalGst?.toFixed(2)}</td>
                    <td className="p-3.5 text-right">₹{row.totalDeliveryCharges?.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-black text-slate-900">₹{row.totalSales?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Product Profit Margin */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5 text-center">Units Sold</th>
                  <th className="p-3.5 text-right">Gross Sales</th>
                  <th className="p-3.5 text-right">Est. Cost of Goods</th>
                  <th className="p-3.5 text-right">Gross Profit</th>
                  <th className="p-3.5 text-right">Profit Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productReport.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">{p.name}</td>
                    <td className="p-3.5 font-mono text-slate-500">{p.sku}</td>
                    <td className="p-3.5 text-center font-bold">{p.unitsSold}</td>
                    <td className="p-3.5 text-right font-semibold">₹{p.revenue?.toFixed(2)}</td>
                    <td className="p-3.5 text-right text-slate-500">₹{p.estimatedCost?.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">₹{p.grossProfit?.toFixed(2)}</td>
                    <td className="p-3.5 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {p.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Category Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-center">Products Count</th>
                  <th className="p-3.5 text-center">Stock Units</th>
                  <th className="p-3.5 text-right">Cost Valuation</th>
                  <th className="p-3.5 text-right">Retail Potential</th>
                  <th className="p-3.5 text-right">Potential Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(inventoryReport?.categoryValuation || []).map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">{c.category}</td>
                    <td className="p-3.5 text-center">{c.productCount}</td>
                    <td className="p-3.5 text-center font-bold">{c.totalStockUnits}</td>
                    <td className="p-3.5 text-right text-slate-600">₹{c.totalCostValuation?.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-semibold text-slate-900">₹{c.totalRetailValuation?.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">₹{c.potentialProfit?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
