import React from 'react';
import {
    MdError,
    MdCampaign,
    MdWork,
    MdBadge,
    MdEvent,
} from 'react-icons/md';

export interface NoticeIconProps {
    icon: React.ComponentType;
    color: string;
    bgColor: string;
}

const iconMap: Record<string, NoticeIconProps> = {
    error: { icon: MdError, color: 'text-red-500', bgColor: 'bg-red-100' },
    campaign: { icon: MdCampaign, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    work: { icon: MdWork, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    badge: { icon: MdBadge, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    event: { icon: MdEvent, color: 'text-pink-500', bgColor: 'bg-pink-100' },
    default: { icon: MdCampaign, color: 'text-green-500', bgColor: 'bg-green-100' },
};

const NoticeIcon = ({ icon: Icon, color, bgColor }: NoticeIconProps) => (
    <div className={`${color} flex items-center justify-center rounded-full ${bgColor} shrink-0 size-10`}>
        <Icon />
    </div>
);

NoticeIcon.getIconProps = (type: string = '') => iconMap[type] || iconMap.default;

export default NoticeIcon;
