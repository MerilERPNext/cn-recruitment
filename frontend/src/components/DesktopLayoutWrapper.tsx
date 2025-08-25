import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useScreenSize } from '../hooks/useScreenSize';
import {
  Home,
  Calendar,
  User,
  DollarSign,
  ArrowUpDown,
  Receipt,
  Shield,
  LogOut,
  Bell,
  ChevronDown,
  Settings
} from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useUnreadNoticesCount } from '../hooks/useNotices';
import defaultProfile from '../assets/face-rec.png';
import logo from '../assets/logo.png';

interface DesktopLayoutWrapperProps {
  children: React.ReactNode;
  title?: string;
  actionButton?: React.ReactNode;
}

const DesktopLayoutWrapper: React.FC<DesktopLayoutWrapperProps> = ({
  children,
  title,
  actionButton
}) => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // If not desktop, render children as-is (mobile layout)
  if (!isDesktop) {
    return <>{children}</>;
  }

  const navigationItems = [
    { 
      icon: Home, 
      label: "Dashboard", 
      path: "/webapp/", 
      active: location.pathname === "/webapp/" 
    },
    { 
      icon: Calendar, 
      label: "Leaves & Holidays", 
      path: "/webapp/leave-app",
      active: location.pathname.startsWith("/webapp/leave-app")
    },
    { 
      icon: User, 
      label: "Attendance", 
      path: "/webapp/attendance",
      active: location.pathname.startsWith("/webapp/attendance")
    },
    { 
      icon: DollarSign, 
      label: "Compensation", 
      path: "/webapp/salary-slip-app",
      active: location.pathname.startsWith("/webapp/salary-slip-app")
    },
    { 
      icon: ArrowUpDown, 
      label: "Shifts", 
      path: "/webapp/shift-request",
      active: location.pathname.startsWith("/webapp/shift-request")
    },
    { 
      icon: Receipt, 
      label: "Expenses", 
      path: "/webapp/expenses-app",
      active: location.pathname.startsWith("/webapp/expenses-app")
    },
    { 
      icon: Shield, 
      label: "Policies", 
      path: "/webapp/policies-app",
      active: location.pathname.startsWith("/webapp/policies-app")
    },
  ];

  const getPageTitle = () => {
    if (title) return title;
    
    const activeItem = navigationItems.find(item => item.active);
    return activeItem?.label || "Dashboard";
  };

  const handleNotificationClick = () => {
    navigate("/webapp/notices");
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full z-10 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="PayWise" className="w-8 h-8" />
            <div>
              <h2 className="font-semibold text-gray-900">PayWise</h2>
              <p className="text-sm text-gray-500">Employee Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg w-full">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
            <p className="text-gray-600">Manage your {getPageTitle().toLowerCase()}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Action Button (e.g., for attendance requests) */}
            {actionButton && (
              <div className="mr-2">
                {actionButton}
              </div>
            )}

            <button
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>
            
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 text-right">
                    {currentUser?.full_name || currentUser?.first_name || "Employee"}
                  </p>
                  <p className="text-xs text-gray-500 text-right">
                    {currentUser?.email || "employee@company.com"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
                  <img
                    src={currentUser?.user_image || defaultProfile}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-300">
                        <img
                          src={currentUser?.user_image || defaultProfile}
                          alt="User avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {currentUser?.full_name || currentUser?.first_name || "Employee"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {currentUser?.email || "employee@company.com"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        navigate("/webapp/my-profile");
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        // Add settings navigation if needed
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={() => {
                        // Add logout functionality
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

    </div>
  );
};

export default DesktopLayoutWrapper;
