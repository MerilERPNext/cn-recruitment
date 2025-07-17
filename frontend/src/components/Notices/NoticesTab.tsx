import React from 'react';
import { useArchiveNotice, useDismissNotice, useMarkNoticeAsRead } from '../../hooks/useNotices';
import { useNavigate } from 'react-router-dom';
import FrappeListView from '../ListView';
import { Notice } from '../../types/notice';
import { MdBadge, MdCampaign, MdChevronRight, MdError, MdEvent, MdRefresh, MdWork } from 'react-icons/md';

interface Props {
    tab: 'all' | 'unread' | 'archived';
}
interface NoticesListProps {
    onActionClick: (noticeId: string, actionType: string, silent?: boolean) => void;
    activeTab: string;
}
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
interface NoticeCardProps {
    item: BaseItem;
    index?: number;
    doctype: string;
    onActionClick?: (noticeId: string, actionType: string, silent?: boolean) => void;
    isLoading?: boolean;
}
interface ActionButtonProps {
    children: React.ReactNode;
    onClick: (e?: React.MouseEvent) => void; // Fixed: Now accepts optional event parameter
    variant?: 'primary' | 'danger' | 'secondary';
    className?: string;
    disabled?: boolean;
}

interface NoticeIconProps {
    icon: React.ComponentType;
    color: string;
    bgColor: string;
}

const NoticesTab: React.FC<Props> = ({ tab }) => {
    const navigate = useNavigate();

    const markAsRead = useMarkNoticeAsRead();
    const archive = useArchiveNotice();
    const dismiss = useDismissNotice();

    const handleActionClick = async (noticeId: string, actionType: string, silent = false) => {
        if (!silent) {
            console.log(`Action clicked: ${actionType} for notice ${noticeId}`);
        }

        try {
            switch (actionType) {
                case 'mark_as_read':
                    await markAsRead.mutateAsync(noticeId);
                    break;
                case 'view_task':
                    await markAsRead.mutateAsync(noticeId);
                    navigate(`/webapp/recruitment-app/task-details/${noticeId}`);
                    break;
                case 'add_calendar':
                    await markAsRead.mutateAsync(noticeId);
                    console.log(`Adding to calendar for notice ${noticeId}`);
                    break;
                case 'dismiss':
                    await dismiss.mutateAsync(noticeId);
                    break;
                case 'archive':
                    await archive.mutateAsync(noticeId);
                    break;
                case 'approve':
                case 'reject':
                case 'view_details':
                    await markAsRead.mutateAsync(noticeId);
                    navigate(`/webapp/notices/${noticeId}`);
                    break;
                default:
                    console.warn(`Unknown action type: ${actionType}`);
                    break;
            }
        } catch (error) {
            console.error(`Failed to handle action ${actionType} for notice ${noticeId}:`, error);
        }
    };

    return <NoticesList activeTab={tab} onActionClick={handleActionClick} />;
};

export default NoticesTab;

// Loading Skeleton Component
const NoticeCardSkeleton = () => (
    <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-pulse mb-3">
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
// Notices List Component
const NoticesList = ({ onActionClick, activeTab }: NoticesListProps) => {

    // Set filters based on activeTab
    let defaultFilters: Record<string, string> = {};
    if (activeTab === 'all') {
        defaultFilters = { status: 'Published' };
    } else if (activeTab === 'unread') {
        defaultFilters = { status: 'dismissed', };
    } else if (activeTab === 'archived') {
        defaultFilters = { status: 'archived' };
    }

    return (
        <main className="space-y-3">
            <FrappeListView
                doctype="Notice"
                ItemComponent={NoticeCard}
                SkeletonComponent={NoticeCardSkeleton}
                onItemClick={(item: BaseItem) => {
                    const noticeId = item.id || item.name;
                    const notice = item as NoticeItem;
                    onActionClick(noticeId, notice.action?.type || 'view_details');
                }}
                isSearch={true}
                pageSize={10}
                defaultFilters={defaultFilters}
                defaultFields={['name', 'title', 'priority', 'publish_date', 'expiry_date', 'status']}
                searchFields={['title', 'message', 'priority', 'status']}
                infiniteScroll={true}
            />
        </main>
    );
};


const UnreadIndicator = ({ color = 'bg-blue-500' }) => (
    <div className={`absolute top-2 right-2 w-3 h-3 ${color} rounded-full`} title="Unread notification" />
);


// Notice Icon Component
const NoticeIcon = ({ icon: Icon, color, bgColor }: NoticeIconProps) => (
    <div className={`${color} flex items-center justify-center rounded-full ${bgColor} shrink-0 size-10`}>
        <Icon />
    </div>
);
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
