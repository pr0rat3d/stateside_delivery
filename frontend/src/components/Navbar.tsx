import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const cart = useCart();
  const { auth, logout } = useAuth();
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-teal-700">
          Stateside Deliveries
        </Link>
        <div className="flex items-center gap-3">
          {auth?.role === 'customer' ? (
            <button onClick={logout} className="text-sm text-gray-500 underline">
              Sign out ({auth.fullName})
            </button>
          ) : (
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
          )}
          <Link
            to="/checkout"
            className="relative inline-flex items-center gap-2 rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Cart
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-white text-teal-700 text-xs font-bold px-1">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
