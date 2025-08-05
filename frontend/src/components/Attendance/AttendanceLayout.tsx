import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import NavigationTabs, { Tab } from '../NavigationTab';
import HeaderBar from '../HeaderBar';



const AttendanceLayout: React.FC = () => {

    const tabs: Tab[] = useMemo(
        () => [
            { label: 'Attendance', key: 'summary' },
            { label: 'My Attendance Details', key: 'emp-attendance' },
            { label: 'Team Attendance', key: 'team-attendance' },
            { label: 'My Attendance Requests', key: 'attendance-request' },
            { label: 'Team Attendance Requests', key: 'team-attendance-requests' },
        ],
        []
    );
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const handleTabChange = (tab: typeof tabs[number]) => {
        setActiveTab(tab);
        navigate(`/webapp/attendance/${tab.key}`);
    };


    return (
        <div className="min-h-screen bg-white">
            {/* Fixed Header */}
            <HeaderBar title={activeTab.label} onBack={() => navigate("/webapp")} />
            <div className='sticky top-[60px] z-50'>
                <NavigationTabs
                    tabs={tabs}
                    activeTab={activeTab?.key}
                    onTabChange={(tab) => { handleTabChange(tabs.find((item) => item.key === tab) as Tab) }}
                />
            </div>
            {/* Page Content (with top padding to avoid overlap) */}
            <div className="">
                <Outlet />
            </div>
        </div>
    );
};

export default AttendanceLayout;
