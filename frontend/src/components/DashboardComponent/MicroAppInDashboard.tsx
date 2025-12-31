import React from "react";
import { ViewAll } from "../shared/atoms/ViewAll";
import { useUserMicroApps } from "../../hooks/useAttendance";
import AppGrid from "./DashboardApps/AppGrid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CNMicroapp } from "./DashboardApps/AppsCard";


const MicroAppInDashboard: React.FC = () => {
  const { data: microappsList } = useUserMicroApps()


  const handleOrderChange = (apps: CNMicroapp[]) => {
    // Persist to backend
    const payload = apps.map(({ name, display_order }) => ({
      name,
      display_order,
    }));

    console.log("Updated order:", payload);
  };


  return (
    <div className="bg-white rounded-lg p-6 shadow-md border border-[rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Admin Apps</h3>
        <ViewAll title="View All" />
      </div>
      <DndProvider backend={HTML5Backend}>
        {microappsList?.apps && <AppGrid apps={microappsList?.apps} onOrderChange={handleOrderChange} />}
      </DndProvider>
    </div>
  );
};

export default MicroAppInDashboard;
