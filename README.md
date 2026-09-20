# LocalKart – Neighborhood Store Management System

**LocalKart** is a complete, full-stack web application designed specifically for neighborhood general stores (Kirana stores). Neighborhood store owners receive customer requests through WhatsApp, phone calls, walk-ins, and online web orders. LocalKart centralizes store operations into a single platform: inventory tracking, high-speed POS billing, WhatsApp order conversion, customer CRM, delivery rider dispatch, financial analytics, and real-time alerts.

---

## 🌟 Key Features

1. **High-Speed POS Terminal & Billing**
   - Fast product lookup by barcode scanner, SKU, or name.
   - Quick category filtering and stock alerts.
   - Safe multi-tier calculations (Item Subtotal, Discounts, GST Tax rates, Delivery Fees, Grand Total).
   - Instant professional receipt & tax invoice generation with 1-click thermal printing (`window.print()`).

2. **WhatsApp & Phone Order Workflows**
   - **WhatsApp Order Converter**: Paste raw customer WhatsApp messages (e.g. *"2 kg Aashirvaad Atta, 1 mustard oil, 3 Parle-G"*) and automatically parse, match, and populate items into the POS terminal.
   - **Phone Order Lookup**: Enter customer phone number; existing profiles and delivery addresses are auto-populated. If new, the customer is registered seamlessly.
   - Distinguish channels with `orderSource`: `WHATSAPP`, `PHONE`, `WALK_IN`, `WEBSITE`, `APP`.

3. **Strict Inventory Safety & Audit Trail**
   - **Negative Stock Prevention**: Server-side stock validation prevents orders exceeding on-hand quantities.
   - **Automatic Stock Decrement**: Deducts inventory upon order placement.
   - **Automatic Stock Restoration**: When an order status is updated to `CANCELLED`, all item quantities are automatically restored with an audit entry.
   - **Stock Transactions**: Audit logging for all `IN`, `OUT`, and `ADJUSTMENT` operations.
   - **Low & Out of Stock Alerts**: Real-time broadcast when quantities reach or fall below threshold.

4. **Multi-Role Access & Permissions**
   - **Store Owner / Admin**: Complete management over products, inventory, customers, orders, deliveries, staff, reports, settings.
   - **Staff / Cashier**: Product lookup, POS billing, order status progression, customer creation, stock management.
   - **Delivery Partner**: Mobile-friendly delivery portal with turn-by-turn customer addresses, direct call/WhatsApp buttons, and delivery status updates (`ASSIGNED` → `PICKED_UP` → `OUT_FOR_DELIVERY` → `DELIVERED`).
   - **Customer**: Storefront catalog, basket/cart, checkout with COD/UPI/Card options, and live visual order tracking.

5. **Real-Time Updates via Socket.IO**
   - Live socket events: `newOrder`, `orderUpdated`, `inventoryUpdated`, `deliveryUpdated`, `paymentUpdated`, `newNotification`.
   - In-app notification bell with unread badge counter and floating toast popups.

6. **Financial Reports & Business Intelligence**
   - Daily, Weekly, and Monthly sales timelines with order counts, GST, and revenue.
   - **Product Gross Profit Margins**: Calculates profit margin `(sellingPrice - purchasePrice) / sellingPrice` across all items sold.
   - Category inventory valuations at cost price vs retail potential.
   - 1-Click **CSV Export** for financial auditing.

---

## 🛠️ Tech Stack

### Frontend
- **React.js 18** (Vite SPA)
- **Tailwind CSS** (Modern responsive design system)
- **React Router v6** (Nested routes & role-based guards)
- **Axios** (JWT interceptor & error handling)
- **Lucide React** (Modern clean icons)
- **Recharts** (Interactive Area, Bar, and Donut charts)
- **Socket.IO Client** (Real-time events)

### Backend
- **Node.js & Express.js** (REST API with MVC architecture)
- **MongoDB & Mongoose** (Indexed collections, schema validations, aggregation pipelines)
- **JWT & bcryptjs** (Authentication & password hashing)
- **Helmet, CORS & Morgan** (Security and request logging)
- **Express Rate Limit** (DDoS and brute-force mitigation)
- **Socket.IO** (Real-time bi-directional broadcasting)
- **mongodb-memory-server** (Automatic development fallback if external MongoDB is offline)

---

## 📁 Project Structure

