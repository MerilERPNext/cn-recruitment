import React from 'react';
import NoticesList from './NoticesList';

interface Props {
    tab: 'all' | 'unread' | 'archived';
}

const NoticesTab: React.FC<Props> = ({ tab }) => {
    return <NoticesList activeTab={tab} />;
};

export default NoticesTab;
