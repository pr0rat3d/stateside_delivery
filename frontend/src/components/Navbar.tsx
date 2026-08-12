import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const cart = useCart();
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-teal-700">
          Stateside Deliveries
        </Link>
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
    </header>
  );
}
