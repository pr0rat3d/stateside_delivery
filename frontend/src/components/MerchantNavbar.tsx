import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function MerchantNavbar() {
  const { auth, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-indigo-950 text-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold">Stateside Deliveries · Merchant</span>
        <nav className="flex items-center gap-4 text-sm">
          {auth?.role === 'merchant' && (
            <>
              <Link to="/merchant/dashboard" className="hover:underline">Orders</Link>
              <Link to="/merchant/menu" className="hover:underline">Menu</Link>
              <Link to="/merchant/history" className="hover:underline">History</Link>
              <button onClick={logout} className="text-indigo-200 underline">Sign out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
