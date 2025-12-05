import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  CreditCard,
  User,
  LogOut,
  Plus,
  Search,
  Command,
  Sparkles
} from 'lucide-react';
import { useStore } from '../store';
import { AppRoute } from '../types';

export const Layout: React.FC = () => {
  const { user, projects, logout, setCurrentProject } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate(AppRoute.LOGIN);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen w-full bg-[#050505] text-gray-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/10 bg-[#050505]">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(160,108,213,0.4)]">
            <span className="font-bold text-white text-lg">P</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">ProjectPad AI</span>
        </div>

        {/* Global Actions */}
        <div className="p-4 space-y-4">
          <button className="w-full flex items-center justify-between px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
            <span className="flex items-center gap-2">
              <Search size={14} /> Search
            </span>
            <kbd className="bg-white/10 px-1.5 rounded text-[10px] font-mono border border-white/10">⌘K</kbd>
          </button>

          {/* Limits Display */}
          <div className="px-2 space-y-3">
            {/* Project Limit */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Projects</span>
                <span className={user?.plan === 'free' && (user?.project_count || 0) >= 3 ? 'text-red-400' : 'text-gray-400'}>
                  {user?.project_count || 0} / {user?.plan === 'free' ? '3' : '∞'}
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${user?.plan === 'free' && (user?.project_count || 0) >= 3 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(((user?.project_count || 0) / (user?.plan === 'free' ? 3 : 100)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Monthly Creations Limit */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Monthly Creations</span>
                <span className={user?.plan === 'free' && (user?.monthly_project_creations || 0) >= 3 ? 'text-red-400' : 'text-gray-400'}>
                  {user?.monthly_project_creations || 0} / {user?.plan === 'free' ? '3' : '∞'}
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${user?.plan === 'free' && (user?.monthly_project_creations || 0) >= 3 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(((user?.monthly_project_creations || 0) / (user?.plan === 'free' ? 3 : 100)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Credits */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-yellow-400" />
                  <span className="text-xs font-medium text-gray-300">Credits</span>
                </div>
                <span className={`text-xs font-bold ${(user?.credits || 0) < 25 ? 'text-red-400' : 'text-white'}`}>
                  {user?.credits || 0}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${(user?.credits || 0) > 100 ? 'bg-green-500' :
                      (user?.credits || 0) >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${Math.min(((user?.credits || 0) / 300) * 100, 100)}%` }}
                />
              </div>

              <p className="text-[10px] text-gray-500">Each chat costs 25 credits</p>
            </div>

            {((user?.plan === 'free' && (user?.credits || 0) < 25) || user?.plan === 'free') && (
              <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md text-xs font-bold text-white shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Sparkles size={12} /> Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Platform</p>

          <NavItem to={AppRoute.DASHBOARD} icon={<LayoutDashboard size={18} />} label="Dashboard" active={isActive(AppRoute.DASHBOARD)} />
          <NavItem to={AppRoute.SETTINGS} icon={<Settings size={18} />} label="Settings" active={isActive(AppRoute.SETTINGS)} />
          <NavItem to={AppRoute.BILLING} icon={<CreditCard size={18} />} label="Billing" active={isActive(AppRoute.BILLING)} />

          <div className="pt-6 pb-2 flex items-center justify-between px-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</p>
            <button className="text-gray-500 hover:text-white transition-colors">
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setCurrentProject(p.id);
                  navigate(`/project/${p.id}`);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 group ${location.pathname === `/project/${p.id}`
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                  }`}
              >
                <FolderOpen size={16} className={location.pathname === `/project/${p.id}` ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-400'} />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/5 bg-[#080808]">
          <div className="flex items-center gap-3 mb-3">
            <img src={user?.avatar_url} alt="User" className="w-8 h-8 rounded-full border border-white/20" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) => (
  <NavLink
    to={to}
    className={`
      flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
      ${active
        ? 'bg-white/10 text-white shadow-sm border border-white/5'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'}
    `}
  >
    {icon}
    {label}
  </NavLink>
);