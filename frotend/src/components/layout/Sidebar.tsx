import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarClock,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  overdueCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ overdueCount }) => {
  const navItems = [
    { label: 'Dashboard', shortLabel: 'Dashboard', path: '/', icon: LayoutDashboard, badge: null },
    { label: 'Leads', shortLabel: 'Leads', path: '/leads', icon: Users, badge: null },
    { label: 'Pipeline Board', shortLabel: 'Pipeline', path: '/pipeline', icon: Kanban, badge: null },
    {
      label: 'Follow-ups',
      shortLabel: 'Follow-ups',
      path: '/followups',
      icon: CalendarClock,
      badge: overdueCount > 0 ? `${overdueCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    { label: 'Activity Log', shortLabel: 'Activity', path: '/activities', icon: Activity, badge: null },
  ];

  return (
    <>
      {/* Desktop Sidebar (Left side on lg screens) */}
      <aside className="hidden lg:flex lg:flex-col w-56 flex-shrink-0 bg-white border-r border-slate-200 h-full overflow-y-auto custom-scrollbar">
        <div className="flex flex-col h-full justify-between p-3">
          <div className="space-y-1">
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                        item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Phone App Style) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="grid grid-cols-5 items-center justify-around max-w-lg mx-auto px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 select-none group ${
                    isActive
                      ? 'text-blue-600 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`relative flex items-center justify-center p-1 rounded-full transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 scale-105'
                          : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
                      {item.badge && (
                        <span className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 text-[9px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                          {overdueCount > 99 ? '99+' : overdueCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] tracking-tight mt-0.5 leading-none truncate max-w-[62px]">
                      {item.shortLabel}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

