import React, { useState, useEffect } from 'react';
import {
  useAllNotices,
  useUnreadNotices,
  useArchivedNotices,
  useUnreadNoticesCount,
  useMarkNoticeAsRead,
  useArchiveNotice,
  useDismissNotice,
} from '../hooks/useNotices';
import type { Notice } from '../types/notice';

// Type definitions for component props
interface HeaderProps {
  title: string;
  onBackClick: () => void;
}

interface NavTabProps {
  label: string;
  isActive: boolean;
  hasNotification?: boolean;
  onClick: () => void;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount: number;
}

interface NoticeIconProps {
  icon: React.ComponentType;
  color: string;
  bgColor: string;
}

interface ActionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  className?: string;
  disabled?: boolean;
}

interface NoticeCardProps {
  notice: Notice;
  onActionClick: (noticeId: string, actionType: string, silent?: boolean) => void;
  isLoading?: boolean;
}

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}



interface NoticesListProps {
  notices?: Notice[];
  onActionClick: (noticeId: string, actionType: string, silent?: boolean) => void;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  activeTab: string;
}

// Icon Components using SVGs
const BackIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
  </svg>
);

const ErrorIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
  </svg>
);

const CampaignIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,120v16a40,40,0,0,1-40,40H164a20,20,0,0,1-20,20H112a20,20,0,0,1-20-20H72a40,40,0,0,1-40-40V120a40,40,0,0,1,40-40H92a20,20,0,0,1,20-20h32a20,20,0,0,1,20,20h20A40,40,0,0,1,224,120ZM72,96a24,24,0,0,0-24,24v16a24,24,0,0,0,24,24H208V120a24,24,0,0,0-24-24Z"></path>
  </svg>
);

const WorkIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72H216ZM40,130.84A200.19,200.19,0,0,0,128,152a200.19,200.19,0,0,0,88-21.16V200H40Z"></path>
  </svg>
);

const BadgeIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V88H40ZM40,200V104H216v96Z"></path>
  </svg>
);

const EventIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-96-88v64a8,8,0,0,1-16,0V132.94l-4.42,2.22a8,8,0,0,1-7.16-14.32l16-8A8,8,0,0,1,112,120Zm59.16,30.45L152,176h16a8,8,0,0,1,0,16H136a8,8,0,0,1-6.4-12.8l28.78-38.37A8,8,0,1,0,145.07,132a8,8,0,1,1-13.85-8A24,24,0,0,1,176,136,23.76,23.76,0,0,1,171.16,150.45Z"></path>
  </svg>
);

const SearchIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M230.92,212l-54.32-54.32a88.21,88.21,0,1,0-18.84,18.84L212,230.92a12,12,0,1,0,18.92-15Zm-203.15-100a64,64,0,1,1,64,64A64.07,64.07,0,0,1,27.77,112Z"></path>
  </svg>
);

const LoadingIcon = () => (
  <svg className="animate-spin" fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M232,128a104,104,0,0,1-208,0c0-41,23.81-78.36,60.66-95.27a8,8,0,0,1,6.68,14.54C60.15,61.59,40,93.27,40,128a88,88,0,0,0,176,0c0-34.73-20.15-66.41-51.34-80.73a8,8,0,0,1,6.68-14.54C208.19,49.64,232,87,232,128Z"></path>
  </svg>
);

// Header Component
const Header = ({ title, onBackClick }: HeaderProps) => (
  <header className="bg-white shadow-sm sticky top-0 z-10">
    <div className="flex items-center p-4 pb-3 justify-between">
      <button
        className="text-gray-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        onClick={onBackClick}
      >
        <BackIcon />
      </button>
      <h1 className="text-gray-800 text-xl font-semibold leading-tight flex-1 text-center pr-10">
        {title}
      </h1>
    </div>
  </header>
);

