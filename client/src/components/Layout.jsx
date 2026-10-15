import { ClipboardList, KeyRound, Layers, LayoutGrid, LogOut, Menu, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const ADMIN_NAV = [
  {
    heading: 'Access control',
    items: [
      { to: '/access-control/roles', label: 'Roles', icon: ShieldCheck },
      { to: '/access-control/permission-matrix', label: 'Permission Matrix', icon: LayoutGrid },
      { to: '/access-control/approval-levels', label: 'Approval Levels', icon: Layers },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { to: '/access-control/users', label: 'Role Assignment', icon: Users },
      { to: '/access-control/reports', label: 'Reports', icon: ClipboardList },
      { to: '/access-control/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ],
  },
];

const TOOLS_NAV = {
  heading: 'My account',
  items: [{ to: '/access-control/access-check', label: 'My Access', icon: KeyRound }],
};

function NavItems({ groups, onNavigate }) {
  return (
    <nav className="space-y-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-2 text-xs font-medium text-neutral-400">{group.heading}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-white/[0.08] text-white before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-1 before:rounded-r before:bg-brass'
                        : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
        <ShieldCheck className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-white">ERP Console</p>
        <p className="text-xs text-neutral-400">Settings</p>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = isAdmin ? [...ADMIN_NAV, TOOLS_NAV] : [TOOLS_NAV];

  return (
    <div className="min-h-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-950 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavItems groups={groups} />
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-neutral-900/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-brand-950">
            <button
              type="button"
              className="absolute right-3 top-4 text-neutral-400 hover:text-white"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Brand />
            <div className="flex-1 overflow-y-auto">
              <NavItems groups={groups} onNavigate={() => setMenuOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="icon-btn lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-neutral-500 sm:block">
              Settings <span className="mx-1 text-neutral-300">/</span> <span className="font-medium text-neutral-700">Access control</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && <NotificationBell />}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-neutral-900">{user?.name}</p>
              <p className="text-xs text-neutral-500">{user?.role?.name}</p>
            </div>
            <button type="button" className="btn btn-secondary px-3 py-1.5" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
