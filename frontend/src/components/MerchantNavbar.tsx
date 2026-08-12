import { Link } from 'react-router-dom';

export default function MerchantNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-indigo-950 text-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold">Stateside Deliveries · Merchant</span>
        <nav className="flex gap-4 text-sm">
          <Link to="/merchant/dashboard" className="hover:underline">Orders</Link>
          <Link to="/merchant/menu" className="hover:underline">Menu</Link>
          <Link to="/merchant/history" className="hover:underline">History</Link>
        </nav>
      </div>
    </header>
  );
}
