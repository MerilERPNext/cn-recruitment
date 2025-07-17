import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchiveNotice, useDismissNotice, useMarkNoticeAsRead } from '../../hooks/useNotices';
import NoticesList from './NoticesList';

interface Props {
    tab: 'all' | 'unread' | 'archived';
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
            }
        } catch (error) {
            console.error(`Failed to handle action ${actionType} for notice ${noticeId}:`, error);
        }
    };

    return <NoticesList activeTab={tab} onActionClick={handleActionClick} />;
};

export default NoticesTab;
