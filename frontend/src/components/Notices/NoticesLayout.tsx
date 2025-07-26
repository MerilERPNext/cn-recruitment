import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const tabs = [
    { name: 'All', key: 'all' },
    { name: 'Unread', key: 'unread' },
    // { name: 'Archived', key: 'archived' },
];

const NoticesLayout: React.FC = () => {
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

    return (
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
};

export default NoticesLayout;
