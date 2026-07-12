import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, CircleCheckBig, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppSelector } from '../../store/hooks';
import { selectIsAuthenticated, selectUser, selectAuthInitialized } from '../../store/selectors';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { glassInput } from '@/lib/glass';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const { superAdminLogin } = useAuth();
  const navigate = useNavigate();

  const isAuthenticatedRedux = useAppSelector(selectIsAuthenticated);
  const userRedux = useAppSelector(selectUser);
  const authInitialized = useAppSelector(selectAuthInitialized);

  useEffect(() => {
    if (shouldNavigate && authInitialized && isAuthenticatedRedux && userRedux) {
      navigate('/platform/overview', { replace: true });
      setShouldNavigate(false);
      setLoading(false);
    }
  }, [shouldNavigate, authInitialized, isAuthenticatedRedux, userRedux, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShouldNavigate(false);

    try {
      await superAdminLogin(email, password, secretKey);
      toast.success('Super admin login successful! Redirecting...');
      setShouldNavigate(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      setShouldNavigate(false);
    }
  };

  const fieldClass = `${glassInput} h-11 w-full px-4 py-2.5 text-sm`;

  return (
    <AuthSplitLayout
      badge="Platform Administration"
      title={
        <span className="inline-flex items-center gap-2">
          <KeyRound className="text-orange-600" size={26} />
          Super Admin Access
        </span>
      }
      subtitle="Sign in with super admin credentials and secret key"
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-600 backdrop-blur-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="superadmin@platform.com"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-12`}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Super Admin Secret Key</label>
          <div className="relative">
            <input
              type={showSecretKey ? 'text' : 'password'}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className={`${fieldClass} pr-12`}
              placeholder="Enter super admin secret key"
              required
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600"
            >
              {showSecretKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Contact platform administrator for the secret key</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Super Admin Sign In'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
        >
          Regular User Login
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
        <CircleCheckBig size={16} className="text-green-500" />
        <span>Secured by Software Waves</span>
      </div>
    </AuthSplitLayout>
  );
};

export default AdminLoginPage;
