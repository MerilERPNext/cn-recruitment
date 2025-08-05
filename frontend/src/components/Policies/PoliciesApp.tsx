import React, { useMemo } from "react";
import HeaderBar from "../HeaderBar";
import { useNavigate, Outlet, useLocation } from "react-router";

const PoliciesApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const title = useMemo(() => {
    const path = location.pathname;

    const routeTitles: Record<string, string> = {
      "/webapp/policies-app": "Policy Category",
      "/webapp/policies-app/policies-list": "Policies",
    };

    return routeTitles[path] || "Policies";
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <HeaderBar title={title} onBack={() => navigate(-1)} />
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default PoliciesApp;
