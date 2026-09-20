import React from 'react';
import { User, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CustomerProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-xl mx-auto space-y-6 text-xs">
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Profile</h1>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
            <span className="text-xs font-semibold text-emerald-600 uppercase">{user?.role}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{user?.phone || 'No phone recorded'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
