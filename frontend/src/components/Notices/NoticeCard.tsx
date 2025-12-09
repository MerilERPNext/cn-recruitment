import React from 'react';
import { MdChevronRight, MdRefresh } from 'react-icons/md';
import { NoticeItem } from './types/noticeItem';
import ActionButton from './ActionButton';
import UnreadIndicator from './UnreadIndicator';
import NoticeIcon from './NoticeIcon';

interface NoticeCardProps {
    item: NoticeItem;
    index?: number;
    doctype: string;
    onActionClick?: (noticeId: string, actionType: string, silent?: boolean) => void;
    isLoading?: boolean;
}

const NoticeCard: React.FC<NoticeCardProps> = ({ item, onActionClick, isLoading = false }) => {
    const notice = item;
    const noticeId = notice.id || notice.name;

    const iconConfig = NoticeIcon.getIconProps(notice.iconType);

    const priorityColor = notice.priority === 'high' ? 'bg-red-100 text-red-700' :
        notice.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            notice.priority === 'low' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';

    const statusColor = notice.status === 'active' ? 'bg-green-100 text-green-700' :
        notice.status === 'archived' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-500';

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const unreadColor = notice.priority === 'high' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border relative cursor-pointer hover:shadow-md transition-shadow`}>
            {notice.isUnread && <UnreadIndicator color={unreadColor} />}

            <NoticeIcon {...iconConfig} />

            <div className="flex-grow min-w-0">
                <div className="flex flex-wrap gap-2 items-center mb-1">
                    <span className="text-gray-800 text-base font-semibold truncate flex-1">{notice.title}</span>
                    {notice.category && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{notice.category}</span>
                    )}
                    {notice.priority && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor}`}>{notice.priority}</span>
                    )}
                    {notice.status && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{notice.status}</span>
                    )}
                </div>
                {notice.content && (
                    <div className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-2">{notice.content}</div>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                    {notice.createdAt && <span>Published: {formatDate(notice.createdAt)}</span>}
                    {notice.updatedAt && <span>Updated: {formatDate(notice.updatedAt)}</span>}
                </div>
                {notice.action && onActionClick && (
                    <ActionButton
                        variant={notice.action.variant}
                        onClick={(e) => {
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

export default NoticeCard;
