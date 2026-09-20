import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectIsAuthenticated, selectUser, selectUserRole, selectAuthInitialized } from '../../store/selectors';
import { useSubscription } from '../../hooks/useSubscription';
import {
  FiShoppingBag, FiTrendingUp, FiUsers, FiPackage, FiSettings, FiShield,
  FiZap, FiCpu, FiBarChart2, FiDollarSign, FiTruck, FiStar, FiCheck,
  FiLayers, FiActivity, FiCloud, FiLock, FiGlobe, FiSmartphone, FiClock,
  FiMail, FiPhone, FiMapPin, FiArrowRight, FiPlay, FiAward, FiTarget, FiHeadphones
} from 'react-icons/fi';
import {
  Menu, X, ChevronLeft, ChevronRight, Zap, ArrowRight, Play,
  Sparkles, TrendingUp, Users, Headphones, Activity, LogIn, LayoutDashboard,
  Check, Star, MessageCircle, Target, Truck, ShoppingBag, Package, Settings,
  BarChart3, Globe, Lock, Cloud, Cpu, Layers, Smartphone, Mail, DollarSign,
  type LucideIcon,
} from 'lucide-react';

const GlassCheck = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <span className={`landing-check-icon ${size === 'md' ? 'h-6 w-6' : 'h-5 w-5'}`}>
    <Check className={size === 'md' ? 'h-3.5 w-3.5 text-white' : 'h-3 w-3 text-white'} strokeWidth={3} />
  </span>
);

