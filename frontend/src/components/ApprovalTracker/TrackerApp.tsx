import React from "react";
import HeaderBar from "../HeaderBar";
import { useNavigate, Outlet, useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/webapp/tracker-app": "Flow Requests",
  "/webapp/tracker-app/initiate": "Initiate Flow",
};

const TrackerApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const staticTitle = routeTitles[location.pathname];
  const dynamicTitle = (location.state as { title?: string })?.title;

  const title = dynamicTitle || staticTitle || "Flow Requests";

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <HeaderBar title={title} onBack={() => navigate(-1)} />
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default TrackerApp;