```
zeroclick/
├── package.json              # Root script runner (dev, seed, install:all)
├── .gitignore
├── README.md
│
├── backend/
│   ├── src/
│   │   ├── config/           # Database connection with cloud & in-memory fallback
│   │   ├── controllers/      # Auth, Product, Inventory, Order, Customer, Delivery, Report, Dashboard
│   │   ├── middleware/       # JWT protect, role authorize, centralized error & rate limiters
│   │   ├── models/           # Mongoose models (User, Product, Category, Customer, Order, Delivery, etc.)
│   │   ├── routes/           # Express modular route definitions
│   │   ├── seeds/            # Database seed script (50 products, 20 customers, orders, users)
│   │   ├── sockets/          # Socket.IO event broadcaster
│   │   ├── app.js            # Express application setup
│   │   └── server.js         # HTTP + Socket.IO server startup
│   ├── .env.example
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/       # Sidebar, Navbar, StatCard, Badge, ReceiptModal, WhatsAppModal
    │   ├── context/          # AuthContext, SocketContext, CartContext
    │   ├── layouts/          # DashboardLayout, CustomerLayout
    │   ├── pages/            # POS, Dashboard, Products, Inventory, Orders, Deliveries, Reports, Store
    │   ├── services/         # Axios API client
    │   ├── App.jsx           # Application routing
    │   ├── main.jsx          # React DOM entry
    │   └── index.css         # Tailwind directives & thermal print CSS
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## ⚡ Quick Start & Setup

### Prerequisites
- Node.js (v18+ or v20+ recommended)
- npm (v9+)
- (Optional) MongoDB Atlas URI or local MongoDB. If not installed, the application automatically launches an in-memory MongoDB instance for development!

### 1. Installation

From the project root:
```bash
# Install both backend and frontend dependencies in one command
npm run install:all
```

Alternatively, install individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### 2. Environment Variables Setup

#### Backend (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/localkart
JWT_SECRET=localkart_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASSWORD=
```
> **Note on MongoDB**: If you have a MongoDB Atlas connection string, paste it in `backend/.env` as `MONGODB_URI=mongodb+srv://...`. If left as default, the backend will automatically connect or launch an in-memory instance.

#### Frontend (`frontend/.env`):
```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:5000
```

---

### 3. Seed the Database

Populate 1 Store Owner, 5 Staff members, 2 Delivery Partners, 20 Customers, 50 Indian Kirana Products across 8 categories, and sample historical orders:

```bash
# From root directory:
npm run seed

# Or inside backend directory:
cd backend && npm run seed
```

---

### 4. Run Development Servers

Run both Backend and Frontend concurrently with one command from the root:

```bash
npm run dev
```

- **Backend API**: `http://localhost:5000/api`
- **Frontend App**: `http://localhost:5173`

---

## 🔑 Demo Login Credentials

The login screen (`/login`) includes **1-Click Quick Demo Login buttons** to test any role instantly:

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Store Owner (Admin)** | `admin@localkart.com` | `Admin@12345` | Complete store access, reports, staff management, settings |
| **Cashier / Staff** | `staff1@localkart.com` | `Staff@12345` | POS terminal, order billing, stock adjustments, customer CRM |
| **Delivery Partner** | `delivery1@localkart.com` | `Delivery@12345` | Rider portal, turn-by-turn addresses, call customer, update delivery status |
| **Customer** | `customer1@localkart.com` | `Customer@12345` | Grocery catalog, cart, checkout, live order tracking |

---

## 📋 Comprehensive Order Flow Verification

1. **Log in as Cashier / Admin**: Navigate to `/pos`.
2. **Lookup Customer**: Type `9811012345` into the customer phone field. The customer profile will auto-populate.
3. **Add Items**:
   - Click items from the catalog (e.g. *Aashirvaad Atta*, *Tata Salt*).
   - Or click **Paste WhatsApp Order**, enter customer text, and add items with 1 click.
4. **Charge & Bill**: Choose Cash or UPI, then click **Charge & Print**.
   - An itemized tax invoice will display with GST breakdowns and a print button.
   - The product inventory will automatically decrease.
5. **Dispatch Delivery**:
   - Go to `/deliveries`, select the order, and assign rider *Suresh Kumar*.
6. **Rider Fulfillment**:
   - Click the role switcher pill in the top navbar and switch to **Delivery Partner**.
   - The rider sees the assigned order, customer address, and status update buttons (`Picked Up` → `Out for Delivery` → `Delivered`).
7. **Cancel & Stock Restoration**:
   - If an order is set to `CANCELLED` in `/orders`, the items are automatically restored to inventory and an audit record is logged in `/inventory`.

---

## 📄 License
ISC License. Built for LocalKart neighborhood stores.
