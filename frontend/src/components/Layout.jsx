import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { get } from '../services/api.js';
import { roleLabel, initials } from '../utils/format.js';

const NAV = [
  {
    section: 'Overview',
    items: [{ to: '/app', label: 'Dashboard', icon: 'bi-speedometer2', end: true }],
  },
  {
    section: 'School',
    items: [
      { to: '/app/students', label: 'Students', icon: 'bi-people-fill', perm: 'students:read' },
      { to: '/app/classes', label: 'Classes', icon: 'bi-building', perm: 'classes:read' },
      { to: '/app/academic-years', label: 'Academic Years', icon: 'bi-calendar3', perm: 'academicYears:read' },
      { to: '/app/fees', label: 'Fees & Materials', icon: 'bi-gem', perm: 'fees:read' },
    ],
  },
  {
    section: 'Teaching',
    items: [
      { to: '/app/attendance', label: 'Attendance', icon: 'bi-calendar2-check', perm: 'attendance:read' },
      { to: '/app/assessments', label: 'Assessments', icon: 'bi-clipboard-check', perm: 'assessments:read' },
      { to: '/app/assessments/report', label: 'Performance Report', icon: 'bi-graph-up-arrow', perm: 'assessments:read' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/app/payments', label: 'Payments', icon: 'bi-receipt-cutoff', perm: 'payments:read' },
      { to: '/app/payments/balances', label: 'Student Balances', icon: 'bi-balance-scale', perm: 'payments:read' },
      { to: '/app/payments/ranking', label: 'Payment Ranking', icon: 'bi-sort-numeric-up-alt', perm: 'payments:read' },
      { to: '/app/payments/high-debt', label: 'Significant Debt', icon: 'bi-exclamation-octagon', perm: 'payments:read' },
      { to: '/app/reports', label: 'Reports', icon: 'bi-bar-chart-line', perm: 'reports:read' },
    ],
  },
  {
    section: 'Stock',
    items: [
      { to: '/app/uniforms', label: 'Uniforms', icon: 'bi-tag', perm: 'uniforms:read' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/app/users', label: 'Users', icon: 'bi-person-badge', perm: 'users:read' },
      { to: '/app/audit', label: 'Audit Log', icon: 'bi-search', perm: 'audit:read' },
      { to: '/app/notifications', label: 'Notifications', icon: 'bi-bell', perm: 'notifications:read' },
      { to: '/app/settings', label: 'Settings', icon: 'bi-gear', perm: 'settings:read' },
    ],
  },
];

function currentPageLabel(pathname) {
  for (const group of NAV) {
    for (const item of group.items) {
      if (item.end ? pathname === item.to : pathname.startsWith(item.to)) return item.label;
    }
  }
  return '';
}

export default function Layout() {
  const { user, logout, can } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('School Management System');
  const [schoolLogo, setSchoolLogo] = useState('');

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [n, s] = await Promise.all([get('/notifications/unread-count'), get('/settings/branding')]);
        if (!alive) return;
        setUnread(n.unread || 0);
        if (s.settings?.school_name) setSchoolName(s.settings.school_name);
        if (s.settings?.school_logo) setSchoolLogo(s.settings.school_logo);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="relative flex items-center gap-3 px-5 py-6">
        {schoolLogo ? (
          <img
            src={schoolLogo}
            alt={schoolName}
            className="h-11 w-11 shrink-0 rounded-xl border border-gold-400/40 bg-white object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <img src="/img/crest.svg" alt="" aria-hidden="true" className="h-11 w-11 shrink-0 drop-shadow" />
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-semibold text-white">{schoolName}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-gold-300/80">Management System</p>
        </div>
      </div>
      <div className="lux-rule mx-4 mb-3" />

      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.perm || can(i.perm));
          if (!items.length) return null;
          return (
            <div key={group.section}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-300/60">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                          isActive
                            ? 'bg-white/10 font-semibold text-white ring-1 ring-gold-400/30'
                            : 'text-emerald-100/75 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <i className={`${item.icon} w-5 text-center text-base ${isActive ? 'text-gold-300' : 'opacity-70'}`} />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gold-400/15 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-xs font-bold text-ink-900">
            {initials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-gold-300/80">{roleLabel(user?.role)}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="rounded-lg p-2 text-gold-200/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );

  const pageTitle = currentPageLabel(location.pathname);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 lg:block no-print dark:from-ink-950 dark:via-ink-950 dark:to-black">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-gradient-to-b from-ink-900 to-ink-950 shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-gold-100/70 bg-white/85 px-3 backdrop-blur-md sm:px-6 no-print dark:border-ink-800 dark:bg-ink-900/80">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-ink-700 hover:bg-gold-50 lg:hidden dark:text-cream-100 dark:hover:bg-ink-800"
              aria-label="Open menu"
            >
              <i className="bi bi-list text-xl leading-none" />
            </button>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-ink-900 dark:text-cream-50 sm:hidden">
                {pageTitle || 'Dashboard'}
              </p>
              <p className="hidden truncate text-sm text-gray-500 sm:block dark:text-gray-400">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5">
            <button
              onClick={toggle}
              title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg p-2 text-ink-700 transition-colors hover:bg-gold-50 dark:text-cream-100 dark:hover:bg-ink-800"
            >
              <i className={`bi ${resolved === 'dark' ? 'bi-brightness-high' : 'bi-moon-stars'} text-lg leading-none`} />
            </button>

            <button
              onClick={() => navigate('/app/notifications')}
              className="relative rounded-lg p-2 text-ink-700 transition-colors hover:bg-gold-50 dark:text-cream-100 dark:hover:bg-ink-800"
              aria-label="Notifications"
            >
              <i className="bi bi-bell text-lg leading-none" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink-950">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-gold-50 sm:px-2 dark:hover:bg-ink-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-[11px] font-bold text-ink-900">
                  {initials(user?.fullName)}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink-800 sm:block dark:text-cream-100">
                  {user?.fullName}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="lux-card absolute right-0 z-40 mt-2 w-52 rounded-2xl py-1">
                    <div className="border-b border-gold-100/70 px-4 py-2 dark:border-ink-700">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-cream-50">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel(user?.role)}</p>
                    </div>
                    <button
                      onClick={() => navigate('/app/profile')}
                      className="block w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-gold-50 dark:text-cream-100 dark:hover:bg-ink-800"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => navigate('/app/settings')}
                      className="block w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-gold-50 dark:text-cream-100 dark:hover:bg-ink-800"
                    >
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
