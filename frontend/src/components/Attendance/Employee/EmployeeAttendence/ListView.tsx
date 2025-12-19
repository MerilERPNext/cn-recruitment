import AttendanceLegend from "./AttendanceLegend";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useNavigate } from "react-router-dom";
import { ViewAll } from "../../../shared/atoms/ViewAll";
import DropdownMenu from "../../../shared/DropDownMenu";
import { MoreVertical, Shield } from "lucide-react";
import SideDrawer from "../../../shared/SideDrawer";
import { useState } from "react";
import ViewPolicies from "../../../shared/ViewPolicies";

const ListView = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full flex justify-end md:justify-between  items-center border-b-1 border-gray-200 pb-2">
      {/* Desktop: Show legend beside List View, Mobile: Show only List View */}
      {isDesktop && (
        <div className="flex flex-col gap-2 mt-4 mx-5">
          <h4 className="text-sm font-semibold text-gray-700">
            Attendance Legend:
          </h4>
          <AttendanceLegend />
        </div>
      )}
      {/* <button
        className="text-gray-500 px-2 mt-4 flex gap-1 justify-center items-center"
        onClick={() => {
          navigate("/webapp/attendance/emp-attendance/all");
        }}
      >
        List View
        <ArrowUpRight className="h-5 w-5" />
      </button> */}
      <div className="flex gap-2 justify-between w-full md:w-fit md:justify-center items-center  mt-4 px-2">

        <ViewAll
          title="List View"
          className="text-gray-500 px-2 flex gap-1 justify-center items-center"
          onClick={() => {
            navigate("/webapp/attendance/emp-attendance/all");
          }}
        />
        <DropdownMenu
          placement={'bottom-left'}
          items={[
            { label: "View Policies", icon: <Shield className="h-4 w-4" />, onClick: () => { setOpen(true) } },
            // { label: "Check In/Out", icon: <LogIn className="h-4 w-4" />, onClick: () => { } },
          ]}
        >
          <button className="p-1  border-1 rounded-lg hover:bg-gray-200">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenu>
        <SideDrawer
          open={open}
          onClose={() => setOpen(false)}
          side="right"
          title="View Policies"
          size="xl"
        >
          <ViewPolicies />
        </SideDrawer>
      </div>
    </div>
  );
};

export default ListView;
