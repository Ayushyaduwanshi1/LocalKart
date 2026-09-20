import React, { useState } from 'react';
import { Printer, Download, Share2, MessageSquare, X, CheckCircle2, Store, Copy, Check } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, order, settings }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Triggers standard print-to-PDF workflow in browser
    window.print();
  };

  const store = settings || {
    storeName: 'LocalKart Super Store',
    tagline: 'Your Trusted Neighborhood Kirana & Daily Essentials',
    address: 'Shop #14, Ground Floor, Central Market',
    city: 'New Delhi',
    pincode: '110001',
    phone: '+91 98765 43210',
    gstin: '07AABCL1234F1Z8',
    receiptFooter: 'Thank you for shopping at LocalKart! Visit again or order via WhatsApp.',
  };

  const invoiceNum = order.invoiceNumber || order.orderNumber;
  const custName = order.customer?.name || 'Walk-in Customer';
  const custPhone = order.customer?.phone || '';
  const custAddress = order.deliveryAddress?.address || order.customer?.address || 'Store Walk-In';
  const totalAmount = order.totalAmount ?? 0;
  const paidAmount = order.paidAmount ?? (order.paymentStatus === 'PAID' ? totalAmount : 0);
  const remainingAmount = order.remainingAmount ?? Math.max(0, totalAmount - paidAmount);

  // Generate WhatsApp Share message
  const handleWhatsAppShare = () => {
    const lines = [
      `🛒 *${store.storeName}*`,
      `${store.address}, ${store.city} - ${store.pincode}`,
      `📞 Ph: ${store.phone} | GSTIN: ${store.gstin}`,
      `--------------------------------`,
      `📄 *Tax Invoice:* ${invoiceNum}`,
      `📦 *Order ID:* ${order.orderNumber}`,
      `👤 *Customer:* ${custName}`,
      `📞 *Phone:* ${custPhone || '-'}`,
      `📍 *Address:* ${custAddress}`,
      `📅 *Date:* ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')} ${new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `--------------------------------`,
      `*ITEMS:*`,
    ];

    (order.items || []).forEach((item, idx) => {
      const unit = item.unit || 'piece';
      const itemRate = item.price?.toFixed(2) || '0.00';
      const itemTotal = (item.total || item.price * item.quantity).toFixed(2);
      lines.push(`${idx + 1}. ${item.name} | ${item.quantity} ${unit} @ ₹${itemRate} = ₹${itemTotal}`);
    });

    lines.push(`--------------------------------`);
    lines.push(`Subtotal: ₹${(order.subtotal || 0).toFixed(2)}`);
    if (order.discount > 0) lines.push(`Discount: -₹${order.discount.toFixed(2)}`);
    if (order.gst > 0 || order.tax > 0) lines.push(`GST: ₹${((order.gst || order.tax) || 0).toFixed(2)}`);
    if (order.deliveryCharge > 0) lines.push(`Delivery: ₹${order.deliveryCharge.toFixed(2)}`);
    if (order.roundOff) lines.push(`Round Off: ₹${order.roundOff.toFixed(2)}`);
    lines.push(`*Grand Total: ₹${totalAmount.toFixed(2)}*`);
    lines.push(`Payment: ${order.paymentMethod || 'CASH'} (${order.paymentStatus || 'PAID'})`);
    lines.push(`Paid: ₹${paidAmount.toFixed(2)}`);
    if (remainingAmount > 0) {
      lines.push(`*Balance Due: ₹${remainingAmount.toFixed(2)}*`);
    }
    lines.push(`--------------------------------`);
    lines.push(`Track live order: ${window.location.origin}/track-order/${order.orderNumber}`);
    lines.push(`_Thank you for choosing ${store.storeName}!_`);

    const encoded = encodeURIComponent(lines.join('\n'));
    const phoneClean = custPhone.replace(/\D/g, '');
    const waUrl = phoneClean.length >= 10
      ? `https://wa.me/91${phoneClean.slice(-10)}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyLink = () => {
    const trackUrl = `${window.location.origin}/track-order/${order.orderNumber}`;
    navigator.clipboard.writeText(trackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Action Header (Hidden during Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Official Tax Invoice</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
              {invoiceNum}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT INVOICE</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD PDF</span>
            </button>
            <button
              onClick={handleWhatsAppShare}
              title="Share invoice on WhatsApp"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SHARE INVOICE</span>
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
          {/* Store Logo & Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl mb-1 shadow-sm font-sans">
              LK
            </div>
            <h2 className="text-base font-extrabold tracking-tight font-sans text-slate-900 uppercase">
              {store.storeName}
            </h2>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">{store.tagline}</p>
            <p className="mt-1 text-slate-600">
              {store.address}, {store.city} - {store.pincode}
            </p>
            <p className="text-slate-600 font-semibold">Store Phone: {store.phone} | GSTIN: {store.gstin}</p>
          </div>

          {/* Invoice Meta */}
          <div className="py-3 border-b border-dashed border-slate-300 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p><span className="text-slate-500">Invoice Number:</span> <strong className="font-bold text-slate-900">{invoiceNum}</strong></p>
              <p><span className="text-slate-500">Order Number:</span> <strong className="text-slate-700">{order.orderNumber}</strong></p>
              <p><span className="text-slate-500">Date & Time:</span> {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')} {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="text-slate-500">Order Source:</span> <span className="uppercase font-bold text-slate-800">{order.orderSource || 'WALK_IN'}</span></p>
            </div>
            <div className="text-right">
              <p><span className="text-slate-500">Customer Name:</span> <strong className="font-bold">{custName}</strong></p>
              <p><span className="text-slate-500">Phone:</span> {custPhone || '-'}</p>
              <p><span className="text-slate-500">Address:</span> {custAddress}</p>
              <p><span className="text-slate-500">Payment Method:</span> <strong className="text-slate-900">{order.paymentMethod || 'CASH'}</strong></p>
              <p>
                <span className="text-slate-500">Payment Status: </span>
                <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-emerald-600' : order.paymentStatus === 'PARTIALLY_PAID' ? 'text-amber-600' : 'text-rose-600'}`}>
                  {order.paymentStatus || 'PENDING'}
                </span>
              </p>
            </div>
          </div>

          {/* Itemized Table: Product, Qty, Unit, Rate, Discount, GST, Amount */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="pb-1 text-left">Product</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-center">Unit</th>
                  <th className="pb-1 text-right">Rate</th>
                  <th className="pb-1 text-right">Discount</th>
                  <th className="pb-1 text-right">GST</th>
                  <th className="pb-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 pr-2">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.sku && <span className="text-[9px] text-slate-400 font-mono">{item.sku}</span>}
                    </td>
                    <td className="py-1.5 text-center align-top font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-center align-top text-slate-500">
                      {item.unit || 'piece'}
                    </td>
                    <td className="py-1.5 text-right align-top text-slate-700">
                      ₹{item.price?.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right align-top text-slate-500">
                      {item.discount > 0 ? `₹${item.discount.toFixed(2)}` : '₹0.00'}
                    </td>
                    <td className="py-1.5 text-right align-top text-slate-500">
                      {item.gstRate > 0 ? `${item.gstRate}%` : '0%'}
                    </td>
                    <td className="py-1.5 text-right align-top font-bold text-slate-900">
                      ₹{(item.total || item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary: Subtotal, Discount, GST, Delivery Charge, Round Off, Grand Total */}
          <div className="py-3 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>₹{(order.subtotal ?? 0).toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Product & Order Discount:</span>
                <span>-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            {(order.tax > 0 || order.gst > 0) && (
              <div className="flex justify-between text-slate-600">
                <span>Applicable GST (Tax):</span>
                <span>₹{((order.tax || order.gst) ?? 0).toFixed(2)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span>₹{order.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {order.roundOff !== undefined && order.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Round Off:</span>
                <span>{order.roundOff > 0 ? `+₹${order.roundOff.toFixed(2)}` : `-₹${Math.abs(order.roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-emerald-700">₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1">
              <span>Paid Amount:</span>
              <span className="font-bold text-emerald-600">₹{paidAmount.toFixed(2)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Remaining Amount Due:</span>
                <span>₹{remainingAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer & Store Policy */}
          <div className="text-center pt-4 text-[10px] text-slate-500 font-sans">
            <p className="font-medium text-slate-700">{store.receiptFooter}</p>
            <div className="mt-2 text-[13px] font-mono tracking-widest text-slate-800 font-bold">
              * {order.orderNumber} *
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Authorized Electronic Computer Generated Tax Invoice</p>
          </div>
        </div>

        {/* Modal Actions Footer (no-print) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SHARE INVOICE</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Tracking Link'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              PRINT INVOICE
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;

