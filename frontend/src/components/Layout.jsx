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
    section: 'School Feeding',
    items: [{ to: '/app/meals', label: 'Meal Payments', icon: 'bi-cup-hot', perm: 'students:read' }],
  },
  {
    section: 'Stock',
    items: [
      { to: '/app/inventory', label: 'Inventory', icon: 'bi-box-seam', perm: 'inventory:read' },
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
      <div className="flex items-center gap-2.5 px-5 py-5">
        {schoolLogo ? (
          <img
            src={schoolLogo}
            alt={schoolName}
            className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-white object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white">
            {initials(schoolName) || 'GS'}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{schoolName}</p>
          <p className="truncate text-xs text-green-200">Management System</p>
        </div>
      </div>

      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.perm || can(i.perm));
          if (!items.length) return null;
          return (
            <div key={group.section}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-green-300/70">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-green-600 font-semibold text-white shadow-sm'
                            : 'text-green-100/90 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <i className={`${item.icon} w-5 text-center text-base opacity-80`} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
            {initials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-green-200">{roleLabel(user?.role)}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="rounded-lg p-2 text-green-200 hover:bg-white/10 hover:text-white"
          >
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );

  const pageTitle = currentPageLabel(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-green-900 lg:block no-print dark:bg-gray-900">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-green-900 shadow-2xl dark:bg-gray-900">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-green-100 bg-white px-3 sm:px-6 no-print dark:border-gray-800 dark:bg-gray-900">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Open menu"
            >
              <i className="bi bi-list text-xl leading-none" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 sm:hidden">
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
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <i className={`bi ${resolved === 'dark' ? 'bi-brightness-high' : 'bi-moon-stars'} text-lg leading-none`} />
            </button>

            <button
              onClick={() => navigate('/app/notifications')}
              className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Notifications"
            >
              <i className="bi bi-bell text-lg leading-none" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-gray-100 sm:px-2 dark:hover:bg-gray-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
                  {initials(user?.fullName)}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-gray-700 sm:block dark:text-gray-200">
                  {user?.fullName}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-40 mt-1 w-52 rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-50 px-4 py-2 dark:border-gray-700">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel(user?.role)}</p>
                    </div>
                    <button
                      onClick={() => navigate('/app/profile')}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => navigate('/app/settings')}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
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

        <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