// Navigation Tab Component
const NavTab = ({ label, isActive, hasNotification, onClick }: NavTabProps) => (
  <a
    className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-3 flex-1 relative cursor-pointer ${
      isActive
        ? 'border-b-blue-500 text-blue-500'
        : 'border-b-transparent text-gray-600 hover:text-gray-800'
    }`}
    onClick={onClick}
  >
    <p className="text-sm font-semibold">{label}</p>
    {hasNotification && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    )}
  </a>
);

// Navigation Component
const Navigation = ({ activeTab, onTabChange, unreadCount }: NavigationProps) => (
  <nav className="pb-0">
    <div className="flex border-b border-gray-200 px-4 gap-4">
      <NavTab
        label="All"
        isActive={activeTab === 'all'}
        onClick={() => onTabChange('all')}
      />
      <NavTab
        label="Unread"
        isActive={activeTab === 'unread'}
        hasNotification={unreadCount > 0}
        onClick={() => onTabChange('unread')}
      />
      <NavTab
        label="Archived"
        isActive={activeTab === 'archived'}
        onClick={() => onTabChange('archived')}
      />
    </div>
  </nav>
);

// Unread Indicator Component
const UnreadIndicator = ({ color = 'bg-blue-500' }) => (
  <div className={`absolute top-2 right-2 w-3 h-3 ${color} rounded-full`} title="Unread notification" />
);

// Notice Icon Component
const NoticeIcon = ({ icon: Icon, color, bgColor }: NoticeIconProps) => (
  <div className={`${color} flex items-center justify-center rounded-full ${bgColor} shrink-0 size-10`}>
    <Icon />
  </div>
);

// Action Button Component
const ActionButton = ({ children, onClick, variant = 'primary', className = '', disabled = false }: ActionButtonProps) => {
  const baseClasses = "text-xs font-medium py-1.5 px-3 rounded-md transition-colors";
  const variantClasses: Record<string, string> = {
    primary: "bg-blue-500 text-white hover:bg-blue-700 disabled:bg-blue-300",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabled ? 'cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Notice Card Component
const NoticeCard = ({ notice, onActionClick, isLoading = false }: NoticeCardProps) => {
  const getIconComponent = () => {
    const iconMap: Record<Notice['iconType'], { icon: React.ComponentType; color: string; bgColor: string }> = {
      error: { icon: ErrorIcon, color: 'text-red-500', bgColor: 'bg-red-100' },
      campaign: { icon: CampaignIcon, color: 'text-blue-500', bgColor: 'bg-blue-50' },
      work: { icon: WorkIcon, color: 'text-green-500', bgColor: 'bg-green-100' },
      badge: { icon: BadgeIcon, color: 'text-purple-500', bgColor: 'bg-purple-100' },
      event: { icon: EventIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
      search: { icon: SearchIcon, color: 'text-teal-500', bgColor: 'bg-teal-100' }
    };
    return iconMap[notice.iconType] || iconMap.campaign;
  };

  const iconConfig = getIconComponent();
  const borderColor = notice.priority === 'high' ? 'border-red-200' : 'border-gray-200';
  const unreadColor = notice.priority === 'high' ? 'bg-red-500' : 'bg-blue-500';

  // Auto-mark as read when notice comes into view (for unread notices)
  useEffect(() => {
    if (notice.isUnread && !isLoading) {
      const timer = setTimeout(() => {
        onActionClick(notice.id, 'mark_as_read', true); // silent = true for auto-marking
      }, 2000); // Auto-mark as read after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [notice.isUnread, notice.id, onActionClick, isLoading]);

  return (
    <div className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border ${borderColor} relative`}>
      {notice.isUnread && <UnreadIndicator color={unreadColor} />}
      
      <NoticeIcon
        icon={iconConfig.icon}
        color={iconConfig.color}
        bgColor={iconConfig.bgColor}
      />
      
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-1">
          <p className="text-gray-800 text-base font-semibold leading-tight">{notice.title}</p>
          <p className="text-gray-600 text-xs font-normal">{notice.time}</p>
        </div>
        <p className="text-gray-600 text-sm font-normal leading-relaxed line-clamp-2 mb-2">
          {notice.message}
        </p>
        {notice.action && (
          <ActionButton
            variant={notice.action.variant}
            onClick={() => onActionClick(notice.id, notice.action!.type)}
            disabled={isLoading}
          >
            {isLoading ? <LoadingIcon /> : notice.action.label}
          </ActionButton>
        )}
      </div>
    </div>
  );
};

// Loading Skeleton Component
const NoticeCardSkeleton = () => (
  <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-pulse">
    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
    <div className="flex-grow space-y-2">
      <div className="flex justify-between items-start">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="space-y-1">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
);

// Error Component
const ErrorMessage = ({ message, onRetry }: ErrorMessageProps) => (
  <div className="p-4 text-center">
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center justify-center mb-2">
        <ErrorIcon />
      </div>
      <p className="text-red-700 font-medium mb-2">Error Loading Notices</p>
      <p className="text-red-600 text-sm mb-4">{message}</p>
      <button
        className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 transition-colors"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ activeTab }: { activeTab: string }) => {
  const messages: Record<string, string> = {
    all: "No notices available",
    unread: "No unread notices",
    archived: "No archived notices"
  };

  return (
    <div className="p-8 text-center">
      <div className="text-gray-400 mb-4">
        <CampaignIcon />
      </div>
      <p className="text-gray-600 font-medium">{messages[activeTab] || messages.all}</p>
      <p className="text-gray-500 text-sm mt-1">You're all caught up!</p>
    </div>
  );
};

