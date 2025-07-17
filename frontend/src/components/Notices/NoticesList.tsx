import React from 'react';
import FrappeListView from '../ListView';
import NoticeCard from './NoticeCard';
import NoticeCardSkeleton from './NoticeCardSkeleton';
import { BaseItem, NoticeItem } from './types/noticeItem';

interface NoticesListProps {
    onActionClick: (noticeId: string, actionType: string, silent?: boolean) => void;
    activeTab: string;
}

const NoticesList: React.FC<NoticesListProps> = ({ onActionClick, activeTab }) => {
    let defaultFilters: Record<string, string> = {};
    if (activeTab === 'all') defaultFilters = { status: 'Published' };
    else if (activeTab === 'unread') defaultFilters = { status: 'unread' };
    else if (activeTab === 'archived') defaultFilters = { status: 'archived' };

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
                isSearch
                pageSize={10}
                defaultFilters={defaultFilters}
                defaultFields={['name', 'title', 'priority', 'publish_date', 'expiry_date', 'status']}
                searchFields={['title', 'message', 'priority', 'status']}
                infiniteScroll
            />
        </main>
    );
};

export default NoticesList;
