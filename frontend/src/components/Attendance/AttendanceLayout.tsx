import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LayoutHeader from '../shared/LayoutHeader';

const tabs = [
    { name: 'Summary', key: 'summary' },
    { name: 'Employee Attendance', key: 'emp-attendance' },
    { name: 'Team Attendance', key: 'team-attendance' },
    { name: 'Attendance Request', key: 'attendance-request' },
    { name: 'Team Attendance Details', key: 'team-attendance-details' },
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

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <LayoutHeader tab={activeTab.name} />

            <div className="sticky top-[52px] flex border-b border-gray-200 gap-4 bg-white sticky top-0 z-5 overflow-x-auto whitespace-nowrap no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab)}
                        className={`w-fit px-4 py-3 border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent text-sm font-medium rounded-none outline-none focus:outline-none focus:ring-0 ${activeTab.key === tab.key
                            ? 'border-b-[3px] border-b-[var(--primary-color)] text-[var(--primary-color)]'
                            : 'border-b-transparent text-[var(--text-secondary)]'
                            }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>


            {/* Tab Content */}
            <div className="flex-grow">
                <Outlet />
            </div>
        </div>
    );
};

export default AttendanceLayout;
