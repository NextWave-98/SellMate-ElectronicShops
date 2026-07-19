import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, FileText, BarChart3 } from 'lucide-react';
import { useT } from '../../../i18n/useT';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';

const navItems = [
  { to: '.', end: true, label: 'Chart of Accounts', icon: FileText },
  { to: 'journals', end: false, label: 'Journal Entries', icon: BookOpen },
  { to: 'reports', end: false, label: 'Reports', icon: BarChart3 },
];

/** Shared shell for the Accounting sub-pages. */
export default function AccountingLayout() {
  const { t } = useT();

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800"><BookOpen className="w-7 h-7" /> {t('accounting')}</h1>
        <LanguageSwitcher />
      </div>

      {/* Sub-navigation */}
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

      <Outlet />
    </div>
  );
}
