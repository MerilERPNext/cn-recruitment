import React from "react";
import {
  useSaveUserMicroApps,
  useUserMicroApps,
} from "../../hooks/useAttendance";
import AppGrid from "./DashboardApps/AppGrid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CNMicroapp } from "./DashboardApps/AppsCard";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { AdminAppsSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

const MicroAppInDashboard: React.FC = () => {
  const { data: microappsList, isLoading } = useUserMicroApps(true);
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
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveUserMicroApps({ apps: payload } as any);
  };

  return (
    <Card shadow="sm" className="h-full flex-1 min-h-[220px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="subheading" color="title">
          Apps
        </Typography>
      </div>
      <DndProvider backend={HTML5Backend}>
        {isLoading ? (
          <AdminAppsSkeleton />
        ) : (
          microappsList?.apps && (
            <div className="flex-1">
              <AppGrid
                apps={microappsList?.apps}
                onOrderChange={handleOrderChange}
              />
            </div>
          )
        )}
      </DndProvider>
    </Card>
  );
};

export default MicroAppInDashboard;
