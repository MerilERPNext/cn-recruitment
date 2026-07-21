import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DesktopLayoutWrapper from '../DesktopLayoutWrapper';
import { useScreenSize } from '../../hooks/useScreenSize';

const tabs = [
    { name: 'All', key: 'all' },
    { name: 'Unread', key: 'unread' },
    // { name: 'Archived', key: 'archived' },
];

const NoticesLayout: React.FC = () => {
    const { isDesktop } = useScreenSize();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(() => tabs.find(tab => location.pathname.includes(tab.key))?.key || 'all');

    useEffect(() => {
        const currentTab = tabs.find((tab) => location.pathname.includes(tab.key));
        if (currentTab) {
            setActiveTab(currentTab.key);
        }
    }, [location.pathname]);

    const handleTabChange = (tabKey: string) => {
        setActiveTab(tabKey);
        navigate(`/webapp/notices/${tabKey}`);
    };

    const handleBackNavigation = () => {
        navigate('/webapp');
    };

    const mobileLayout = (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex items-center p-4 bg-white shadow-sm">
                <button
                    onClick={handleBackNavigation}
                    className="p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
                <h1 className="text-xl font-semibold text-slate-900 capitalize absolute left-1/2 transform -translate-x-1/2">
                    {activeTab}
                </h1>
            </div>
            <div className="flex border-b border-gray-200 px-4 gap-4 bg-white sticky top-0 z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`px-4 py-3 border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent text-sm font-medium rounded-none outline-none focus:outline-none focus:ring-0 ${activeTab === tab.key
                            ? 'border-b-[3px] border-b-[var(--primary-color)] text-[var(--primary-color)]'
                            : 'border-b-transparent text-[var(--text-secondary)]'
                            }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-grow p-4">
                <Outlet />
            </div>
        </div>
    );

    const desktopLayout = (
        <DesktopLayoutWrapper title="Notifications">
            <div className="flex flex-col h-full">
                {/* Modern Tab Navigation for Web */}
                <div className="bg-gray-100 border-b border-gray-200 px-8 py-4 flex-shrink-0">
                    {/* Navigation Pills */}
                    <div className="flex gap-4 mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                                    activeTab === tab.key
                                        ? 'bg-black text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-md hover:shadow-lg border border-gray-200'
                                }`}
                            >
                                <span className="relative z-10">
                                    {tab.name === "Notices" && "📢 "}
                                    {tab.name === "Announcements" && "📣 "}
                                    {tab.name === "Updates" && "🔔 "}
                                    {tab.name}
                                </span>
                                {activeTab === tab.key && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl opacity-10"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Quick Status */}
                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span>New</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Read</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>All Caught Up</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </div>
            </div>
        </DesktopLayoutWrapper>
    );

    return isDesktop ? desktopLayout : mobileLayout;
};

export default NoticesLayout;
