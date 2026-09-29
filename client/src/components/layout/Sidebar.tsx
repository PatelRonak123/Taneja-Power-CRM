import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { navigate, useCurrentPath } from '../../app/router/navigation';
import {
  ShieldCheck,
  Users,
  Building2,
  Target,
  Layers,
  ClipboardList,
  Home,
  Zap,
  BarChart3,
  Settings,
  User,
  MessageSquare,
  CalendarCheck,
  LogOut,
  ChevronRight,
  PieChart,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  Wrench,
  CalendarClock,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout } = useAuthStore();
  const currentPath = useCurrentPath();
  const isAdmin = user?.role === 'ADMIN';

  // Persistent sidebar collapsed state for desktop view
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (err) {
        console.error('Failed to persist sidebar collapse state:', err);
      }
      return next;
    });
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const adminNavItems = [
    {
      id: 'admin-dashboard',
      path: '/admin/dashboard',
      aliasPaths: ['/admin'],
      label: 'Dashboard',
      icon: ShieldCheck,
      description: 'System overview & metrics',
    },
    {
      id: 'employee-management',
      path: '/employees',
      aliasPaths: ['/admin/employees'],
      label: 'Employee Management',
      icon: Users,
      description: 'Staff directory & access',
    },
    {
      id: 'customer-management',
      path: '/customers',
      aliasPaths: ['/admin/customers'],
      label: 'Customers',
      icon: Building2,
      description: 'Clients & service sites',
    },
    {
      id: 'lead-management',
      path: '/leads',
      aliasPaths: ['/admin/leads'],
      label: 'Lead Management',
      icon: Target,
      description: 'Leads pipeline & status tracking',
    },
    {
      id: 'pipeline-management',
      path: '/pipeline',
      aliasPaths: ['/admin/pipeline'],
      label: 'Deals Pipeline',
      icon: Layers,
      description: 'Kanban workflow & deals',
    },
    {
      id: 'follow-up-management',
      path: '/follow-ups',
      aliasPaths: ['/admin/follow-ups'],
      label: 'Follow-ups & Reminders',
      icon: CalendarClock,
      description: 'Scheduled interactions & touchpoints',
    },
    {
      id: 'field-service-management',
      path: '/field-service',
      aliasPaths: ['/field-service/reports', '/field-service/my-visits', '/field-service/new'],
      label: 'Field Service (FSR)',
      icon: Wrench,
      description: 'UPS visits & battery logs',
    },
    {
      id: 'quotation-management',
      path: '/quotations',
      aliasPaths: ['/quotations/new'],
      label: 'Quotations & Proposals',
      icon: FileSpreadsheet,
      description: 'Commercial proposals & pricing',
    },
    {
      id: 'amc-contract-management',
      path: '/amc-contracts',
      aliasPaths: [],
      label: 'AMC Contracts',
      icon: ShieldCheck,
      description: 'Maintenance contracts & schedule',
    },
    {
      id: 'task-management',
      path: '/tasks',
      aliasPaths: ['/admin/tasks'],
      label: 'Field Tasks',
      icon: ClipboardList,
      description: 'Work orders & assignments',
    },
    {
      id: 'attendance-management',
      path: '/attendance',
      aliasPaths: ['/admin/attendance'],
      label: 'Attendance',
      icon: CalendarCheck,
      description: 'Check-in & daily logs',
    },
    {
      id: 'whatsapp-integration',
      path: '/admin/whatsapp',
      aliasPaths: ['/whatsapp'],
      label: 'WhatsApp Integration',
      icon: MessageSquare,
      description: 'Messaging & alerts',
    },
    {
      id: 'reports',
      path: '/admin/reports',
      aliasPaths: ['/reports'],
      label: 'Reports & Analytics',
      icon: PieChart,
      description: 'Charts & data insights',
    },
  ];

  const designation = (user?.designation || '').toLowerCase();
  const isSalesOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designation.includes('sales');
  const isServiceOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designation.includes('service');
  const isAccountantOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designation.includes('accountant');
  const isHrOffice = (user?.role === 'USER' || (user as any)?.role === 'HR') && user?.workType === 'OFFICE' && (designation.includes('hr') || designation.includes('human resources'));

  const coreNavItems = isAdmin
    ? [
        { id: 'products', path: '/products', aliasPaths: ['/equipment'], label: 'Equipment & Inventory', icon: Zap },
        { id: 'analytics', path: '/analytics', aliasPaths: [], label: 'Energy Telemetry', icon: BarChart3 },
        { id: 'settings', path: '/settings', aliasPaths: [], label: 'System Configuration', icon: Settings },
        { id: 'profile', path: '/profile', aliasPaths: [], label: 'My Profile', icon: User },
      ]
    : isHrOffice
    ? [
        {
          id: 'hr-dashboard',
          path: '/employee/dashboard',
          aliasPaths: ['/dashboard', '/hr/dashboard'],
          label: 'HR Dashboard',
          icon: Home,
        },
        {
          id: 'hr-my-attendance',
          path: '/employee/attendance',
          aliasPaths: [],
          label: 'My Attendance',
          icon: CalendarCheck,
        },
        {
          id: 'hr-employee-attendance',
          path: '/attendance',
          aliasPaths: ['/admin/attendance'],
          label: 'Employee Attendance',
          icon: CalendarCheck,
        },
        {
          id: 'hr-employees',
          path: '/employees',
          aliasPaths: ['/admin/employees'],
          label: 'Employee Management',
          icon: Users,
        },
        { id: 'profile', path: '/profile', aliasPaths: [], label: 'My Profile', icon: User },
      ]
    : isAccountantOffice
    ? [
        {
          id: 'accountant-dashboard',
          path: '/employee/dashboard',
          aliasPaths: ['/dashboard', '/accountant/dashboard'],
          label: 'Accountant Dashboard',
          icon: Home,
        },
        {
          id: 'employee-customers',
          path: '/customers',
          aliasPaths: ['/admin/customers'],
          label: 'Customers',
          icon: Building2,
        },
        {
          id: 'employee-pipeline',
          path: '/pipeline',
          aliasPaths: ['/admin/pipeline'],
          label: 'Deals Pipeline',
          icon: Layers,
        },
        {
          id: 'employee-quotations',
          path: '/quotations',
          aliasPaths: [],
          label: 'Quotations & Deals',
          icon: FileSpreadsheet,
        },
        {
          id: 'employee-follow-ups',
          path: '/follow-ups',
          aliasPaths: ['/admin/follow-ups'],
          label: 'Follow-ups',
          icon: CalendarClock,
        },
        {
          id: 'products',
          path: '/products',
          aliasPaths: ['/equipment'],
          label: 'Equipment & Inventory',
          icon: Zap,
        },
        {
          id: 'employee-amc-contracts',
          path: '/amc-contracts',
          aliasPaths: [],
          label: 'AMC Contracts',
          icon: ShieldCheck,
        },
        {
          id: 'employee-attendance',
          path: '/employee/attendance',
          aliasPaths: ['/attendance'],
          label: 'My Attendance',
          icon: CalendarCheck,
        },
        {
          id: 'profile',
          path: '/profile',
          aliasPaths: [],
          label: 'My Profile',
          icon: User,
        },
      ]
    : isServiceOffice
    ? [
        {
          id: 'employee-dashboard',
          path: '/employee/dashboard',
          aliasPaths: ['/dashboard'],
          label: 'Service Dashboard',
          icon: Home,
        },
        {
          id: 'employee-customers',
          path: '/customers',
          aliasPaths: ['/admin/customers'],
          label: 'Customers',
          icon: Building2,
        },
        {
          id: 'employee-quotations',
          path: '/quotations',
          aliasPaths: ['/quotations/new'],
          label: 'Service Quotations',
          icon: FileSpreadsheet,
        },
        {
          id: 'employee-amc-contracts',
          path: '/amc-contracts',
          aliasPaths: [],
          label: 'AMC Contracts',
          icon: ShieldCheck,
        },
        {
          id: 'employee-follow-ups',
          path: '/follow-ups',
          aliasPaths: ['/admin/follow-ups'],
          label: 'Follow-ups',
          icon: CalendarClock,
        },
        {
          id: 'employee-field-service',
          path: '/field-service',
          aliasPaths: ['/field-service/reports', '/field-service/my-visits', '/field-service/new'],
          label: 'Field Service (FSR)',
          icon: Wrench,
        },
        {
          id: 'employee-tasks',
          path: '/tasks',
          aliasPaths: ['/admin/tasks'],
          label: 'My Tasks',
          icon: ClipboardList,
        },
        {
          id: 'employee-attendance',
          path: '/employee/attendance',
          aliasPaths: ['/attendance'],
          label: 'My Attendance',
          icon: CalendarCheck,
        },
        { id: 'profile', path: '/profile', aliasPaths: [], label: 'My Profile', icon: User },
      ]
    : isSalesOffice
    ? [
        {
          id: 'employee-dashboard',
          path: '/employee/dashboard',
          aliasPaths: ['/dashboard'],
          label: 'Sales Dashboard',
          icon: Home,
        },
        {
          id: 'employee-customers',
          path: '/customers',
          aliasPaths: ['/admin/customers'],
          label: 'Customers',
          icon: Building2,
        },
        {
          id: 'employee-leads',
          path: '/leads',
          aliasPaths: ['/admin/leads'],
          label: 'Lead Management',
          icon: Target,
        },
        {
          id: 'employee-pipeline',
          path: '/pipeline',
          aliasPaths: ['/admin/pipeline'],
          label: 'Deals Pipeline',
          icon: Layers,
        },
        {
          id: 'employee-follow-ups',
          path: '/follow-ups',
          aliasPaths: ['/admin/follow-ups'],
          label: 'Follow-ups',
          icon: CalendarClock,
        },
        {
          id: 'employee-quotations',
          path: '/quotations',
          aliasPaths: ['/quotations/new'],
          label: 'Quotations & Proposals',
          icon: FileSpreadsheet,
        },
        {
          id: 'employee-tasks',
          path: '/tasks',
          aliasPaths: ['/admin/tasks'],
          label: 'My Tasks',
          icon: ClipboardList,
        },
        {
          id: 'employee-amc-contracts',
          path: '/amc-contracts',
          aliasPaths: [],
          label: 'AMC Contracts',
          icon: ShieldCheck,
        },
        { id: 'products', path: '/products', aliasPaths: ['/equipment'], label: 'Equipment & Inventory', icon: Zap },
        {
          id: 'employee-attendance',
          path: '/employee/attendance',
          aliasPaths: ['/attendance'],
          label: 'My Attendance',
          icon: CalendarCheck,
        },
        { id: 'profile', path: '/profile', aliasPaths: [], label: 'My Profile', icon: User },
      ]
    : [
        {
          id: 'employee-dashboard',
          path: '/employee/dashboard',
          aliasPaths: ['/dashboard'],
          label: 'Employee Dashboard',
          icon: Home,
        },
        {
          id: 'employee-customers',
          path: '/customers',
          aliasPaths: ['/admin/customers'],
          label: 'Customers',
          icon: Building2,
        },
        {
          id: 'employee-quotations',
          path: '/quotations',
          aliasPaths: ['/quotations/new'],
          label: 'Quotations & Proposals',
          icon: FileSpreadsheet,
        },
        {
          id: 'employee-tasks',
          path: '/tasks',
          aliasPaths: ['/admin/tasks'],
          label: 'My Tasks',
          icon: ClipboardList,
        },
        {
          id: 'employee-follow-ups',
          path: '/follow-ups',
          aliasPaths: ['/admin/follow-ups'],
          label: 'Follow-ups',
          icon: CalendarClock,
        },
        {
          id: 'employee-amc-contracts',
          path: '/amc-contracts',
          aliasPaths: [],
          label: 'AMC Contracts',
          icon: ShieldCheck,
        },
        { id: 'products', path: '/products', aliasPaths: ['/equipment'], label: 'Equipment & Inventory', icon: Zap },
        {
          id: 'employee-attendance',
          path: '/employee/attendance',
          aliasPaths: ['/attendance'],
          label: 'My Attendance',
          icon: CalendarCheck,
        },
        { id: 'profile', path: '/profile', aliasPaths: [], label: 'My Profile', icon: User },
      ];

  const isItemActive = (path: string, aliasPaths: string[] = []) => {
    return currentPath === path || aliasPaths.includes(currentPath);
  };

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen bg-slate-950 border-r border-slate-800/90 text-slate-300 flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none shadow-2xl lg:shadow-none ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      {/* Brand Header & Toggle Button */}
      <div
        className={`px-3.5 py-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center min-h-[65px] transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'
          }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 px-1.5 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden">
              <img
                src="/logo.png"
                alt="Taneja Power Logo"
                className="h-7 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col min-w-0 transition-opacity duration-300">
              <h1 className="font-bold text-white text-sm tracking-tight leading-tight truncate">
                Taneja Power
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] uppercase tracking-wider text-orange-400 font-bold bg-orange-950/60 border border-orange-500/30 px-1.5 py-0.2 rounded shrink-0">
                  Industrial
                </span>

              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="hidden lg:flex p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-200 cursor-pointer shrink-0 shadow-xs"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Scrollable Navigation Groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden flex flex-col gap-4 custom-scrollbar no-scrollbar">
        {/* ADMINISTRATION GROUP */}
        {isAdmin && (
          <div className="flex flex-col">
            {!isCollapsed ? (
              <div className="px-2.5 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Administration
                </span>
                <span className="text-[9px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800/50 px-1.5 py-0.2 rounded">
                  ADMIN
                </span>
              </div>
            ) : (
              <div className="w-full border-t border-slate-800/80 my-2" />
            )}
            <div className="flex flex-col gap-1 pt-0.5">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.path, item.aliasPaths);
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => handleNavClick(item.path)}
                    className={`group relative w-full flex items-center transition-all duration-200 text-left cursor-pointer border ${isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold'
                      } ${active
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40 border-blue-500/50'
                        : 'border-transparent text-slate-400 hover:bg-slate-900/90 hover:text-slate-100 hover:border-slate-800/50'
                      }`}
                  >
                    <div
                      className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 ${active
                        ? 'bg-white/20 text-white shadow-xs'
                        : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 group-hover:text-blue-400 group-hover:border-slate-700'
                        }`}
                    >
                      <Icon size={16} />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 tracking-tight text-[13px]">
                          {item.label}
                        </span>
                        {active && <ChevronRight size={14} className="text-white/80 shrink-0" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CORE MODULES GROUP */}
        <div className="flex flex-col">
          {!isCollapsed ? (
            <div className="px-2.5 pb-2 flex items-center justify-between border-t border-slate-800/60 pt-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Core Modules
              </span>
            </div>
          ) : (
            <div className="w-full border-t border-slate-800/80 my-2" />
          )}
          <div className="flex flex-col gap-1 pt-0.5">
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.path, item.aliasPaths);
              return (
                <button
                  key={item.id}
                  type="button"
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => handleNavClick(item.path)}
                  className={`group relative w-full flex items-center transition-all duration-200 text-left cursor-pointer border ${isCollapsed ? 'justify-center p-2 rounded-xl' : 'gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold'
                    } ${active
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40 border-blue-500/50'
                      : 'border-transparent text-slate-400 hover:bg-slate-900/90 hover:text-slate-100 hover:border-slate-800/50'
                    }`}
                >
                  <div
                    className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 ${active
                      ? 'bg-white/20 text-white shadow-xs'
                      : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 group-hover:text-blue-400 group-hover:border-slate-700'
                      }`}
                  >
                    <Icon size={16} />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 tracking-tight text-[13px]">
                        {item.label}
                      </span>
                      {active && <ChevronRight size={14} className="text-white/80 shrink-0" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sidebar Footer User & Status Badge */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-900/60 flex flex-col gap-2">
        <div
          className={`flex items-center rounded-xl bg-slate-950/70 border border-slate-800/80 transition-all duration-200 ${isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
            }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7.5 h-7.5 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {user?.fullName || 'Administrator'}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-tight">
                  {user?.email || 'admin@tanejapower.com'}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="w-full py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer flex items-center justify-center"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
};
