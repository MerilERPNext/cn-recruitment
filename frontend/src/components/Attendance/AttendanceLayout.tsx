import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const tabs = [
    { name: 'Employee Attendance', key: 'emp-attendance' },
    { name: 'Team Attendance', key: 'team-attendance' },
    { name: 'Attendance Request', key: 'attendance-request' },
];

const AttendanceLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getCurrentTab = () =>
        tabs.find(tab => location.pathname.includes(tab.key)) || tabs[0];

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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex border-b border-gray-200 gap-4 bg-white sticky top-0 z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab)}
                        className={`px-4 py-3 border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent text-sm font-medium rounded-none outline-none focus:outline-none focus:ring-0 ${activeTab.key === tab.key
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
