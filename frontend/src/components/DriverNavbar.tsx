import { useAuth } from '../auth/AuthContext';

export default function DriverNavbar() {
  const { auth, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold">Stateside Deliveries · Driver</span>
        {auth?.role === 'driver' && (
          <button onClick={logout} className="text-sm text-gray-300 underline">
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
