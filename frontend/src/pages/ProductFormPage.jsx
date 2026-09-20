import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ProductFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    description: '',
    purchasePrice: '',
    sellingPrice: '',
    discount: 0,
    gst: 5,
    stockQuantity: 10,
    minimumStockLevel: 5,
    unit: 'packet',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
    isActive: true,
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/products/categories');
        if (res.data.success) {
          setCategories(res.data.data);
          if (!isEdit && res.data.data.length > 0) {
            setFormData((prev) => ({ ...prev, category: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();

    if (isEdit) {
      const fetchProduct = async () => {
        try {
          const res = await api.get(`/products/${id}`);
          if (res.data.success) {
            const p = res.data.data;
            setFormData({
              name: p.name,
              sku: p.sku,
              barcode: p.barcode || '',
              category: p.category?._id || p.category,
              brand: p.brand || '',
              description: p.description || '',
              purchasePrice: p.purchasePrice,
              sellingPrice: p.sellingPrice,
              discount: p.discount || 0,
              gst: p.gst || 0,
              stockQuantity: p.stockQuantity,
              minimumStockLevel: p.minimumStockLevel || 5,
              unit: p.unit || 'packet',
              image: p.image || '',
              isActive: p.isActive,
            });
          }
        } catch (err) {
          setError('Failed to load product details');
        }
      };
      fetchProduct();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        discount: Number(formData.discount),
        gst: Number(formData.gst),
        stockQuantity: Number(formData.stockQuantity),
        minimumStockLevel: Number(formData.minimumStockLevel),
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-xs text-slate-500">Configure pricing, category, and inventory parameters</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Product Title *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Aashirvaad Shudh Chakki Atta (5 kg)"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">SKU (Unique Code) *</label>
            <input
              type="text"
              name="sku"
              required
              value={formData.sku}
              onChange={handleChange}
              placeholder="e.g. GRAIN-ATT-001"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Barcode (EAN-13)</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="e.g. 8901030388412"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Category *</label>
            <select
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Brand / Manufacturer</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. ITC / Aashirvaad"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Cost / Purchase Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              name="purchasePrice"
              required
              value={formData.purchasePrice}
              onChange={handleChange}
              placeholder="220"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Selling / Retail Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              name="sellingPrice"
              required
              value={formData.sellingPrice}
              onChange={handleChange}
              placeholder="265"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">GST Rate (%)</label>
            <select
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="0">0% (Nil / Essential Grains)</option>
              <option value="5">5% (Edible Oils, Spices, Sugar)</option>
              <option value="12">12% (Butter, Ghee, Fruit Juices)</option>
              <option value="18">18% (Biscuits, Soaps, Shampoos)</option>
              <option value="28">28% (Aerated Sodas, Energy Drinks)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Unit of Measure</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="packet">packet</option>
              <option value="piece">piece</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="litre">litre</option>
              <option value="ml">ml</option>
              <option value="bottle">bottle</option>
              <option value="can">can</option>
              <option value="box">box</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Initial / Current Stock *</label>
            <input
              type="number"
              name="stockQuantity"
              required
              value={formData.stockQuantity}
              onChange={handleChange}
              placeholder="50"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Low Stock Alert Threshold</label>
            <input
              type="number"
              name="minimumStockLevel"
              value={formData.minimumStockLevel}
              onChange={handleChange}
              placeholder="5"
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Product Image URL</label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://..."
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Product details, ingredients, shelf life..."
              className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            to="/products"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
