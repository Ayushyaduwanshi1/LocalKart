import React from 'react';

const Badge = ({ variant = 'default', children, className = '' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'CONFIRMED':
      case 'PAID':
      case 'DELIVERED':
      case 'IN_STOCK':
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'PENDING':
      case 'PROCESSING':
      case 'PACKED':
      case 'ASSIGNED':
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'OUT_FOR_DELIVERY':
      case 'PICKED_UP':
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'CANCELLED':
      case 'FAILED':
      case 'OUT_OF_STOCK':
      case 'REFUNDED':
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      case 'LOW_STOCK':
        return 'bg-orange-50 text-orange-700 border-orange-200';

      case 'WHATSAPP':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';

      case 'PHONE':
        return 'bg-purple-50 text-purple-700 border-purple-200';

      case 'WALK_IN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';

      case 'WEBSITE':
      case 'APP':
        return 'bg-sky-50 text-sky-700 border-sky-200';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getVariantStyles()} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
