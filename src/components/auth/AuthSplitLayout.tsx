import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShield, FiZap } from 'react-icons/fi';
import { glassCard } from '@/lib/glass';

interface AuthSplitLayoutProps {
  children: ReactNode;
  title: ReactNode;
  subtitle: string;
  badge?: string;
}

const HIGHLIGHTS = [
  'POS, inventory & multi-branch in one place',
  'Real-time analytics & courier tracking',
  'Enterprise security with role-based access',
];

export function AuthSplitLayout({ children, title, subtitle, badge }: AuthSplitLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="auth-split-screen grid h-[100dvh] max-h-[100dvh] overflow-hidden lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col">
        <img
          src="/login-hero-orange.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/50 via-orange-500/60 to-white/30" />
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-orange-300/30 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
            >
              <FiArrowLeft className="text-base" />
              Back to Home
            </button>
          </div>

          <div className="max-w-lg space-y-6">
            {badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide text-white backdrop-blur-md">
                <FiZap className="text-orange-100" />
                {badge}
              </span>
            )}
            <img src="/favicon2.png" alt="Sell Mate" className="h-14 w-auto drop-shadow-lg" />
            <h2 className="text-4xl font-extrabold leading-tight text-white xl:text-5xl">
              Power any business
              <span className="block bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">
                with Sell Mate
              </span>
            </h2>
            <p className="text-base leading-relaxed text-white/85 xl:text-lg">
              Retail, fashion, food, services & more — POS, inventory, staff, courier delivery, and analytics in one platform.
            </p>
            <ul className="space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white ${glassCard} !border-white/25 !bg-white/15 !backdrop-blur-md`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/80 text-white shadow-sm">
                    <FiShield className="text-xs" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs font-medium text-white/60">
            © {new Date().getFullYear()} Sell Mate · Secured by <a href="https://www.nextwavessoftware.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700">NextWaves Software</a>
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="auth-form-panel relative flex min-h-0 flex-col overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50/80">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />

        <div className="relative z-10 flex shrink-0 items-center justify-between px-5 pt-5 lg:hidden">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200/80 bg-white/70 px-3 py-2 text-sm font-semibold text-orange-700 backdrop-blur-sm"
          >
            <FiArrowLeft />
            Home
          </button>
          <img src="/favicon2.png" alt="Sell Mate" className="h-10 w-auto" />
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-5 py-4 sm:px-8">
          <div
            className={`w-full max-w-md ${glassCard} !rounded-3xl !border-orange-200/50 !bg-white/70 !p-6 !shadow-[0_24px_64px_rgba(234,88,12,0.12)] !backdrop-blur-2xl sm:!p-8`}
          >
            <div className="mb-6 text-center lg:text-left">
              <div className="mb-4 hidden justify-center lg:flex">
                <img src="/1.png" alt="Sell Mate" className="h-16 w-auto" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-gray-600 sm:text-base">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
