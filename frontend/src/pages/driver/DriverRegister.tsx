import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerDriver } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage } from '../../utils/errors';

export default function DriverRegister() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
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
      const response = await registerDriver({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        license_number: licenseNumber,
      });
      setAuth(response);
      navigate('/driver/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Drive with us</h1>
      <p className="text-gray-500 mb-6">Your account starts pending verification — license and insurance checks happen before your first delivery.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Full name"
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
          placeholder="Driver's license number"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          required
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
          className="w-full rounded-full bg-teal-600 text-white py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-4">
        Already registered? <Link to="/driver/login" className="text-teal-700 underline">Sign in</Link>
      </p>
    </div>
  );
}
