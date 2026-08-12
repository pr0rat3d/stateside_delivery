import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import DriverNavbar from './components/DriverNavbar';
import MerchantNavbar from './components/MerchantNavbar';
import AdminNavbar from './components/AdminNavbar';
import MerchantList from './pages/MerchantList';
import MerchantDetail from './pages/MerchantDetail';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import DriverLogin from './pages/driver/DriverLogin';
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverOrderDetail from './pages/driver/DriverOrderDetail';
import DriverHistory from './pages/driver/DriverHistory';
import MerchantLogin from './pages/merchant/MerchantLogin';
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import MerchantOrderDetail from './pages/merchant/MerchantOrderDetail';
import MerchantMenu from './pages/merchant/MerchantMenu';
import MerchantHistory from './pages/merchant/MerchantHistory';
import AdminOrders from './pages/admin/AdminOrders';
import AdminZones from './pages/admin/AdminZones';
import AdminMerchants from './pages/admin/AdminMerchants';
import AdminDrivers from './pages/admin/AdminDrivers';
import AdminReports from './pages/admin/AdminReports';
import AdminSupport from './pages/admin/AdminSupport';

function CustomerLayout() {
  return (
    <CartProvider>
      <Navbar />
      <Outlet />
    </CartProvider>
  );
}

function DriverLayout() {
  return (
    <>
      <DriverNavbar />
      <Outlet />
    </>
  );
}

function MerchantLayout() {
  return (
    <>
      <MerchantNavbar />
      <Outlet />
    </>
  );
}

function AdminLayout() {
  return (
    <>
      <AdminNavbar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<MerchantList />} />
          <Route path="/merchants/:id" element={<MerchantDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders/:id" element={<OrderConfirmation />} />
        </Route>
        <Route element={<DriverLayout />}>
          <Route path="/driver/login" element={<DriverLogin />} />
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
          <Route path="/driver/orders/:id" element={<DriverOrderDetail />} />
          <Route path="/driver/history" element={<DriverHistory />} />
        </Route>
        <Route element={<MerchantLayout />}>
          <Route path="/merchant/login" element={<MerchantLogin />} />
          <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
          <Route path="/merchant/orders/:id" element={<MerchantOrderDetail />} />
          <Route path="/merchant/menu" element={<MerchantMenu />} />
          <Route path="/merchant/history" element={<MerchantHistory />} />
        </Route>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/zones" element={<AdminZones />} />
          <Route path="/admin/merchants" element={<AdminMerchants />} />
          <Route path="/admin/drivers" element={<AdminDrivers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/support" element={<AdminSupport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
