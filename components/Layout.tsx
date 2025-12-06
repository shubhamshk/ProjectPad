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
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { AppRoute } from '../types';

export const Layout: React.FC = () => {
  const { user, projects, logout, setCurrentProject } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate(AppRoute.LOGIN);
  };

  const isActive = (path: string) => location.pathname === path;

  // Reusable Sidebar Content
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#050505] border-r border-white/10">
      {/* Logo */}
      <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(160,108,213,0.4)]">
          <span className="font-bold text-white text-lg">P</span>
        </div>
        <span className="font-bold text-lg tracking-tight text-white">ProjectPad AI</span>
      </div>

      {/* Global Actions */}
      <div className="p-4 space-y-4">
        <button className="w-full flex items-center justify-between px-3 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-white/5 rounded-xl text-sm text-gray-400 hover:text-white transition-all duration-200 group">
          <span className="flex items-center gap-2">
            <Search size={14} className="group-hover:text-purple-400 transition-colors" /> Search
          </span>
          <kbd className="hidden md:inline-block bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5 text-gray-500">⌘K</kbd>
        </button>

        {/* Limits Display */}
        <div className="px-1 space-y-4">
          {/* Project Limit */}
          <div>
            <div className="flex justify-between text-xs mb-2 font-medium">
              <span className="text-gray-400">Projects</span>
              <span className={user?.plan === 'free' && (user?.project_count || 0) >= 3 ? 'text-red-400' : 'text-gray-400'}>
                {user?.project_count || 0} / {user?.plan === 'free' ? '3' : '∞'}
              </span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${user?.plan === 'free' && (user?.project_count || 0) >= 3 ? 'bg-red-500' : 'bg-purple-500'}`}
                style={{ width: `${Math.min(((user?.project_count || 0) / (user?.plan === 'free' ? 3 : 100)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Monthly Creations Limit */}
          <div>
            <div className="flex justify-between text-xs mb-2 font-medium">
              <span className="text-gray-400">Monthly Creations</span>
              <span className={user?.plan === 'free' && (user?.monthly_project_creations || 0) >= 3 ? 'text-red-400' : 'text-gray-400'}>
                {user?.monthly_project_creations || 0} / {user?.plan === 'free' ? '3' : '∞'}
              </span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${user?.plan === 'free' && (user?.monthly_project_creations || 0) >= 3 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(((user?.monthly_project_creations || 0) / (user?.plan === 'free' ? 3 : 100)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Credits */}
          {/* Credits */}
          <div className="bg-[#111] p-3 rounded-xl border border-white/5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                <span className="text-sm font-bold text-white">Credits</span>
              </div>
              <span className={`text-sm font-bold ${(user?.credits || 0) < 25 ? 'text-red-400' : 'text-white'}`}>
                {user?.credits || 0}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden relative z-10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${(user?.credits || 0) > 100 ? 'bg-green-500' :
                  (user?.credits || 0) >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                style={{ width: `${Math.min(((user?.credits || 0) / 300) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 relative z-10">Each chat costs 25 credits</p>
          </div>

          {/* Upgrade Button */}
          {((user?.plan === 'free' && (user?.credits || 0) < 25) || user?.plan === 'free') && (
            <button
              onClick={() => {
                navigate(AppRoute.BILLING);
                setIsMobileMenuOpen(false);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <Sparkles size={12} /> Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Platform</p>

        <NavItem
          to={AppRoute.DASHBOARD}
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={isActive(AppRoute.DASHBOARD)}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <NavItem
          to={AppRoute.SETTINGS}
          icon={<Settings size={18} />}
          label="Settings"
          active={isActive(AppRoute.SETTINGS)}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <NavItem
          to={AppRoute.BILLING}
          icon={<CreditCard size={18} />}
          label="Billing"
          active={isActive(AppRoute.BILLING)}
          onClick={() => setIsMobileMenuOpen(false)}
        />

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
                setIsMobileMenuOpen(false);
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
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#050505] text-gray-200 overflow-hidden font-sans">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-xs z-50 md:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">

        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#050505]/90 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <span className="font-bold text-white tracking-tight">ProjectPad</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Updated NavItem with onClick for mobile close
const NavItem = ({ to, icon, label, active, onClick }: { to: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
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