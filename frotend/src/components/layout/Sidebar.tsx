import React from 'react';
import { NavLink } from 'react-router-dom';
import { crmApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  overdueCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, overdueCount }) => {
  const { showToast } = useToast();

  const handleResetData = () => {
    if (window.confirm('Reset all leads, tasks and logs to initial demo state?')) {
      crmApi.resetDemoData();
      showToast('Demo data reseeded to fresh initial state', 'info');
      window.location.reload();
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', badge: null },
    { label: 'Leads', path: '/leads', badge: null },
    { label: 'Pipeline Board', path: '/pipeline', badge: null },
    {
      label: 'Follow-ups',
      path: '/followups',
      badge: overdueCount > 0 ? `${overdueCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    { label: 'Activity Log', path: '/activities', badge: null },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3">
      <div className="space-y-1">
        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <span>{item.label}</span>
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
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 mb-2">
          <p className="font-medium text-slate-700">Aflix CRM Sandbox</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Seeded with enterprise demo leads</p>
        </div>
        <button
          onClick={handleResetData}
          className="w-full text-center px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
        >
          Reset Demo Data
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 flex-shrink-0 bg-white border-r border-slate-200 h-full overflow-y-auto custom-scrollbar">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80%] bg-white h-full shadow-2xl flex flex-col z-50">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">Aflix Mini CRM</span>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
