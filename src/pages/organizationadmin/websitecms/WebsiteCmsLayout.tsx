/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Globe, ExternalLink, Settings, Newspaper, FileText, Star, CreditCard } from 'lucide-react';
import { useCms } from '../../../hooks/useCms';
import { useAuth } from '../../../context/AuthContext';
import { useBusinessContext } from '../../../context/BusinessContext';
import { useT } from '../../../i18n/useT';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';

const navItems = [
  { to: '.', end: true, label: 'Site Settings', icon: Settings },
  { to: 'pages', end: false, label: 'Pages', icon: FileText },
  { to: 'blog', end: false, label: 'Blog / Promotions', icon: Newspaper },
  { to: 'testimonials', end: false, label: 'Testimonials', icon: Star },
  { to: 'payments', end: false, label: 'Payments', icon: CreditCard },
];

export interface CmsOutletContext {
  reloadPublishState: () => void;
}

function resolvePublicSiteBase(industryType: string): { base: string; label: string } | null {
  const shop = (import.meta.env.VITE_SHOP_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
  const rental = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';

  // Electronics / clothing shop storefront (:3001)
  if (industryType === 'ELECTRONICS' || industryType === 'CLOTHING') {
    return shop ? { base: shop, label: 'View shop site' } : null;
  }
  // Vehicle rental glass storefront (:3002)   not for car wash
  if (industryType === 'VEHICLE_RENTAL') {
    return rental ? { base: rental, label: 'View rental site' } : null;
  }
  // GENERAL demo: prefer shop if set, else rental
  if (industryType === 'GENERAL') {
    if (shop) return { base: shop, label: 'View live site' };
    if (rental) return { base: rental, label: 'View live site' };
    return null;
  }
  // CAR_WASH / GARAGE: no dedicated Next storefront on 3001/3002
  return null;
}

/** Shared shell for the Website / CMS sub-pages. */
export default function WebsiteCmsLayout() {
  const { getSettings } = useCms();
  const { t } = useT();
  const { user } = useAuth() as any;
  const { industryType } = useBusinessContext();
  const businessId = user?.businessId;
  const [isPublished, setIsPublished] = useState(false);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);

  const reloadPublishState = useCallback(async () => {
    const res = await getSettings();
    setIsPublished(Boolean((res?.data as any)?.isPublished));
    setSiteSlug((res?.data as any)?.siteSlug ?? null);
  }, [getSettings]);

  useEffect(() => { reloadPublishState(); }, [reloadPublishState]);

  const site = resolvePublicSiteBase(industryType);
  const publicPath = siteSlug || businessId;
  const publicUrl = site && publicPath ? `${site.base}/${publicPath}` : '';
  const context: CmsOutletContext = { reloadPublishState };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800"><Globe className="w-7 h-7" /> {t('website')}</h1>
        <LanguageSwitcher />
        {publicUrl && isPublished && (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline flex items-center gap-1">
            <ExternalLink className="w-4 h-4" /> {site?.label || 'View live site'}
          </a>
        )}
        {isPublished && !publicUrl && (industryType === 'CAR_WASH' || industryType === 'GARAGE') && (
          <span className="text-xs text-muted-foreground">
            No public shop/rental site for this industry. Use Appointments / estimate links instead.
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-px">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary bg-muted/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`
            }
          >
            <Icon className="w-4 h-4" /> {label}
          </NavLink>
        ))}
      </div>

      <Outlet context={context} />
    </div>
  );
}
