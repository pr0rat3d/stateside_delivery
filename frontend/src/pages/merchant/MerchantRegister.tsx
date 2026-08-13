import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerMerchant } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage } from '../../utils/errors';

const CATEGORIES = ['restaurant', 'grocery', 'convenience', 'provisioning'];

export default function MerchantRegister() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('restaurant');
  const [hoursOpen, setHoursOpen] = useState('09:00');
  const [hoursClose, setHoursClose] = useState('21:00');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await registerMerchant({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        business_name: businessName,
        category,
        hours_open: hoursOpen,
        hours_close: hoursClose,
      });
      setAuth(response);
      navigate('/merchant/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Register your storefront</h1>
      <p className="text-gray-500 mb-6">Your storefront stays hidden from customers until an admin approves it.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="time"
            value={hoursOpen}
            onChange={(e) => setHoursOpen(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="time"
            value={hoursClose}
            onChange={(e) => setHoursClose(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <input
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-indigo-700 text-white py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-4">
        Already registered? <Link to="/merchant/login" className="text-indigo-700 underline">Sign in</Link>
      </p>
    </div>
  );
}
