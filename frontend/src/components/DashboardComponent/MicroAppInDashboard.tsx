import React from "react";
import { ViewAll } from "../shared/atoms/ViewAll";
import {
  useSaveUserMicroApps,
  useUserMicroApps,
} from "../../hooks/useAttendance";
import AppGrid from "./DashboardApps/AppGrid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CNMicroapp } from "./DashboardApps/AppsCard";
import { Card } from "../shared/atoms/Card";

const MicroAppInDashboard: React.FC = () => {
  const { data: microappsList } = useUserMicroApps();
  const { mutateAsync: saveUserMicroApps } = useSaveUserMicroApps();
  const handleOrderChange = (apps: CNMicroapp[]) => {
    // Persist to backend
    const payload = apps.map(
      ({ name, display_order, is_visible, is_pinned, is_favorite }) => ({
        name,
        is_visible,
        is_pinned,
        is_favorite,
        display_order,
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveUserMicroApps({ apps: payload } as any);
  };

  return (
    <Card shadow="sm" className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Admin Apps</h3>
        <ViewAll title="View All" />
      </div>
      <DndProvider backend={HTML5Backend}>
        {microappsList?.apps && (
          <AppGrid
            apps={microappsList?.apps}
            onOrderChange={handleOrderChange}
          />
        )}
      </DndProvider>
    </Card>
  );
};

export default MicroAppInDashboard;
