import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab"; 

type TabName = 
 'Salary Slip' 
|'CTC Breakdown';

const tabRoutes: Record<TabName, string> = {
  "CTC Breakdown": "/webapp/salary-slip-app/ctc-salary-breakdown",
  "Salary Slip": "/webapp/salary-slip-app/salary-slip-list",
};

const SalarySlipApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Salary Slip");

  const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
    key,
    label: key,
  }));

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
      sessionStorage.setItem("activeTab", matchedTab);
    }
  }, [location.pathname]);


    useEffect(() => {
      if (location.pathname === "/webapp/salary-slip-app") {
        navigate(tabRoutes["CTC Breakdown"], { replace: true });
      }
    }, [location.pathname, navigate]);

  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
    setActiveTab(tab);
    sessionStorage.setItem("activeTab", tab);
    navigate(tabRoutes[tab]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <style>{`
        :root {
          --primary-color: #0c7ff2;
          --secondary-color: #60758a;
          --text-primary: #111418;
          --text-secondary: #60758a;
          --background-light: #ffffff;
          --background-medium: #f0f2f5;
          --border-light: #dbe0e6;
        }
        .scrollbar-hidden {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </header>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default SalarySlipApp;
