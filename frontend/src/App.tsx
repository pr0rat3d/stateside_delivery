import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import DriverNavbar from './components/DriverNavbar';
import MerchantList from './pages/MerchantList';
import MerchantDetail from './pages/MerchantDetail';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import DriverLogin from './pages/driver/DriverLogin';
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverOrderDetail from './pages/driver/DriverOrderDetail';
import DriverHistory from './pages/driver/DriverHistory';

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
      </Routes>
    </BrowserRouter>
  );
}
