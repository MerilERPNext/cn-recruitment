import React, { useEffect, useState } from 'react'
import NavigationTabs, { Tab } from '../NavigationTab';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useScreenSize } from '../../hooks/useScreenSize';
import DesktopLayoutWrapper from '../DesktopLayoutWrapper';
import HeaderBar from '../HeaderBar';
import { GoalModelProvider } from './GoalModelContext';
type TabName =
    "Overview"
    | "New Goal Plan"
    | "Performance Review"
    | "Team Goal Plan"
    | "Checkin"
    ;

const tabRoutes: Record<TabName, string> = {
    Overview: "/webapp/performance-app/overview",
    "New Goal Plan": "/webapp/performance-app/new-goal-plan",
    "Performance Review": "/webapp/performance-app/performance-review",
    "Team Goal Plan": "/webapp/performance-app/team-goal-plan",
    Checkin: '/webapp/performance-app/checkin'
};

const Pages = ["Checkin"];

const PerformanceApp: React.FC = () => {
    const { isDesktop } = useScreenSize();
    const [activeTab, setActiveTab] = useState<TabName>("Overview");
    const navigate = useNavigate();
    const visibleheader = (Object.keys(tabRoutes) as TabName[]).filter((key) => !Pages.includes(key))
    const tabs: Tab[] = visibleheader.map((key) => ({
        key,
        label: key,
    }));
    const location = useLocation();

    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);
        navigate(tabRoutes[tab]);
    };

    const showMobileHeader = !Pages.includes(activeTab);

    useEffect(() => {
        const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
            location.pathname.startsWith(tabRoutes[tab])
        );

        if (matchedTab) {
            setActiveTab(matchedTab);
        }

    }, [location.pathname]);

    useEffect(() => {
        if (location.pathname === "/webapp/performance-app") {
            const fallback = "Overview";
            setActiveTab(fallback);
            navigate(tabRoutes[fallback], { replace: true });
        }

    }, [location.pathname, navigate]);

    const mobileLayout = (
        <div className="flex flex-col min-h-screen bg-white">
            {showMobileHeader
                &&
                <header className="sticky top-0 z-50 bg-white shadow-sm">
                    <HeaderBar
                        title={"Performance"}
                        onBack={() => navigate("/webapp")}
                    />
                    <NavigationTabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={(tab) => handleTabChange(tab as TabName)}
                    />

                </header>
            }
            <main className="z-10 flex-grow">
                <Outlet />
            </main>
        </div>
    );

    const desktopLayout = (
        <DesktopLayoutWrapper title="Performance">
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto relative">
                    <Outlet />
                </div>
            </div>
        </DesktopLayoutWrapper>
    );

    return <GoalModelProvider> {isDesktop ? desktopLayout : mobileLayout} </GoalModelProvider>;
}

export default PerformanceApp