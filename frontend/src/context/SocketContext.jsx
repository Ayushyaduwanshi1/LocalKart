import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected to server:', newSocket.id);
    });

    const addToast = (title, message, type = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    newSocket.on('newOrder', (order) => {
      addToast(
        '🛒 New Order Placed!',
        `Order #${order.orderNumber} for ₹${order.totalAmount} via ${order.orderSource}`,
        'success'
      );
    });

    newSocket.on('orderUpdated', (order) => {
      addToast(
        '📦 Order Status Updated',
        `Order #${order.orderNumber} is now ${order.orderStatus}`,
        'info'
      );
    });

    newSocket.on('newNotification', (notif) => {
      addToast(notif.title, notif.message, notif.type === 'OUT_OF_STOCK' || notif.type === 'LOW_STOCK' ? 'warning' : 'info');
    });

    newSocket.on('deliveryUpdated', (delivery) => {
      addToast(
        '🚚 Delivery Update',
        `Delivery status changed to ${delivery.status}`,
        'info'
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, toasts, removeToast }}>
      {children}
      {/* Real-time Toast Notifications Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-50 border-emerald-700'
                : toast.type === 'warning'
                ? 'bg-amber-900/90 text-amber-50 border-amber-700'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{toast.title}</p>
                <p className="text-xs mt-1 text-slate-200">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white text-xs ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