const SectionHeader = ({
  icon: Icon, badge, title, highlight, subtitle, dark = false,
}: {
  icon: LucideIcon;
  badge: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  dark?: boolean;
}) => (
  <div className="mb-16 text-center">
    <div className={dark ? 'landing-glass-badge-dark mb-5' : 'landing-glass-badge mb-5'}>
      <Icon className={`h-4 w-4 ${dark ? 'text-orange-400' : 'text-orange-600'}`} />
      <span className={`text-sm font-bold tracking-wide ${dark ? 'text-white' : 'text-gray-700'}`}>{badge}</span>
    </div>
    <h2 className={`mb-4 text-4xl font-extrabold leading-tight sm:text-5xl ${dark ? 'text-white' : 'text-gray-900'}`}>
      {title}
      {highlight && (
        <>
          <br />
          <span className="text-orange-600">{highlight}</span>
        </>
      )}
    </h2>
    {subtitle && (
      <p className={`mx-auto max-w-2xl text-lg ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
    )}
  </div>
);

interface SubscriptionPlan {
  id: string;
  plan_type: string;
  name: string;
  description: string;
  monthly_price: string;
  quarterly_price: string;
  semi_annual_price: string;
  annual_price: string;
  max_locations: number;
  max_warehouses: number;
  max_branches: number;
  max_users: number;
  max_products: number;
  unlimited_storage: boolean;
  storage_limit_gb: number | null;
  pos_enabled: boolean;
  online_sales_enabled: boolean;
  courier_integration_enabled: boolean;
  advanced_reporting: boolean;
  api_access: boolean;
  custom_branding: boolean;
  multi_currency: boolean;
  priority_support: boolean;
  trial_days: number;
  is_active: boolean;
  features?: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

// ─── Hero Slider Data ─────────────────────────────────────────────────────────
const SLIDES = [
  {
    heroImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=85',
    badge: 'All-in-One Business Platform',
    title: 'Grow Your',
    highlight: 'Business Smarter',
    sub: 'Retail, fashion, food, services & more   manage POS, inventory, staff & multi-branch operations in one place.',
    cta: 'Start Free Trial',
    ctaAction: 'login',
  },
  {
    heroImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=85',
    badge: 'Real-Time Analytics',
    title: 'Data-Driven',
    highlight: 'Decisions Daily',
    sub: 'Live dashboards, advanced reports and smart forecasting to maximize your profits.',
    cta: 'See Features',
    ctaAction: 'features',
  },
  {
    heroImage: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85',
    badge: 'Team & Operations',
    title: 'Manage Your',
    highlight: 'Entire Team',
    sub: 'Role-based access, attendance tracking, performance monitoring and activity logs.',
    cta: 'Get Started',
    ctaAction: 'login',
  },
  {
    heroImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b329f?auto=format&fit=crop&w=900&q=85',
    badge: 'Multi-Location Ready',
    title: 'Scale Across',
    highlight: 'Every Branch',
    sub: 'One unified platform, unlimited branches, real-time sync   grow without limits.',
    cta: 'View Plans',
    ctaAction: 'packages',
  },
];

const HERO_STATS = [
  { val: '50K+', label: 'Businesses', icon: Users },
  { val: '99.9%', label: 'Uptime', icon: Activity },
  { val: '24/7', label: 'Support', icon: Headphones },
];

const CORE_FEATURES = [
  { icon: Truck, title: 'Courier & Delivery',
    desc: 'Complete delivery management for online shops. Create orders, track shipments, manage multiple couriers.',
    items: ['Multi-courier integration', 'Real-time tracking & updates', 'Automated delivery scheduling'] },
  { icon: Users, title: 'Staff Management',
    desc: 'Complete employee management with roles, permissions, attendance tracking & performance monitoring.',
    items: ['Role-based access control', 'Attendance & performance tracking', 'Activity logs & reports'] },
  { icon: ShoppingBag, title: 'Advanced POS',
    desc: 'Lightning-fast point-of-sale with barcode scanning, multiple payment methods, and instant invoicing.',
    items: ['Real-time inventory updates', 'Customer loyalty & discounts', 'Split payments & refunds'] },
  { icon: Package, title: 'Smart Inventory',
    desc: 'Multi-location stock management with real-time sync for online shops and physical stores.',
    items: ['Online shop & store sync', 'Low stock alerts & auto-reorder', 'Batch tracking & expiry dates'] },
  { icon: Settings, title: 'Service / Repair Jobs',
    desc: 'For any service business! Track jobs from intake to completion with customer notifications.',
    items: ['Status tracking & workflow', 'Parts management & costing', 'Customer SMS updates'] },
  { icon: BarChart3, title: 'Advanced Analytics',
    desc: 'Real-time dashboards, reports, and business intelligence for data-driven decisions.',
    items: ['Sales & profit analysis', 'Staff performance metrics', 'Export to Excel / PDF'] },
  { icon: Globe, title: 'Multi-Location',
    desc: 'Manage unlimited branches, warehouses, and staff from one centralized dashboard.',
    items: ['Centralized control panel', 'Branch-specific permissions', 'Performance comparisons'] },
  { icon: Lock, title: 'Enterprise Security',
    desc: 'Bank-level security with role-based access control and comprehensive audit logs.',
    items: ['Multi-tenancy isolation', 'Granular permissions', 'Complete activity logging'] },
  { icon: Cloud, title: 'Cloud & Backup',
    desc: 'Automatic cloud backups, real-time data sync and 99.9% uptime guarantee.',
    items: ['Auto daily cloud backups', 'Real-time data sync', '99.9% uptime SLA'] },
];

const BUSINESS_TYPES = [
  { icon: ShoppingBag, title: 'Retail & Stores', desc: 'Clothing, furniture, groceries & more' },
  { icon: Package, title: 'Fashion & Apparel', desc: 'Boutiques, footwear, accessories' },
  { icon: Smartphone, title: 'Electronics & Gadgets', desc: 'Phones, computers, repair shops' },
  { icon: Globe, title: 'Online Shops', desc: 'E-commerce, social selling, delivery' },
  { icon: Settings, title: 'Service Businesses', desc: 'Repairs, salons, maintenance' },
  { icon: DollarSign, title: 'Food & Beverage', desc: 'Restaurants, cafes, supermarkets' },
  { icon: Truck, title: 'Wholesale & B2B', desc: 'Bulk orders, trade pricing' },
  { icon: Users, title: 'Multi-Branch Chains', desc: 'Franchises, retail networks' },
];

const ADVANCED_FEATURES = [
  { icon: Truck, title: 'Courier Integration', desc: 'Multiple courier services' },
  { icon: DollarSign, title: 'Installments', desc: 'Flexible payment plans' },
  { icon: Users, title: 'CRM', desc: 'Customer relationship mgmt' },
  { icon: Cpu, title: 'API Access', desc: 'RESTful API integration' },
  { icon: Cloud, title: 'Cloud Backup', desc: 'Auto daily backups' },
  { icon: TrendingUp, title: 'Sales Forecasting', desc: 'AI-powered predictions' },
  { icon: Layers, title: 'Warranty Mgmt', desc: 'Track device warranties' },
  { icon: Activity, title: 'Real-time Sync', desc: 'Instant data updates' },
  { icon: BarChart3, title: 'Custom Reports', desc: 'Build your own reports' },
  { icon: Smartphone, title: 'Mobile Ready', desc: 'Works on any device' },
  { icon: Lock, title: 'Role Permissions', desc: 'Granular access control' },
  { icon: Mail, title: 'Notifications', desc: 'Email, SMS & push alerts' },
];

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#packages' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const userRole = useAppSelector(selectUserRole);
  const initialized = useAppSelector(selectAuthInitialized);

  const { getSubscriptionPlans } = useSubscription();
  const [packages, setPackages] = useState<SubscriptionPlan[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Navbar
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // ── Scroll detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const sections = ['home', 'features', 'packages', 'about', 'contact'];
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) { setActiveSection(id); break; }
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setNavOpen(false);
  };

  // ── Slider auto-play ──────────────────────────────────────────────────────
  const goToSlide = useCallback((idx: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(idx);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % SLIDES.length);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length);
  }, [currentSlide, goToSlide]);

  useEffect(() => {
    autoPlayRef.current = setInterval(nextSlide, 5000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [nextSlide]);

  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(nextSlide, 5000);
  };

  const handleSlideAction = (action: string) => {
    if (action === 'login') navigate('/login');
    else scrollTo(action);
  };

  // ── Packages ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        const response = await getSubscriptionPlans({ isActive: true });
        if (response?.data?.plans) setPackages(response.data.plans);
        else if (Array.isArray(response?.data)) setPackages(response.data);
      } catch {
        setPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [getSubscriptionPlans]);

  const getPlanIcon = (planType: string) => {
    switch (planType?.toUpperCase()) {
      case 'BASIC': return <FiZap className="w-7 h-7" />;
      case 'STANDARD': case 'PRO': case 'PROFESSIONAL': return <FiStar className="w-7 h-7" />;
      case 'PREMIUM': case 'ENTERPRISE': return <FiAward className="w-7 h-7" />;
      default: return <FiCheck className="w-7 h-7" />;
    }
  };

  const planGradients = ['from-orange-400 to-orange-600', 'from-orange-500 to-orange-700', 'from-orange-600 to-orange-800'];

  // ── Void unused vars to avoid warnings ───────────────────────────────────
  void user; void userRole; void initialized;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" id="home">

      {/* ════════════════════════════════════════
          FLOATING GLASS NAVBAR
      ════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3">
          {/* Logo pill */}
          <button
            onClick={() => scrollTo('home')}
            className={`landing-glass-pill flex shrink-0 items-center gap-2.5 px-3 py-2 transition-all duration-300 hover:shadow-lg ${scrolled ? 'landing-glass-nav' : ''}`}
          >
            <img src="/favicon2.png" alt="SellMate" className="h-9 w-auto" />
            <span className="hidden text-base font-extrabold tracking-tight text-gray-900 sm:inline">
              Sell<span className="text-orange-600">Mate</span>
            </span>
          </button>

          {/* Center nav pill */}
          <nav className={`landing-glass-pill hidden flex-1 items-center justify-between gap-1 px-2 py-1.5 md:flex ${scrolled ? 'landing-glass-nav' : ''}`}>
            <div className="flex items-center gap-0.5">
              {NAV_LINKS.map(link => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href.slice(1))}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeSection === link.href.slice(1)
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white/60 hover:text-orange-600'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-700 hover:shadow-lg"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-700 hover:shadow-lg"
              >
                <Zap className="h-4 w-4" /> Free Trial
              </button>
            )}
          </nav>

          {/* Right actions pill */}
          <div className={`landing-glass-pill hidden shrink-0 items-center gap-1 p-1.5 md:flex ${scrolled ? 'landing-glass-nav' : ''}`}>
            {isAuthenticated ? null : (
              <button
                onClick={() => navigate('/login')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-white/70 hover:text-orange-600"
                aria-label="Sign in"
              >
                <LogIn className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="landing-glass-pill flex h-11 w-11 items-center justify-center text-gray-700 md:hidden"
            onClick={() => setNavOpen(!navOpen)}
            aria-label="Toggle menu"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <div className={`mx-auto mt-2 max-w-6xl overflow-hidden transition-all duration-300 md:hidden ${navOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="landing-glass-pill space-y-1 p-3">
            {NAV_LINKS.map(link => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href.slice(1))}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activeSection === link.href.slice(1) ? 'bg-orange-600 text-white' : 'text-gray-700 hover:bg-white/60 hover:text-orange-600'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => navigate('/login')} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-white/60">Sign In</button>
              <button onClick={() => navigate('/login')} className="flex-1 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white shadow-md">Free Trial</button>
            </div>
          </div>
        </div>
      </header>


      {/* ════════════════════════════════════════
          HERO   SPLIT GLASS LAYOUT
      ════════════════════════════════════════ */}
      <section className="landing-hero-glow relative min-h-screen overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36">
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-20 h-72 w-72 rounded-full bg-gray-200/50 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left   copy */}
            <div className="relative z-10">
              {SLIDES.map((slide, idx) => (
                <div
                  key={idx}
                  className={`transition-all duration-700 ${idx === currentSlide ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
                >
                  <div className="landing-glass-hero-panel mb-6 inline-flex items-center gap-2 px-4 py-2">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700">{slide.badge}</span>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                    </span>
                  </div>

                  <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                    {slide.title}{' '}
                    <span className="text-orange-600">{slide.highlight}</span>
                  </h1>

                  <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-600 sm:text-lg">
                    {slide.sub}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleSlideAction(slide.ctaAction)}
                      className="group flex items-center gap-2 rounded-2xl bg-orange-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-600/25 transition-all hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/30"
                    >
                      <Zap className="h-4 w-4" />
                      {slide.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <button
                      onClick={() => scrollTo('features')}
                      className="landing-glass-pill flex items-center gap-2 px-7 py-3.5 text-base font-bold text-gray-700 transition-all hover:bg-white/80"
                    >
                      <Play className="h-4 w-4 text-orange-600" /> Watch Demo
                    </button>
                  </div>

                  {/* Trust avatars */}
                  <div className="mt-10 flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {SLIDES.map((s, i) => (
                        <img key={i} src={s.heroImage} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm" />
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <FiStar key={i} className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                        ))}
                      </div>
                      <p className="text-xs font-medium text-gray-500">Trusted by growing businesses worldwide</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Slide controls */}
              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => { prevSlide(); resetAutoPlay(); }}
                  className="landing-glass-pill flex h-10 w-10 items-center justify-center text-gray-600 transition-all hover:text-orange-600"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1.5">
                  {SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { goToSlide(idx); resetAutoPlay(); }}
                      className={`rounded-full transition-all duration-300 ${idx === currentSlide ? 'h-2.5 w-8 bg-orange-600' : 'h-2.5 w-2.5 bg-gray-300 hover:bg-orange-300'}`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { nextSlide(); resetAutoPlay(); }}
                  className="landing-glass-pill flex h-10 w-10 items-center justify-center text-gray-600 transition-all hover:text-orange-600"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="ml-2 text-xs font-mono text-gray-400">
                  {String(currentSlide + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Right   human hero image */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-orange-400/15 blur-2xl" />
              <div className="landing-glass-hero-panel relative overflow-hidden p-2">
                {SLIDES.map((slide, idx) => (
                  <img
                    key={idx}
                    src={slide.heroImage}
                    alt="Business team growing with SellMate"
                    className={`aspect-[4/5] w-full rounded-2xl object-cover object-top transition-all duration-700 sm:aspect-[5/6] ${
                      idx === currentSlide ? 'relative opacity-100 scale-100' : 'pointer-events-none absolute inset-2 opacity-0 scale-[1.02]'
                    }`}
                  />
                ))}

                {/* Floating glass stats */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 sm:flex-row">
                  {HERO_STATS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="landing-glass-stat flex flex-1 items-center gap-2.5 px-3.5 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold leading-none text-gray-900">{s.val}</div>
                          <div className="mt-0.5 text-[10px] font-medium text-gray-500">{s.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Growth badge */}
                <div className="landing-glass-stat absolute right-4 top-4 flex items-center gap-2 px-3 py-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-bold text-gray-800">+40% Growth</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200/60">
          <div
            key={currentSlide}
            className="h-full bg-orange-600"
            style={{ animation: 'progressBar 5s linear forwards' }}
          />
        </div>
      </section>
      {/* ════════════════════════════════════════ */}


      {/* ════════════════════════════════════════
          MARQUEE TRUST BAR
      ════════════════════════════════════════ */}
      <div className="border-y border-white/40 bg-white/50 py-4 overflow-hidden backdrop-blur-xl">
        <div className="flex items-center gap-12 whitespace-nowrap" style={{ animation: 'marquee 30s linear infinite' }}>
          {['🚀 Lightning Fast POS','📦 Smart Inventory','🚚 Courier Integration','👥 Staff Management','📊 Advanced Analytics','🔒 Bank-Level Security','🌍 Multi-Branch Ready','💳 Flexible Payments','☁️ Cloud Backup','⚡ Real-Time Sync','🎯 Every Industry','👗 Fashion to Food','📱 Mobile Optimized',
            '🚀 Lightning Fast POS','📦 Smart Inventory','🚚 Courier Integration','👥 Staff Management','📊 Advanced Analytics','🔒 Bank-Level Security'].map((item, i) => (
            <span key={i} className="text-gray-700 font-semibold text-sm tracking-wide">{item}</span>
          ))}
        </div>
      </div>


      {/* ════════════════════════════════════════
          STATS SECTION
      ════════════════════════════════════════ */}
      <section className="landing-section-bg py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {[
              { val: '10+', label: 'Happy Businesses', icon: Users },
              { val: '5k+', label: 'Daily Transactions', icon: TrendingUp },
              { val: '99.9%', label: 'Uptime SLA', icon: Activity },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="landing-glass-card group p-6 text-center hover:-translate-y-1">
                  <div className="landing-icon-box mx-auto mb-4 h-14 w-14 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mb-1 text-3xl font-extrabold text-gray-900 lg:text-4xl">{s.val}</div>
                  <div className="text-sm font-medium text-gray-500">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          ONLINE BUSINESS HIGHLIGHT
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gray-900 py-24">
        <div className="absolute top-0 left-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="landing-glass-pill-dark mb-6 inline-flex items-center px-4 py-2">
                <FiTruck className="mr-2 text-orange-400" />
                <span className="text-sm font-semibold tracking-wider text-white">BUILT FOR EVERY BUSINESS TYPE</span>
              </div>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white lg:text-5xl">
                One Platform for<br />
                <span className="text-orange-400">Every Industry</span>
                <br />& Sales Channel
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Whether you sell clothing, groceries, electronics, or services   run online shops, physical stores, and deliveries from one powerful dashboard.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Multi-courier integration for fast deliveries',
                  'Staff management with role-based permissions',
                  'Unified inventory for online & offline channels',
                  'Works for any product or service   retail, fashion, food & more!',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-200">
                    <GlassCheck size="md" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="group flex items-center gap-2 rounded-2xl bg-orange-600 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-orange-600/25 transition-all duration-300 hover:bg-orange-700 hover:shadow-orange-600/40"
              >
                <FiZap /> Start Free Trial
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <FiTruck className="text-2xl" />, title: 'Courier Orders', desc: 'Create & track deliveries instantly', color: 'from-orange-500 to-orange-600' },
                { icon: <FiUsers className="text-2xl" />, title: 'Staff Control', desc: 'Manage employees efficiently', color: 'from-orange-600 to-orange-700' },
                { icon: <FiGlobe className="text-2xl" />, title: 'Online + Offline', desc: 'Unified platform for all sales', color: 'from-orange-400 to-orange-600' },
                { icon: <FiPackage className="text-2xl" />, title: 'Any Products', desc: 'Retail, fashion, food, services & more', color: 'from-orange-500 to-orange-700' },
                { icon: <FiBarChart2 className="text-2xl" />, title: 'Live Analytics', desc: 'Real-time performance data', color: 'from-orange-600 to-orange-800' },
                { icon: <FiShield className="text-2xl" />, title: 'Secure & Reliable', desc: 'Bank-level data protection', color: 'from-gray-600 to-gray-800' },
              ].map((card, i) => (
                <div key={i} className="landing-glass-pill-dark group p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-gray-900/50">
                  <div className="landing-icon-box mb-3 h-12 w-12 transition-transform group-hover:scale-110">
                    {card.icon}
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">{card.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          CORE FEATURES
      ════════════════════════════════════════ */}
      <section id="features" className="landing-section-bg py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(251,146,60,0.06),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={Zap}
            badge="POWERFUL FEATURES"
            title="Everything You Need to"
            highlight="Scale Your Business"
            subtitle="Enterprise-grade features designed for every modern business"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CORE_FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="landing-glass-card group relative overflow-hidden p-7 hover:-translate-y-1.5">
                  <div className="landing-icon-box mb-5 h-12 w-12 transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-extrabold text-gray-900">{f.title}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                  <ul className="space-y-2.5">
                    {f.items.map((item, ii) => (
                      <li key={ii} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <GlassCheck /> {item}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-orange-600 transition-transform duration-500 group-hover:scale-x-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          BUSINESS TYPES
      ════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={Target}
            badge="VERSATILE FOR ALL INDUSTRIES"
            title="Perfect For"
            highlight="Every Business"
            subtitle="From boutiques to supermarkets to repair shops   one platform adapts to your industry"
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {BUSINESS_TYPES.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="landing-glass-card group cursor-default p-5 transition-all hover:-translate-y-1 sm:p-6">
                  <div className="landing-icon-box mb-4 h-10 w-10 transition-transform group-hover:scale-110">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mb-1 text-sm font-extrabold text-gray-900">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-gray-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          ADVANCED CAPABILITIES
      ════════════════════════════════════════ */}
      <section className="landing-section-bg py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={Layers}
            badge="ADVANCED CAPABILITIES"
            title="More Features."
            highlight="More Power."
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {ADVANCED_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="landing-glass-card group p-5 hover:-translate-y-1">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="mb-0.5 text-sm font-bold text-gray-900">{f.title}</h4>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          PRICING PACKAGES
      ════════════════════════════════════════ */}
      <section id="packages" className="landing-section-bg py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={DollarSign}
            badge="PRICING PLANS"
            title="Choose Your Perfect"
            highlight="Package"
            subtitle="Flexible plans designed to grow with you. No hidden fees, cancel anytime."
          />
          <div className="mb-12 flex flex-wrap items-center justify-center gap-6">
            {['14-day free trial', 'No credit card required', 'Cancel anytime'].map((t, i) => (
              <div key={i} className="landing-glass-badge flex items-center gap-2 text-sm text-gray-600">
                <GlassCheck /> {t}
              </div>
            ))}
          </div>

          {loadingPackages ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-orange-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center"><FiZap className="text-orange-600" /></div>
              </div>
              <p className="mt-4 text-gray-500 font-medium">Loading plans...</p>
            </div>
          ) : packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {packages.map((pkg, index) => {
                const isPopular = index === 1;
                const gradToken = planGradients[index % planGradients.length];
                return (
                  <div
                    key={pkg.id}
                    className={`relative group landing-glass-card overflow-hidden transition-all duration-300 ${
                      isPopular ? 'shadow-2xl ring-4 ring-orange-300/60 scale-105 border-4 border-orange-500' : 'hover:-translate-y-2'
                    }`}
                  >
                    {isPopular && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-orange-600" />
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                          <Star className="h-3 w-3 fill-white text-white" /> MOST POPULAR
                        </div>
                      </>
                    )}
                    <div className="p-8">
                      <div className="landing-icon-box mb-5 h-14 w-14 text-2xl">
                        {getPlanIcon(pkg.plan_type)}
                      </div>
                      <h3 className="text-2xl font-extrabold text-gray-900 mb-1">{pkg.name}</h3>
                      <p className="text-gray-500 text-sm mb-6 min-h-[44px]">{pkg.description}</p>
                      <div className="mb-7 pb-7 border-b border-gray-100">
                        <div className="flex items-end gap-1">
                          <span className="text-2xl text-gray-400 font-semibold">LKR</span>
                          <span className="text-5xl font-black text-gray-900">{pkg.monthly_price}</span>
                          <span className="text-gray-400 text-lg mb-1">/mo</span>
                        </div>
                        {pkg.trial_days > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                            <Zap className="h-3 w-3 text-orange-600" /> {pkg.trial_days}-day free trial
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 mb-8">
                        {pkg.features && Object.keys(pkg.features).length > 0 ? (
                          Object.entries(pkg.features).filter(([, v]) => v === true).slice(0, 7).map(([key], i) => (
                            <div key={i} className="flex items-center gap-3">
                              <GlassCheck />
                              <span className="text-gray-700 text-sm font-medium">{key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            {pkg.max_users > 0 && <div className="flex items-center gap-3"><GlassCheck /><span className="text-sm font-medium text-gray-700">{pkg.max_users === -1 ? 'Unlimited users' : `Up to ${pkg.max_users} users`}</span></div>}
                            {pkg.max_branches > 0 && <div className="flex items-center gap-3"><GlassCheck /><span className="text-sm font-medium text-gray-700">{pkg.max_branches === -1 ? 'Unlimited branches' : `Up to ${pkg.max_branches} branches`}</span></div>}
                            {pkg.pos_enabled && <div className="flex items-center gap-3"><GlassCheck /><span className="text-sm font-medium text-gray-700">POS System</span></div>}
                            {pkg.advanced_reporting && <div className="flex items-center gap-3"><GlassCheck /><span className="text-sm font-medium text-gray-700">Advanced Reports</span></div>}
                            {pkg.api_access && <div className="flex items-center gap-3"><GlassCheck /><span className="text-sm font-medium text-gray-700">API Access</span></div>}
                            {pkg.courier_integration_enabled && <div className="flex items-center gap-3"><GlassCheck /><span className="text-sm font-medium text-gray-700">Courier Integration</span></div>}
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => navigate('/login')}
                        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                          isPopular ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/25 hover:bg-orange-700 hover:shadow-orange-600/40 transform hover:scale-105' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isPopular ? <FiZap /> : <FiArrowRight />}
                        {isPopular ? 'Get Started Now' : 'Get Started'}
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-orange-600 transition-transform duration-500 group-hover:scale-x-100" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex w-20 h-20 items-center justify-center bg-gray-100 rounded-full mb-5">
                <FiPackage className="text-gray-400 text-4xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Packages Available</h3>
              <p className="text-gray-500">Please check back later for our pricing plans.</p>
            </div>
          )}

          {/* Enterprise Banner */}
          <div className="landing-glass-card mt-4 overflow-hidden p-10 text-center">
            <div className="landing-icon-box mx-auto mb-4 h-16 w-16">
              <Globe className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-3xl font-extrabold text-gray-900">Need Enterprise Solution?</h3>
            <p className="mb-6 text-lg text-gray-500">Custom pricing for large organizations with specific requirements</p>
            <button
              onClick={() => scrollTo('contact')}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-orange-600/25 transition-all hover:bg-orange-700 hover:shadow-xl"
            >
              <Headphones className="h-5 w-5" /> Contact Sales Team
            </button>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gray-900 py-24">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={MessageCircle}
            badge="CLIENT STORIES"
            title="Trusted by"
            highlight="Thousands"
            subtitle="See why businesses love SellMate"
            dark
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: 'Sarah Johnson', role: 'Store Owner', company: 'Style Boutique',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
                rating: 5, tag: '+40% Sales',
                text: 'Absolutely game-changing for our fashion store! Sales increased by 40% and inventory across sizes and colors is effortless to manage.',
              },
              {
                name: 'Michael Chen', role: 'Operations Manager', company: 'Green Grocer',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
                rating: 5, tag: '8 Branches',
                text: 'Managing 8 supermarket branches was a nightmare before. Now everything is centralized with real-time visibility across all locations.',
              },
              {
                name: 'Emily Rodriguez', role: 'CEO', company: 'TechFix Services',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80',
                rating: 5, tag: 'Data-Driven',
                text: 'Perfect for our repair business   jobsheets, parts inventory, and customer updates in one place. Support team is exceptional too!',
              },
            ].map((t, idx) => (
              <div key={idx} className="landing-glass-pill-dark group p-7 transition-all duration-300 hover:-translate-y-1.5 hover:bg-gray-900/55 sm:p-8">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <span className="landing-glass-badge-dark px-3 py-1 text-xs font-semibold text-orange-300">{t.tag}</span>
                </div>
                <p className="mb-7 text-base leading-relaxed text-gray-200">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-white/10 pt-5">
                  <img src={t.avatar} alt={t.name} className="h-11 w-11 rounded-full border-2 border-white/20 object-cover" />
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          ABOUT
      ════════════════════════════════════════ */}
      <section id="about" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={Sparkles}
            badge="ABOUT US"
            title="Your Trusted"
            highlight="Technology Partner"
          />

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-5">
              {[
                { icon: Zap, title: 'Who We Are',
                  text: "SellMate is the leading enterprise SaaS platform for all types of businesses. With 10+ years of experience, we've empowered 50,000+ businesses worldwide to streamline operations and maximize profits." },
                { icon: Target, title: 'Our Mission',
                  text: 'To revolutionize business operations through innovative technology   providing complete cloud-based solutions integrating sales, inventory, repairs, and analytics into one powerful platform.' },
                { icon: Lock, title: 'Why Choose Us',
                  text: "Enterprise-grade security, 99.9% uptime SLA, and 24/7 expert support. We're committed to building lasting partnerships where your success is our success." },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="landing-glass-card p-6 transition-all hover:-translate-y-0.5">
                    <h3 className="mb-3 flex items-center gap-3 text-xl font-extrabold text-gray-900">
                      <span className="landing-icon-box h-9 w-9"><Icon className="h-4 w-4" /></span>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600">{item.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '10+', label: 'Years Experience', icon: TrendingUp },
                { val: '50K+', label: 'Happy Customers', icon: Users },
                { val: '24/7', label: 'Support Available', icon: Headphones },
                { val: '99.9%', label: 'Uptime SLA', icon: Activity },
                { val: '150+', label: 'Countries Served', icon: Globe },
                { val: '5M+', label: 'Transactions Daily', icon: BarChart3 },
                { val: '98%', label: 'Satisfaction Rate', icon: Star },
                { val: '<2min', label: 'Support Response', icon: Zap },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="landing-glass-card p-5 text-center transition-all hover:-translate-y-1">
                    <div className="landing-icon-box mx-auto mb-2 h-9 w-9">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="mb-0.5 text-2xl font-extrabold text-gray-900">{s.val}</div>
                    <div className="text-xs font-medium text-gray-500">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gray-900 py-28">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-orange-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-orange-500/10 blur-3xl" style={{ animationDelay: '1s' }} />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="landing-glass-badge-dark mb-8 inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-bold text-white">START YOUR FREE TRIAL TODAY</span>
          </div>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Ready to Transform<br />
            <span className="text-orange-400">Your Business?</span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-gray-300">
            Join thousands of successful businesses. No credit card required. Setup in under 5 minutes.
          </p>
          <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-3 rounded-2xl bg-orange-600 px-10 py-5 text-xl font-extrabold text-white shadow-xl shadow-orange-600/25 transition-all hover:bg-orange-700 hover:shadow-orange-600/40"
            >
              <Zap className="h-5 w-5" /> Start Free Trial
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="landing-glass-pill-dark flex items-center gap-3 px-10 py-5 text-xl font-extrabold text-white transition-all hover:bg-gray-900/55"
            >
              <Headphones className="h-5 w-5 text-orange-400" /> Talk to Sales
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {['No credit card required', '14-day free trial', 'Cancel anytime', 'Setup in 5 minutes'].map((t, i) => (
              <div key={i} className="landing-glass-badge-dark flex items-center gap-2 text-sm text-gray-300">
                <GlassCheck size="sm" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          CONTACT
      ════════════════════════════════════════ */}
      <section id="contact" className="landing-section-bg py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            icon={Headphones}
            badge="GET IN TOUCH"
            title="Contact Us"
            subtitle="Have questions? Our team is ready to help you succeed."
          />

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Form */}
            <div className="landing-glass-hero-panel p-8 sm:p-10">
              <h3 className="mb-7 flex items-center gap-3 text-2xl font-extrabold text-gray-900">
                <span className="landing-icon-box h-9 w-9">
                  <Mail className="h-4 w-4" />
                </span>
                Send us a Message
              </h3>
              <form className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                    <input type="text" className="w-full px-4 py-3 border-2 border-orange-100/80 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition bg-white/50 backdrop-blur-sm" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                    <input type="email" className="w-full px-4 py-3 border-2 border-orange-100/80 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition bg-white/50 backdrop-blur-sm" placeholder="john@company.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <input type="tel" className="w-full px-4 py-3 border-2 border-orange-100/80 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition bg-white/50 backdrop-blur-sm" placeholder="+1 (555) 000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                  <textarea rows={5} className="w-full px-4 py-3 border-2 border-orange-100/80 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition bg-white/50 backdrop-blur-sm resize-none" placeholder="How can we help you?" />
                </div>
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-lg font-bold text-white shadow-lg shadow-orange-600/25 transition-all hover:bg-orange-700 hover:shadow-xl">
                  <Mail className="h-5 w-5" /> Send Message <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div className="landing-glass-card bg-orange-600/95 p-8 text-white backdrop-blur-xl">
                <h3 className="mb-3 text-2xl font-extrabold">We&apos;re here for you</h3>
                <p className="mb-5 text-sm leading-relaxed text-white/85">
                  Our dedicated support team is available 24/7 to assist you. Reach out via any channel below.
                </p>
                <div className="landing-glass-badge-dark inline-flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-300" />
                  <span className="text-sm font-semibold text-white">Avg response: &lt; 2 minutes</span>
                </div>
              </div>

              {[
                { icon: FiMapPin, title: 'Address', lines: ['Nugegod, Colombo, Sri Lanka'] },
                { icon: FiPhone, title: 'Phone', lines: ['078 751 4907', '074 376 3907'] },
                { icon: FiMail, title: 'Email', lines: ['nextwavesoftwarehr@gmail.com'] },
                { icon: FiClock, title: 'Business Hours', lines: ['Mon–Fri: 9AM – 6PM', 'Saturday: 10AM – 4PM', 'Sunday: Closed'] },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="landing-glass-card flex items-start gap-4 p-5">
                    <div className="landing-icon-box h-11 w-11 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="mb-1 font-bold text-gray-900">{item.title}</h4>
                      {item.lines.map((line, li) => <p key={li} className="text-sm font-medium text-gray-600">{line}</p>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="bg-gray-950 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="landing-icon-box h-10 w-10">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-2xl font-extrabold">
                  Sell<span className="text-orange-400">Mate</span>
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-5">
                The all-in-one business management platform for retail, fashion, food, services, and every industry   online and offline.
              </p>
              <div className="flex gap-3">
                {['FB', 'TW', 'LI', 'IG'].map((s, i) => (
                  <div key={i} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-gray-400 transition-all hover:border-orange-500/30 hover:bg-orange-600 hover:text-white">
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm tracking-widest uppercase">Navigation</h4>
              <ul className="space-y-2">
                {NAV_LINKS.map(link => (
                  <li key={link.label}>
                    <button onClick={() => scrollTo(link.href.slice(1))} className="text-gray-400 hover:text-orange-400 text-sm transition-colors font-medium">
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm tracking-widest uppercase">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2"><FiMapPin className="text-orange-400 flex-shrink-0" />Colombo, Sri Lanka</li>
                <li className="flex items-center gap-2"><FiPhone className="shrink-0 text-orange-400" />078 751 4907</li>
                <li className="flex items-center gap-2"><FiMail className="text-orange-400 flex-shrink-0" />nextwavesoftwarehr@gmail.com</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <span>© 2026 Sell Mate. All rights reserved.</span>
            <div className="flex gap-4">
              <span className="hover:text-orange-400 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-orange-400 cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes progressBar { from { width: 0% } to { width: 100% } }
        @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes blob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(30px,-50px) scale(1.1); }
          66%       { transform: translate(-20px,20px) scale(0.9); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default HomePage;
