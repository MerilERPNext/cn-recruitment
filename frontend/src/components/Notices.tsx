import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  MdChevronRight,
  MdError,
  MdCampaign,
  MdWork,
  MdBadge,
  MdEvent,
  MdArrowBack,
  MdRefresh,
} from 'react-icons/md';

// Base item type that matches ListView expectations
interface BaseItem {
  name: string;
  id?: string;
  [key: string]: unknown;
}

// Extended Notice type that includes BaseItem
interface NoticeItem extends BaseItem, Notice {
  id: string;
}

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
  onClick: (e?: React.MouseEvent) => void; // Fixed: Now accepts optional event parameter
  variant?: 'primary' | 'danger' | 'secondary';
  className?: string;
  disabled?: boolean;
}

interface NoticeCardProps {
  item: BaseItem;
  index?: number;
  doctype: string;
  onActionClick?: (noticeId: string, actionType: string, silent?: boolean) => void;
  isLoading?: boolean;
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

// Header Component
const Header = ({ title, onBackClick }: HeaderProps) => (
  <header className="bg-white shadow-sm sticky top-0 z-10">
    <div className="flex items-center p-4 pb-3 justify-between">
      <button
        className="text-gray-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        onClick={onBackClick}
      >
        <MdArrowBack size={24} />
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
const NoticeCard = ({ item, onActionClick, isLoading = false }: NoticeCardProps) => {
  // Cast item to NoticeItem since we know it has the required properties
  const notice = item as NoticeItem;
  
  // Ensure we have an id (use name as fallback)
  const noticeId = notice.id || notice.name;

  // Map iconType to icon component
  const getIconComponent = () => {
    const iconMap: Record<string, { icon: React.ComponentType; color: string; bgColor: string }> = {
      error: { icon: MdError, color: 'text-red-500', bgColor: 'bg-red-100' },
      campaign: { icon: MdCampaign, color: 'text-blue-500', bgColor: 'bg-blue-50' },
      work: { icon: MdWork, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
      badge: { icon: MdBadge, color: 'text-purple-500', bgColor: 'bg-purple-100' },
      event: { icon: MdEvent, color: 'text-pink-500', bgColor: 'bg-pink-100' },
      search: { icon: MdCampaign, color: 'text-green-500', bgColor: 'bg-green-100' }
    };
    return iconMap[notice.iconType] || iconMap.campaign;
  };
  const iconConfig = getIconComponent();

  // Badge colors
  const typeColor = 'bg-blue-100 text-blue-700';
  const priorityColor = notice.priority === 'high' ? 'bg-red-100 text-red-700' :
    notice.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
    notice.priority === 'low' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
  const statusColor = notice.status === 'active' ? 'bg-green-100 text-green-700' :
    notice.status === 'archived' ? 'bg-red-100 text-red-700' :
    notice.status === 'dismissed' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-500';

  // Format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const borderColor = notice.priority === 'high' ? 'border-red-200' : 'border-gray-200';
  const unreadColor = notice.priority === 'high' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border ${borderColor} relative cursor-pointer hover:shadow-md transition-shadow`}>
      {notice.isUnread && <UnreadIndicator color={unreadColor} />}
      
      <NoticeIcon
        icon={iconConfig.icon}
        color={iconConfig.color}
        bgColor={iconConfig.bgColor}
      />
      
      <div className="flex-grow min-w-0">
        <div className="flex flex-wrap gap-2 items-center mb-1">
          <span className="text-gray-800 text-base font-semibold truncate flex-1">{notice.title}</span>
          {notice.category && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>{notice.category}</span>
          )}
          {notice.priority && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor}`}>{notice.priority}</span>
          )}
          {notice.status && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{notice.status}</span>
          )}
        </div>
        {notice.message && (
          <div className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-2">{notice.message}</div>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
          {notice.createdAt && <span>Published: {formatDate(notice.createdAt)}</span>}
          {notice.updatedAt && <span>Updated: {formatDate(notice.updatedAt)}</span>}
        </div>
        {notice.action && onActionClick && (
          <ActionButton
            variant={notice.action.variant}
            onClick={(e) => { // Fixed: Now properly handles the event parameter
              e?.stopPropagation();
              onActionClick(noticeId, notice.action!.type);
            }}
            disabled={isLoading}
          >
            {isLoading ? <MdRefresh className="animate-spin" /> : notice.action.label}
          </ActionButton>
        )}
      </div>
      <MdChevronRight className="text-gray-400" />
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
        <MdError className="text-red-500" size={20} />
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
  let defaultFilters: Record<string, string> = {};
  if (activeTab === 'all') {
    defaultFilters = { status: '!dismissed' };
  } else if (activeTab === 'unread') {
    defaultFilters = { status: '!dismissed', is_unread: 'true' };
  } else if (activeTab === 'archived') {
    defaultFilters = { status: 'archived' };
  }

  return (
    <main className="p-4 space-y-3">
      <FrappeListView
        doctype="Notice"
        ItemComponent={NoticeCard}
        onItemClick={(item: BaseItem) => {
          const noticeId = item.id || item.name;
          const notice = item as NoticeItem;
          onActionClick(noticeId, notice.action?.type || 'view_details');
        }}
        isSearch={true}
        pageSize={10}
        defaultFilters={defaultFilters}
        defaultFields={['name', 'title', 'category', 'priority', 'publish_date', 'expiry_date', 'status', 'isUnread']}
        searchFields={['title', 'message', 'category', 'priority', 'status']}
        // Removed itemComponentProps as it doesn't exist on FrappeListViewProps
        // The props are passed directly to ItemComponent through the FrappeListView
        infiniteScroll={true}
      />
    </main>
  );
};

// Main component
const Notices: React.FC = () => {
  const navigate = useNavigate();
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
  const notices = useMemo(() => currentQuery.data || [], [currentQuery.data]);
  const isLoading = currentQuery.isLoading;
  const error = currentQuery.error;

  // Auto mark as read when notice is viewed
  useEffect(() => {
    if (activeTab === 'unread' && notices.length > 0) {
      const timers = notices.map(notice => {
        if (notice.isUnread) {
          return setTimeout(() => {
            const noticeId = notice.id || notice.name;
            markAsReadMutation.mutate(noticeId);
          }, 2000);
        }
        return null;
      });
      return () => timers.forEach(timer => timer && clearTimeout(timer));
    }
  }, [activeTab, markAsReadMutation, notices]);

  // Event handlers
  const handleBackClick = () => {
    console.log('Back button clicked');
    navigate(-1);
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
          await markAsReadMutation.mutateAsync(noticeId);
          navigate(`/webapp/recruitment-app/task-details/${noticeId}`);
          break;
        case 'add_calendar':
          await markAsReadMutation.mutateAsync(noticeId);
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
          await markAsReadMutation.mutateAsync(noticeId);
          navigate(`/webapp/recruitment-app/notice-details/${noticeId}`);
          break;
        default:
          console.warn(`Unknown action type: ${actionType}`);
          break;
      }
    } catch (error) {
      console.error(`Failed to handle action ${actionType} for notice ${noticeId}:`, error);
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