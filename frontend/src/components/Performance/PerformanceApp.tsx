import React, { useEffect, useState } from 'react'
import NavigationTabs, { Tab } from '../NavigationTab';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useScreenSize } from '../../hooks/useScreenSize';
import DesktopLayoutWrapper from '../DesktopLayoutWrapper';
import HeaderBar from '../HeaderBar';
import { GoalModelProvider } from './GoalModelContext';
type TabName =
    "Overview"
    | "My Team"
    | "Cycle"
    | "Calibrator";

type TeamTabName =
    "Overview"
    | "Team Goals"
    | "Reviews"
    | "Calibration"
    | "Check-Ins";

type CalibratorTabName =
    "Session"
    | "9-Box Grid";

const tabRoutes: Record<TabName, string> = {
    Overview: "/webapp/performance-app/overview",
    "My Team": "/webapp/performance-app/team-overview",
    Cycle: "/webapp/performance-app/appraisal-cycle-wizard/cycle-details",
    Calibrator: "/webapp/performance-app/calibrator/session",
};

const teamTabRoutes: Record<TeamTabName, string> = {
    Overview: "/webapp/performance-app/team-overview",
    "Team Goals": "/webapp/performance-app/team-goals",
    Reviews: "/webapp/performance-app/team-reviews",
    Calibration: "/webapp/performance-app/team-calibration",
    "Check-Ins": "/webapp/performance-app/team-check-ins",
};

const teamRoutePrefixes = Object.values(teamTabRoutes);

const calibratorTabRoutes: Record<CalibratorTabName, string> = {
    Session: "/webapp/performance-app/calibrator/session",
    "9-Box Grid": "/webapp/performance-app/calibrator/box-grid",
};

const calibratorRoutePrefixes = Object.values(calibratorTabRoutes);

const PerformanceApp: React.FC = () => {
    const { isDesktop } = useScreenSize();
    const [activeTab, setActiveTab] = useState<TabName>("Overview");
    const [activeCalibratorTab, setActiveCalibratorTab] = useState<CalibratorTabName>("Session");
    const navigate = useNavigate();
    const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
        key,
        label: key,
    }));
    const calibratorTabs: Tab[] = (Object.keys(calibratorTabRoutes) as CalibratorTabName[]).map((key) => ({
        key,
        label: key,
    }));
    const location = useLocation();

    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);
        navigate(tabRoutes[tab]);
    };



    const handleCalibratorTabChange = (tab: CalibratorTabName) => {
        setActiveCalibratorTab(tab);
        navigate(calibratorTabRoutes[tab]);
    };


    useEffect(() => {
        const isTeamRoute = teamRoutePrefixes.some((route) =>
            location.pathname.startsWith(route)
        );
        const isCalibratorRoute = calibratorRoutePrefixes.some((route) =>
            location.pathname.startsWith(route)
        );
        const isOverviewSubRoute = [
            "/webapp/performance-app/overview",
            "/webapp/performance-app/my-goals",
            "/webapp/performance-app/skills",
            "/webapp/performance-app/review",
            "/webapp/performance-app/feedback",
            "/webapp/performance-app/performance-review"
        ].some((route) => location.pathname.startsWith(route));

        const matchedTab = isTeamRoute
            ? "My Team"
            : isCalibratorRoute
                ? "Calibrator"
            : isOverviewSubRoute
                ? "Overview"
            : (Object.keys(tabRoutes) as TabName[]).find((tab) =>
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



    useEffect(() => {
        const matchedCalibratorTab = (Object.keys(calibratorTabRoutes) as CalibratorTabName[]).find((tab) =>
            location.pathname.startsWith(calibratorTabRoutes[tab])
        );

        if (matchedCalibratorTab) {
            setActiveCalibratorTab(matchedCalibratorTab);
        }
    }, [location.pathname]);


    const isCalibratorRoute = calibratorRoutePrefixes.some((route) =>
        location.pathname.startsWith(route)
    );

    const mobileLayout = (
        <div className="flex flex-col min-h-screen bg-white">

            <header className="sticky top-0 z-50 bg-white shadow-sm">
 
            <HeaderBar
                title={"Performance"}
            />
            <NavigationTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(tab) => handleTabChange(tab as TabName)}
            />
            {isCalibratorRoute && (
                <div className="border-t border-gray-100">
                    <NavigationTabs
                        tabs={calibratorTabs}
                        activeTab={activeCalibratorTab}
                        onTabChange={(tab) => handleCalibratorTabChange(tab as CalibratorTabName)}
                    />
                </div>
            )}
            </header>
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
