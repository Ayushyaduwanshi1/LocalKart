import React, { useState } from 'react';
import { MessageSquare, Plus, Check, X, AlertCircle } from 'lucide-react';

const WhatsAppOrderModal = ({ isOpen, onClose, products, onAddItems }) => {
  if (!isOpen) return null;

  const [rawText, setRawText] = useState(
    '2 kg Aashirvaad Atta\n1 Fortune Mustard Oil\n3 Parle-G\n1 Dettol Soap'
  );
  const [parsedItems, setParsedItems] = useState([]);
  const [hasParsed, setHasParsed] = useState(false);

  const handleParse = () => {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const matches = [];

    lines.forEach((line) => {
      // Look for leading number or quantity
      const matchQty = line.match(/^(\d+)\s*(kg|g|l|packet|pkt|bottle|pc|piece|box)?\s*(.*)/i);
      let qty = 1;
      let query = line;

      if (matchQty && matchQty[1]) {
        qty = parseInt(matchQty[1], 10) || 1;
        query = (matchQty[3] || line).trim();
      }

      // Fuzzy match against product catalog
      const cleanQuery = query.toLowerCase();
      const matchedProduct = products.find(
        (p) =>
          p.name.toLowerCase().includes(cleanQuery) ||
          cleanQuery.split(' ').some((word) => word.length > 2 && p.name.toLowerCase().includes(word)) ||
          p.brand?.toLowerCase().includes(cleanQuery)
      );

      matches.push({
        rawLine: line,
        quantity: qty,
        product: matchedProduct || null,
        selectedProductId: matchedProduct?._id || (products[0]?._id || ''),
      });
    });

    setParsedItems(matches);
    setHasParsed(true);
  };

  const handleProductChange = (index, prodId) => {
    const p = products.find((prod) => prod._id === prodId);
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], product: p, selectedProductId: prodId };
      return updated;
    });
  };

  const handleQtyChange = (index, qty) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(1, parseInt(qty, 10) || 1) };
      return updated;
    });
  };

  const handleApplyToPOS = () => {
    const validItems = parsedItems
      .filter((item) => item.product)
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }));

    if (validItems.length > 0) {
      onAddItems(validItems);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-sm">WhatsApp Order Converter</h3>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Paste Customer Message from WhatsApp:
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. 2 kg Aashirvaad Atta&#10;1 Fortune Oil&#10;3 Parle-G"
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={handleParse}
              className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              Parse Items & Match Catalog
            </button>
          </div>

          {hasParsed && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800">
                Matched Products ({parsedItems.length} lines detected):
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-slate-400 block truncate">"{item.rawLine}"</span>
                      <select
                        value={item.selectedProductId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="mt-1 w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                      >
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} (₹{p.sellingPrice} - Stock: {p.stockQuantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="w-16 p-1.5 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyToPOS}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Add Matched Items to POS Cart</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOrderModal;
