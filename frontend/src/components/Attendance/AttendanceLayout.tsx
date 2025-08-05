import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LayoutHeader from '../shared/LayoutHeader';

const tabs = [
    { name: 'Summary', key: 'summary' },
    { name: 'My Attendance Details', key: 'emp-attendance' },
    { name: 'Team Attendance', key: 'team-attendance' },
    { name: 'My Attendance Requests', key: 'attendance-request' },
    { name: 'Team Attendance Requests', key: 'team-attendance-requests' },
];

const AttendanceLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getCurrentTab = () => {
        const pathSegments = location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        return tabs.find(tab => tab.key === lastSegment) || tabs[0];
    };

    const [activeTab, setActiveTab] = useState(getCurrentTab);

    useEffect(() => {
        const currentTab = getCurrentTab();
        setActiveTab(currentTab);
    }, [location.pathname]);

    const handleTabChange = (tab: typeof tabs[number]) => {
        setActiveTab(tab);
        navigate(`/webapp/attendance/${tab.key}`);
    };

    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    useEffect(() => {
        const ref = tabRefs.current[activeTab.key];
        if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-white">
            {/* Fixed Header */}
            <LayoutHeader tab={activeTab.name} onBack={() => navigate("/webapp")} />

            {/* Fixed Tab Bar Below Header */}
            <div className="fixed top-14 left-0 right-0 z-30 flex border-b border-gray-200 gap-4 bg-white overflow-x-auto whitespace-nowrap no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {tabs.map((tab) => (
                    <button
                        ref={(el) => {
                            tabRefs.current[tab.key] = el;
                        }}
                        key={tab.key}
                        onClick={() => handleTabChange(tab)}
                        className={`w-fit px-4 py-3 border-t-0 border-l-0 border-r-0 bg-transparent text-sm font-medium rounded-none outline-none focus:outline-none focus:ring-0 ${activeTab.key === tab.key
                            ? 'border-b-[3px] border-b-blue-600 text-blue-600'
                            : 'text-[var(--text-secondary)]'
                            }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Page Content (with top padding to avoid overlap) */}
            <div className="pt-[104px]">
                <Outlet />
            </div>
        </div>
    );
};

export default AttendanceLayout;
