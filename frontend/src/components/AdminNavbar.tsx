import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AdminNavbar() {
  const { auth, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold">Stateside Deliveries · Admin</span>
        {auth?.role === 'admin' && (
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/admin/orders" className="hover:underline">Live orders</Link>
            <Link to="/admin/zones" className="hover:underline">Zones</Link>
            <Link to="/admin/merchants" className="hover:underline">Merchants</Link>
            <Link to="/admin/drivers" className="hover:underline">Drivers</Link>
            <Link to="/admin/reports" className="hover:underline">Reports</Link>
            <Link to="/admin/support" className="hover:underline">Support</Link>
            <button onClick={logout} className="text-slate-300 underline">Sign out</button>
          </nav>
        )}
      </div>
    </header>
  );
}
