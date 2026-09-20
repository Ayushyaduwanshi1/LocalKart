import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import CustomerLayout from './layouts/CustomerLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Context
import { useAuth } from './context/AuthContext';

// Public & Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OrderTrackingPage from './pages/OrderTrackingPage';

// Admin / Staff Pages
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import OrdersPage from './pages/OrdersPage';
import AdminOrderDetailPage from './pages/AdminOrderDetailPage';
import DeliveriesPage from './pages/DeliveriesPage';
import ReportsPage from './pages/ReportsPage';
import StaffPage from './pages/StaffPage';
import SettingsPage from './pages/SettingsPage';

// Delivery Rider Pages
import DeliveryDashboardPage from './pages/DeliveryDashboardPage';

// Customer Store Pages
import CustomerProductsPage from './pages/CustomerProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import CustomerProfilePage from './pages/CustomerProfilePage';

// Role-aware Orders Router
const SmartOrdersRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'CUSTOMER') {
    return (
      <CustomerLayout>
        <CustomerOrdersPage />
      </CustomerLayout>
    );
  }
  return <OrdersPage />;
};

const SmartOrderDetailRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'CUSTOMER') {
    return (
      <CustomerLayout>
        <OrderDetailPage />
      </CustomerLayout>
    );
  }
  return <AdminOrderDetailPage />;
};

const App = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/track-order/:orderNumber" element={<OrderTrackingPage />} />

      {/* Customer Storefront Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/store" element={<CustomerProductsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<CustomerProfilePage />} />
      </Route>

      {/* Admin / Staff Management Dashboard Routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'DELIVERY']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="/deliveries" element={<DeliveriesPage />} />
        <Route path="/delivery" element={<DeliveryDashboardPage />} />
        <Route path="/delivery/orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<StaffPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
