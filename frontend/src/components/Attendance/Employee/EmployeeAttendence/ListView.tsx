import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useNavigate } from "react-router-dom";
import { ViewAll } from "../../../shared/atoms/ViewAll";
import DropdownMenu from "../../../shared/DropDownMenu";
import { ClipboardPlus, Clock12, LogIn, MoreVertical, Shield } from "lucide-react";
import SideDrawer, { DrawerSize } from "../../../shared/SideDrawer";
import { useState } from "react";
import ViewPolicies from "./ViewPolicies";
import CheckInStatus from "./CheckInStatus";
import AuditReport from "./AuditReport";
import OvertimeLog from "./OvertimeLog";
import RegularizeDrawer from "./RegularizeDrawer";
import { useGetUiPermission } from "../../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../../utils/uiPermission";
import { Typography } from "../../../shared/atoms/Typography";

const ListView = () => {
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRegularize = isActionEnabled(
    userUiPermission,
    "regularize_attendance",
    "My Attendance"
  );
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [openSidebarFor, setOpenSidebarFor] = useState<{ isOpen: boolean, for: string | null, label: string, sideBarSize: DrawerSize }>({ isOpen: false, for: null, label: "", sideBarSize: "xl" });

  return (
    <div className="w-full flex justify-end md:justify-between items-start pb-2">

      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="py-1 md:py-4">
            <Typography variant="h4">Attendance</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage employee attendance
            </Typography>
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end w-full md:w-fit md:justify-center items-center  mt-4 px-2">

        {isDesktop && <ViewAll
          title="List View"
          className="text-gray-500 px-2 flex gap-1 justify-center items-center"
          onClick={() => {
            navigate("/webapp/attendance/emp-attendance/all");
          }}
        />}
        <div className="flex gap-2">

          {canRegularize && isDesktop && <RegularizeDrawer />}

          {isDesktop && <DropdownMenu
            placement={'bottom-left'}
            items={[
              { label: "View Policies", icon: <Shield className="h-4 w-4" />, onClick: () => { setOpenSidebarFor({ isOpen: true, for: "policies", label: "View Policies", sideBarSize: "xl" }) } },
              { label: "Check In Status", icon: <LogIn className="h-4 w-4" />, onClick: () => { setOpenSidebarFor({ isOpen: true, for: "checkInStatus", label: "Check In Status", sideBarSize: "xxl" }) } },
              { label: "Audit Report", icon: <ClipboardPlus className="h-4 w-4" />, onClick: () => { setOpenSidebarFor({ isOpen: true, for: "auditReport", label: "Audit Report", sideBarSize: "xxl" }) } },
              { label: "Overtime Log", icon: <Clock12 className="h-4 w-4" />, onClick: () => { setOpenSidebarFor({ isOpen: true, for: "overtimeLog", label: "Overtime Log", sideBarSize: "xxl" }) } },
            ]}
          >
            <button className="p-1  border-1 rounded-lg hover:bg-gray-200">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenu>}
        </div>
        <SideDrawer
          open={openSidebarFor.isOpen}
          onClose={() => setOpenSidebarFor({ isOpen: false, for: null, label: "", sideBarSize: "xl" })}
          side="right"
          title={openSidebarFor.label}
          size={openSidebarFor.sideBarSize}
        >
          <div className="pb-20">

            {openSidebarFor.for === "policies" && <ViewPolicies />}
            {openSidebarFor.for === "checkInStatus" && <CheckInStatus />}
            {openSidebarFor.for === "auditReport" && <AuditReport />}
            {openSidebarFor.for === "overtimeLog" && <OvertimeLog />}
          </div>
        </SideDrawer>

      </div>
    </div>
  );
};

export default ListView;
