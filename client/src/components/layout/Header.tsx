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
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset visibility on route navigation
  useEffect(() => {
    setIsVisible(true);
    lastScrollY.current = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, [currentPath]);

  // Handle scroll detection for mobile view (hide on scroll down, show on scroll up)
  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      const delta = currentScrollY - lastScrollY.current;

      // Always visible near top of page
      if (currentScrollY <= 10) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        ticking = false;
        return;
      }

      // Scrolling down past threshold -> hide
      if (delta > 6) {
        setIsVisible(false);
        setIsDropdownOpen(false);
        lastScrollY.current = currentScrollY;
      }
      // Scrolling up past threshold -> reveal navbar immediately
      else if (delta < -6) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const designation = (user?.designation || '').toLowerCase();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = (user as any)?.role === 'MANAGER';
  const isSalesOffice = (user?.role === 'USER' || (user as any)?.role === 'SALES') && designation.includes('sales');
  const isServiceOffice = (user?.role === 'USER' || (user as any)?.role === 'SERVICE') && designation.includes('service');
  const isAccountantOffice = user?.role === 'USER' && designation.includes('accountant');
  const isHrOffice = (user?.role === 'USER' || (user as any)?.role === 'HR') && (designation.includes('hr') || designation.includes('human resources'));

  const getDashboardTitle = (): string => {
    if (isAdmin) return 'Admin Dashboard';
    if (isServiceOffice) return 'Service Dashboard';
    if (isSalesOffice) return 'Sales Dashboard';
    if (isAccountantOffice) return 'Accountant Dashboard';
    if (isHrOffice) return 'HR Dashboard';
    if (isManager) return 'Manager Dashboard';
    return 'Employee Dashboard';
  };

  const getPageTitle = (path: string): string => {
    // 1. Dashboards
    if (
      path === '/admin/dashboard' ||
      path === '/admin' ||
      path === '/employee/dashboard' ||
      path === '/dashboard' ||
      path === '/service-dashboard' ||
      path === '/accountant/dashboard' ||
      path === '/hr/dashboard' ||
      path === '/'
    ) {
      return getDashboardTitle();
    }

    // 2. Customer Equipment & Installed Assets
    if (path.startsWith('/customer-equipment') || path.startsWith('/admin/customer-equipment')) {
      const parts = path.split('?')[0].split('/').filter(Boolean);
      const isDetail = parts.length >= 2 && parts[0] === 'customer-equipment';
      return isDetail ? 'Equipment Asset Details' : 'Customer Equipment';
    }

    // 3. Follow-ups & Reminders
    if (path.startsWith('/follow-ups') || path.startsWith('/admin/follow-ups')) {
      return 'Follow-ups & Reminders';
    }

    // 4. Sales Orders
    if (path.startsWith('/sales-orders') || path.startsWith('/admin/sales-orders')) {
      return 'Sales Orders';
    }

    // 5. Invoices (Sales & Vendor)
    if (path.startsWith('/invoices') || path.startsWith('/admin/invoices')) {
      return 'Invoice Management';
    }

    // 6. Dispatch / Delivery Challan
    if (path.startsWith('/dispatches') || path.startsWith('/admin/dispatches')) {
      return 'Dispatch & Delivery Challan';
    }

    // 7. Procurement, POs, GRN, Suppliers
    if (path.startsWith('/procurement') || path.startsWith('/admin/procurement')) {
      return 'Procurement & Orders';
    }
    if (path.startsWith('/purchase-orders')) {
      return 'Purchase Orders';
    }
    if (path.startsWith('/goods-receipts')) {
      return 'Goods Receipts (GRN)';
    }
    if (path.startsWith('/suppliers')) {
      return 'Suppliers & Vendors';
    }

    // 8. AMC Contracts
    if (path.startsWith('/amc-contracts') || path.startsWith('/admin/amc-contracts')) {
      const parts = path.split('?')[0].split('/').filter(Boolean);
      const isDetail = parts.length >= 2 && parts[0] === 'amc-contracts';
      return isDetail ? 'AMC Contract Details' : 'AMC Contracts';
    }

    // 9. Quotations & Deals
    if (path === '/quotations/new') return 'New Quotation';
    if (path.startsWith('/quotations/') && path.endsWith('/edit')) return 'Edit Quotation';
    if (path.startsWith('/quotations/') && path.split('?')[0].split('/').filter(Boolean).length > 1) {
      return 'Quotation Details';
    }
    if (path.startsWith('/quotations')) {
      return isServiceOffice ? 'Service Quotations' : 'Quotations & Proposals';
    }

    // 10. Field Service (FSR)
    if (path === '/field-service/reports') return 'Field Service Reports';
    if (path === '/field-service/my-visits') return 'My Service Visits';
    if (path === '/field-service/new') return 'New Field Service Report';
    if (path.startsWith('/field-service/') && path.endsWith('/edit')) return 'Edit Service Report';
    if (path.startsWith('/field-service/') && path.split('?')[0].split('/').filter(Boolean).length > 1) {
      return 'Service Visit Details';
    }
    if (path.startsWith('/field-service')) return 'Field Service (FSR)';

    // 11. Field Tasks / Tasks
    if (path.startsWith('/tasks') || path.startsWith('/admin/tasks')) {
      return isServiceOffice ? 'Field Task Management' : 'Field Tasks';
    }

    // 12. Attendance
    if (path === '/employee/attendance') return 'My Attendance';
    if (path.startsWith('/attendance') || path.startsWith('/admin/attendance')) {
      return isHrOffice ? 'Employee Attendance' : 'Attendance Management';
    }

    // 13. Customers
    if (path.startsWith('/customers') || path.startsWith('/admin/customers')) {
      const parts = path.split('?')[0].split('/').filter(Boolean);
      const isDetail = parts.length >= 2 && parts[0] === 'customers';
      return isDetail ? 'Customer Details' : 'Customer Management';
    }

    // 14. Leads & Pipeline
    if (path.startsWith('/leads') || path.startsWith('/admin/leads')) return 'Lead Management';
    if (path.startsWith('/pipeline') || path.startsWith('/admin/pipeline')) return 'Deals Pipeline';

    // 15. Employees
    if (path.startsWith('/employees') || path.startsWith('/admin/employees')) return 'Employee Management';

    // 16. Products / Equipment & Inventory
    if (path.startsWith('/products') || path.startsWith('/equipment') || path.startsWith('/inventory')) {
      return 'Equipment & Inventory';
    }

    // 17. Reports & Analytics
    if (path.startsWith('/admin/reports') || path.startsWith('/reports')) return 'Reports & Analytics';
    if (path.startsWith('/analytics')) return 'Energy Telemetry';

    // 18. WhatsApp
    if (path.startsWith('/admin/whatsapp') || path.startsWith('/whatsapp')) return 'WhatsApp Integration';

    // 19. Settings & Profile
    if (path.startsWith('/settings')) return 'System Configuration';
    if (path.startsWith('/profile')) return 'My Profile';

    return getDashboardTitle();
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
    <header
      className={`fixed lg:sticky top-0 left-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between transition-transform duration-300 ease-in-out lg:translate-y-0 ${isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
    >
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
                    <span>{getDashboardTitle()}</span>
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
