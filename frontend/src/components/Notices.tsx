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
import FrappeListView from './ListView';

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
  item: Notice;
  onActionClick: (noticeId: string, actionType: string, silent?: boolean) => void;
  isLoading: boolean;
}

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}

interface NoticesListProps {
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
const NoticeCard = ({ item: notice, onActionClick, isLoading = false }: NoticeCardProps) => {
  // Map notice_type to icon
  const getIconComponent = () => {
    const type = ((notice as any).notice_type || '').toLowerCase();
    const iconMap: Record<string, { icon: React.ComponentType; color: string; bgColor: string }> = {
      announcement: { icon: CampaignIcon, color: 'text-blue-500', bgColor: 'bg-blue-50' },
      alert: { icon: ErrorIcon, color: 'text-red-500', bgColor: 'bg-red-100' },
      information: { icon: CampaignIcon, color: 'text-green-500', bgColor: 'bg-green-100' },
      'policy update': { icon: BadgeIcon, color: 'text-purple-500', bgColor: 'bg-purple-100' },
      'system notice': { icon: WorkIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
      emergency: { icon: EventIcon, color: 'text-pink-500', bgColor: 'bg-pink-100' }
    };
    return iconMap[type] || iconMap.announcement;
  };
  const iconConfig = getIconComponent();
  // Badge colors
  const typeColor = 'bg-blue-100 text-blue-700';
  const priorityColor = notice?.priority === 'high' ? 'bg-red-100 text-red-700' :
    notice?.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
    notice?.priority === 'low' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
  const statusColor = notice?.status === 'active' ? 'bg-green-100 text-green-700' :
    notice?.status === 'archived' ? 'bg-red-100 text-red-700' :
    notice?.status === 'dismissed' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-500';
  // Format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const borderColor = notice?.priority === 'high' ? 'border-red-200' : 'border-gray-200';
  const unreadColor = notice?.priority === 'high' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border ${borderColor} relative`}>
      {notice?.isUnread && <UnreadIndicator color={unreadColor} />}
      
      <NoticeIcon
        icon={iconConfig.icon}
        color={iconConfig.color}
        bgColor={iconConfig.bgColor}
      />
      
      <div className="flex-grow min-w-0">
        <div className="flex flex-wrap gap-2 items-center mb-1">
          <span className="text-gray-800 text-base font-semibold truncate flex-1">{notice?.title}</span>
          {(notice as any).notice_type && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>{(notice as any).notice_type}</span>
          )}
          {notice?.priority && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor}`}>{notice.priority}</span>
          )}
          {notice?.status && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{notice.status}</span>
          )}
        </div>
        {/* Content summary */}
        {notice?.message && (
          <div className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-2">{notice.message}</div>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
          {notice?.createdAt && <span>Published: {formatDate(notice.createdAt)}</span>}
          {notice?.updatedAt && <span>Updated: {formatDate(notice.updatedAt)}</span>}
        </div>
        {notice?.action && (
          <ActionButton
            variant={notice?.action?.variant}
            onClick={() => onActionClick(notice?.id, notice?.action!.type)}
            disabled={isLoading}
          >
            {isLoading ? <LoadingIcon /> : notice?.action?.label}
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

// Notices List Component
const NoticesList = ({ onActionClick, isLoading, error, onRetry, activeTab }: NoticesListProps) => {
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

  // Set filters based on activeTab
  let defaultFilters: Record<string, any> = {};
  if (activeTab === 'all') {
    defaultFilters = { status: ['!=', 'expired'] };
  } else if (activeTab === 'unread') {
    defaultFilters = { status: ['!=', 'expired'], is_unread: 1 };
  } else if (activeTab === 'archived') {
    defaultFilters = { status: 'archived' };
  }

  return (
    <main className="p-4 space-y-3">
      <FrappeListView
        doctype="Notice"
        ItemComponent={NoticeCard}
        onItemClick={(item: Notice) => onActionClick(item.id, item.action!.type)}
        isSearch={true}
        pageSize={10}
        defaultFilters={defaultFilters}
        defaultFields={['name','title','notice_type','priority','publish_date','expiry_date','status']}
        searchFields={['title','content','notice_type','priority','status']}
      />
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