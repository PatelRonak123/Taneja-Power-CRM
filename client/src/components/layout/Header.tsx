import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { navigate, useCurrentPath } from '../../app/router/navigation';
import {
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuthStore();
  const currentPath = useCurrentPath();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const getPageTitle = (path: string): string => {
    if (path === '/admin/dashboard' || path === '/admin') return 'Admin Dashboard';
    if (path === '/employees' || path === '/admin/employees') return 'Employee Management';
    if (path === '/customers' || path === '/admin/customers') return 'Customer Management';
    if (path === '/tasks' || path === '/admin/tasks') return 'Field Tasks';
    if (path === '/attendance' || path === '/admin/attendance') return 'Employee Attendance';
    if (path === '/admin/whatsapp' || path === '/whatsapp') return 'WhatsApp Integration';
    if (path === '/employee/dashboard' || path === '/dashboard') return 'Employee Dashboard';
    if (path === '/products') return 'Equipment & Inventory';
    if (path === '/analytics') return 'Energy Telemetry';
    if (path === '/settings') return 'System Configuration';
    if (path === '/profile') return 'My Profile';
    return isAdmin ? 'Admin Dashboard' : 'Employee Dashboard';
  };

  const pageTitle = getPageTitle(currentPath);

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between">
      {/* Left Title & Mobile Menu Trigger */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={onToggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">{pageTitle}</h2>
      </div>

      {/* Right User Controls */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2.5 p-1.5 md:px-3 md:py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-all cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">{user.fullName}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{user.role}</span>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">{user.fullName}</span>
                    <span className="text-[11px] text-slate-500 truncate">{user.email}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 self-start">
                      {isAdmin ? <ShieldCheck size={11} /> : <Zap size={11} />}
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate(isAdmin ? '/admin/dashboard' : '/employee/dashboard');
                    }}
                  >
                    <LayoutDashboard size={15} className="text-slate-400" />
                    <span>{isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}</span>
                  </button>

                  <button
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <User size={15} className="text-slate-400" />
                    <span>My Profile</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">Demo Mode</div>
        )}
      </div>
    </header>
  );
};
