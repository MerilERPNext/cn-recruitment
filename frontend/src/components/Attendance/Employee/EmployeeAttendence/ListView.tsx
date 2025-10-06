import AttendanceLegend from "./AttendanceLegend";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const ListView = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
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
      <button
        className="text-gray-500 px-2 mt-4 flex gap-1 justify-center items-center"
        onClick={() => {
          navigate("/webapp/attendance/emp-attendance/all");
        }}
      >
        List View
        <ArrowUpRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ListView;
