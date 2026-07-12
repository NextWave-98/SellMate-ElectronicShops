import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, CircleCheckBig, QrCode, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppSelector } from '../../store/hooks';
import { selectIsAuthenticated, selectUser, selectAuthInitialized, selectRequiresBranchSelection } from '../../store/selectors';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { glassInput } from '@/lib/glass';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'qr'>('password');
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const { login, loginWithQrToken } = useAuth();
  const navigate = useNavigate();

  const isAuthenticatedRedux = useAppSelector(selectIsAuthenticated);
  const userRedux = useAppSelector(selectUser);
  const authInitialized = useAppSelector(selectAuthInitialized);
  const requiresBranchSelection = useAppSelector(selectRequiresBranchSelection);

  useEffect(() => {
    if (shouldNavigate && authInitialized && isAuthenticatedRedux && userRedux) {
      // If the account spans multiple branches (or an admin with branch
      // assignments), send them to pick where to work before routing.
      if (requiresBranchSelection) {
        navigate('/select-branch', { replace: true });
        setShouldNavigate(false);
        setLoading(false);
        return;
      }

      const roleName = userRedux.role?.name?.toUpperCase();

      if (roleName === 'ADMIN' || roleName === 'SUPER_ADMIN' || roleName === 'SUPERADMIN') {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (userRedux.locationCode) {
        navigate(`/${userRedux.locationCode}/dashboard`, { replace: true });
      } else {
        toast.error('No location assigned. Please contact your administrator.');
        navigate('/unauthorized', { replace: true });
      }

      setShouldNavigate(false);
      setLoading(false);
    }
  }, [shouldNavigate, authInitialized, isAuthenticatedRedux, userRedux, requiresBranchSelection, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShouldNavigate(false);

    try {
      await login(email, password);
      setShouldNavigate(true);
      toast.success('Login successful! Redirecting...');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      setShouldNavigate(false);
    }
  };

  const handleQrSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    await attemptQrLogin(qrTokenInput);
  };

  const attemptQrLogin = async (rawToken: string) => {
    const normalizedToken = rawToken.replace(/\s+/g, '').trim();
    if (!normalizedToken) {
      toast.error('Please scan or paste a QR token');
      return;
    }

    const tokenCandidate = normalizedToken.startsWith('GCM-QR:')
      ? normalizedToken.slice('GCM-QR:'.length)
      : normalizedToken;
    const jwtParts = tokenCandidate.split('.');
    if (jwtParts.length !== 3 || jwtParts.some((part) => !part)) {
      const message = 'Incomplete QR token. Please scan again or paste full QR value.';
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    setShouldNavigate(false);

    try {
      await loginWithQrToken(normalizedToken);
      setShouldNavigate(true);
      toast.success('QR login successful! Redirecting...');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QR login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      setShouldNavigate(false);
    }
  };

  const handleScanToken = async (scannedValue: string) => {
    setQrTokenInput(scannedValue);
    setShowScanner(false);
    await attemptQrLogin(scannedValue);
  };

  const fieldClass = `${glassInput} h-11 w-full px-4 py-2.5 text-sm`;

  return (
    <AuthSplitLayout
      badge="All-in-One Business Platform"
      title="Welcome back"
      subtitle="Sign in to manage your business with Sell Mate"
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-orange-200/60 bg-orange-50/50 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setAuthMethod('password')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            authMethod === 'password'
              ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200/80'
              : 'text-gray-600 hover:text-orange-600'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('qr')}
          className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            authMethod === 'qr'
              ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200/80'
              : 'text-gray-600 hover:text-orange-600'
          }`}
        >
          <QrCode size={14} /> QR Login
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-600 backdrop-blur-sm">
          {error}
        </div>
      )}

      {authMethod === 'password' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email Address</label>
            <input
              data-testid="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password</label>
            <div className="relative">
              <input
                data-testid="login-password"
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

          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleQrSubmit} className="space-y-4">
          <div className="rounded-xl border border-orange-200/70 bg-orange-50/60 p-3 text-sm text-orange-900 backdrop-blur-sm">
            Scan your staff QR card or paste the QR token payload.
          </div>

          <textarea
            value={qrTokenInput}
            onChange={(e) => setQrTokenInput(e.target.value)}
            placeholder="Paste scanned QR value here"
            className={`${glassInput} min-h-24 w-full resize-none px-4 py-3 text-sm`}
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-orange-300/80 bg-white/50 py-2.5 text-sm font-semibold text-orange-700 backdrop-blur-sm transition hover:bg-orange-50"
            >
              <ScanLine size={16} /> Scan QR
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-2.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login with QR'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-600">
        <CircleCheckBig size={16} className="text-green-500" />
        <span>Secured by <a href="https://www.nextwavessoftware.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700">NextWaves Software</a> </span>
      </div>

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanToken}
        title="Scan Staff QR"
      />
    </AuthSplitLayout>
  );
};

export default LoginPage;
