import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onMenuToggle: () => void;
  overdueCount: number;
  onNewLeadClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuToggle,
  overdueCount,
  onNewLeadClick,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-xs">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Aflix Infotech
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">
              MINI CRM
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick New Lead Button */}
        <button
          onClick={onNewLeadClick}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <span>+</span>
          <span>New Lead</span>
        </button>

        {/* Overdue alert indicator */}
        {overdueCount > 0 && (
          <div
            title={`${overdueCount} overdue follow-up tasks`}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>{overdueCount} Overdue</span>
          </div>
        )}

        {/* User Chip & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
            {user?.avatarInitials || 'US'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">
              {user?.role?.replace('_', ' ') || 'Sales'}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors ml-1"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};
