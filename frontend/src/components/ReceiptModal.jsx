import React from 'react';
import { Printer, Download, Share2, MessageSquare, X, CheckCircle2 } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, order, settings }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const store = settings || {
    storeName: 'LocalKart General Store',
    tagline: 'Your Trusted Neighborhood Kirana',
    address: 'Shop No. 7 & 8, Main Market, Green Park',
    city: 'New Delhi',
    pincode: '110016',
    phone: '+91 98100 23456',
    gstin: '07AAACL9999F1Z2',
    receiptFooter: 'Thank you for shopping at LocalKart! Visit again.',
  };

  const invoiceNum = order.invoiceNumber || order.orderNumber;
  const custName = order.customer?.name || 'Walk-in Customer';
  const custPhone = order.customer?.phone || '';
  const totalAmount = order.totalAmount ?? 0;
  const paidAmount = order.paidAmount ?? (order.paymentStatus === 'PAID' ? totalAmount : 0);
  const remainingAmount = order.remainingAmount ?? (totalAmount - paidAmount);

  // Generate WhatsApp Share message
  const handleWhatsAppShare = () => {
    const lines = [
      `🛒 *${store.storeName}*`,
      `${store.address}, ${store.city}`,
      `📞 Ph: ${store.phone} | GSTIN: ${store.gstin}`,
      `--------------------------------`,
      `📄 *Tax Invoice:* ${invoiceNum}`,
      `📦 *Order ID:* ${order.orderNumber}`,
      `👤 *Customer:* ${custName}`,
      `📅 *Date:* ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}`,
      `--------------------------------`,
      `*ITEMS:*`,
    ];

    (order.items || []).forEach((item, idx) => {
      const unit = item.unit || 'PCS';
      const itemTotal = (item.total || item.price * item.quantity).toFixed(2);
      lines.push(`${idx + 1}. ${item.name} (${item.quantity} ${unit}) - ₹${itemTotal}`);
    });

    lines.push(`--------------------------------`);
    lines.push(`Subtotal: ₹${(order.subtotal || 0).toFixed(2)}`);
    if (order.tax > 0 || order.gst > 0) {
      lines.push(`GST: ₹${((order.tax || order.gst) || 0).toFixed(2)}`);
    }
    if (order.deliveryCharge > 0) {
      lines.push(`Delivery: ₹${order.deliveryCharge.toFixed(2)}`);
    }
    if (order.discount > 0) {
      lines.push(`Discount: -₹${order.discount.toFixed(2)}`);
    }
    if (order.roundOff) {
      lines.push(`Round Off: ₹${order.roundOff.toFixed(2)}`);
    }
    lines.push(`*Total Amount: ₹${totalAmount.toFixed(2)}*`);
    lines.push(`Paid: ₹${paidAmount.toFixed(2)} (${order.paymentStatus})`);
    if (remainingAmount > 0) {
      lines.push(`*Balance Due: ₹${remainingAmount.toFixed(2)}*`);
    }
    lines.push(`--------------------------------`);
    lines.push(`Track live order: ${window.location.origin}/track-order/${order.orderNumber}`);
    lines.push(`_Thank you for choosing LocalKart!_`);

    const encoded = encodeURIComponent(lines.join('\n'));
    const phoneClean = custPhone.replace(/\D/g, '');
    const waUrl = phoneClean.length >= 10 
      ? `https://wa.me/91${phoneClean.slice(-10)}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Action Header (Hidden during Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Tax Invoice / Receipt</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold font-mono">
              {invoiceNum}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              title="Share invoice on WhatsApp"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 text-slate-800 printable-receipt text-xs font-mono">
          {/* Store Details Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold tracking-tight font-sans text-slate-900 uppercase">
              {store.storeName}
            </h2>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">{store.tagline}</p>
            <p className="mt-1 text-slate-600">
              {store.address}, {store.city} - {store.pincode}
            </p>
            <p className="text-slate-600">Ph: {store.phone} | GSTIN: {store.gstin}</p>
          </div>

          {/* Invoice Meta */}
          <div className="py-3 border-b border-dashed border-slate-300 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p><span className="text-slate-500">Invoice No:</span> <strong className="font-bold text-slate-900">{invoiceNum}</strong></p>
              <p><span className="text-slate-500">Order ID:</span> <strong className="text-slate-700">{order.orderNumber}</strong></p>
              <p><span className="text-slate-500">Date:</span> {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')} {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="text-slate-500">Source:</span> <span className="uppercase font-semibold text-slate-800">{order.orderSource || 'WALK_IN'}</span></p>
            </div>
            <div className="text-right">
              <p><span className="text-slate-500">Customer:</span> <strong className="font-bold">{custName}</strong></p>
              <p><span className="text-slate-500">Phone:</span> {custPhone || '-'}</p>
              <p><span className="text-slate-500">Payment Mode:</span> {order.paymentMethod || 'CASH'}</p>
              <p>
                <span className="text-slate-500">Status: </span> 
                <span className={`font-semibold ${order.paymentStatus === 'PAID' ? 'text-emerald-600' : order.paymentStatus === 'PARTIALLY_PAID' ? 'text-amber-600' : 'text-rose-600'}`}>
                  {order.paymentStatus || 'PENDING'}
                </span>
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="pb-1 text-left">Item</th>
                  <th className="pb-1 text-center">Qty / Unit</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1 pr-2">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.gstRate > 0 && <span className="text-[9px] text-slate-400">GST {item.gstRate}%</span>}
                    </td>
                    <td className="py-1 text-center align-top whitespace-nowrap">
                      {item.quantity} {item.unit || 'PCS'}
                    </td>
                    <td className="py-1 text-right align-top">₹{item.price?.toFixed(2)}</td>
                    <td className="py-1 text-right align-top font-semibold">₹{(item.total || item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="py-3 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span>₹{(order.subtotal ?? 0).toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            {(order.tax > 0 || order.gst > 0) && (
              <div className="flex justify-between text-slate-600">
                <span>GST (Tax):</span>
                <span>₹{((order.tax || order.gst) ?? 0).toFixed(2)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee:</span>
                <span>₹{order.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {order.roundOff !== undefined && order.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Round Off:</span>
                <span>{order.roundOff > 0 ? `+₹${order.roundOff.toFixed(2)}` : `-₹${Math.abs(order.roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1">
              <span>Paid Amount:</span>
              <span className="font-semibold text-emerald-600">₹{paidAmount.toFixed(2)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Remaining Balance Due:</span>
                <span>₹{remainingAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer & Barcode note */}
          <div className="text-center pt-4 text-[10px] text-slate-500 font-sans">
            <p className="font-medium text-slate-700">{store.receiptFooter}</p>
            <div className="mt-2 text-[13px] font-mono tracking-widest text-slate-800">
              * {order.orderNumber} *
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Generated by LocalKart POS System</p>
          </div>
        </div>

        {/* Modal Close Button footer (no-print) */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between no-print">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-all border border-emerald-200"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Share WhatsApp Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
