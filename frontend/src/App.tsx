import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import DriverNavbar from './components/DriverNavbar';
import MerchantNavbar from './components/MerchantNavbar';
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
      </Routes>
    </BrowserRouter>
  );
}