// Notices List Component
const NoticesList = ({ notices, onActionClick, isLoading, error, onRetry, activeTab }: NoticesListProps) => {
  if (error) {
    return <ErrorMessage message={error.message} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <main className="p-4 space-y-3">
        {[...Array(3)].map((_, index) => (
          <NoticeCardSkeleton key={index} />
        ))}
      </main>
    );
  }

  if (!notices || notices.length === 0) {
    return <EmptyState activeTab={activeTab} />;
  }

  return (
    <main className="p-4 space-y-3">
      {notices.map((notice: Notice) => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          onActionClick={onActionClick}
        />
      ))}
    </main>
  );
};

// Main component
const Notices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');

  // Use appropriate hook based on active tab
  const allNoticesQuery = useAllNotices();
  const unreadNoticesQuery = useUnreadNotices();
  const archivedNoticesQuery = useArchivedNotices();
  const unreadCountQuery = useUnreadNoticesCount();

  // Mutation hooks
  const markAsReadMutation = useMarkNoticeAsRead();
  const archiveMutation = useArchiveNotice();
  const dismissMutation = useDismissNotice();

  // Get current data based on active tab
  const getCurrentQuery = () => {
    switch (activeTab) {
      case 'unread':
        return unreadNoticesQuery;
      case 'archived':
        return archivedNoticesQuery;
      default:
        return allNoticesQuery;
    }
  };

  const currentQuery = getCurrentQuery();
  const notices = currentQuery.data || [];
  const isLoading = currentQuery.isLoading;
  const error = currentQuery.error;

  // Auto mark as read when notice is viewed
  useEffect(() => {
    if (activeTab === 'unread' && notices.length > 0) {
      notices.forEach(notice => {
        if (notice.isUnread) {
          // Mark as read after 2 seconds of viewing
          const timer = setTimeout(() => {
            markAsReadMutation.mutate(notice.id);
          }, 2000);
          return () => clearTimeout(timer);
        }
      });
    }
  }, [notices, activeTab, markAsReadMutation]);

  // Event handlers
  const handleBackClick = () => {
    console.log('Back button clicked');
    // Handle navigation back - you can use your router here
    // Example: router.back() or navigate(-1)
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'all' | 'unread' | 'archived');
    console.log(`Tab changed to: ${tab}`);
  };

  const handleActionClick = async (noticeId: string, actionType: string, silent = false) => {
    if (!silent) {
      console.log(`Action clicked: ${actionType} for notice ${noticeId}`);
    }

    try {
      switch (actionType) {
        case 'mark_as_read':
          await markAsReadMutation.mutateAsync(noticeId);
          break;
        case 'view_task':
          // Mark as read first, then navigate
          await markAsReadMutation.mutateAsync(noticeId);
          // Navigate to task view - implement your navigation logic
          console.log(`Navigating to task for notice ${noticeId}`);
          break;
        case 'add_calendar':
          // Mark as read first, then add to calendar
          await markAsReadMutation.mutateAsync(noticeId);
          // Implement calendar integration
          console.log(`Adding to calendar for notice ${noticeId}`);
          break;
        case 'dismiss':
          await dismissMutation.mutateAsync(noticeId);
          break;
        case 'archive':
          await archiveMutation.mutateAsync(noticeId);
          break;
        case 'approve':
        case 'reject':
        case 'view_details':
          // Mark as read first, then handle specific action
          await markAsReadMutation.mutateAsync(noticeId);
          // Implement specific action logic
          console.log(`Handling ${actionType} for notice ${noticeId}`);
          break;
        default:
          console.warn(`Unknown action type: ${actionType}`);
          break;
      }
    } catch (error) {
      console.error(`Failed to handle action ${actionType} for notice ${noticeId}:`, error);
      // You might want to show a toast notification here
    }
  };

  const handleRetry = () => {
    currentQuery.refetch();
  };

  return (
    <div 
      className="relative flex size-full min-h-screen flex-col justify-between bg-gray-50 overflow-x-hidden"
      style={{ 
        fontFamily: 'Inter, "Noto Sans", sans-serif',
        minHeight: 'max(884px, 100dvh)'
      }}
    >
      <div className="flex-grow">
        <Header 
          title="Notices"
          onBackClick={handleBackClick}
        />
        
        <Navigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCount={unreadCountQuery.data || 0}
        />
        
        <NoticesList 
          notices={notices}
          onActionClick={handleActionClick}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
};

export default Notices;