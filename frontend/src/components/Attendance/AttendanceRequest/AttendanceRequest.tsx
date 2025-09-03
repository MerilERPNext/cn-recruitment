import { Plus } from "lucide-react";
import FrappeListView from "../../ListView";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useMemo, useState } from "react";
import { AttendanceRequest as AttendanceRequestType } from "../../../types/attendance";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";

const AttendanceRequest = () => {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const defaultFilters = useMemo(() => {
    if (!currentEmployee?.employee) return undefined;
    return { employee: currentEmployee?.employee };
  }, [currentEmployee?.employee]);

  const [showForm, setShowForm] = useState(false);

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );
  return (
    <>
      {showForm ? (
        <AttndanceRequestForm
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div className="bg-white h-screen px-4">
          <FrappeListView
            doctype="Attendance Request"
            isSearch={false}
            ItemComponent={(props: { item: AttendanceRequestType }) => {
              return (
                <EmpAttendanceRequestCard
                  data={{ ...props?.item, status: props?.item?.custom_status }}
                  // onClick={() => {
                  //   setShowReqAttendanceCorrection(true);
                  // }}
                />
              );
            }}
            SkeletonComponent={CardSkeleton}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            defaultFilters={defaultFilters as any}
            // showRefereshButton={false}
            onItemClick={() => {}}
            infiniteScroll={true}
            isFilter={false}
            pageSize={5}
            defaultFields={[
              "to_date",
              "from_date",
              "custom__request_reason",
              "custom_request_type",
              "custom_status",
              "reason",
              "modified",
              "creation",
              "docstatus",
            ]}
          />
        </div>
      )}
      {/* Add Attendance Request button - Only show for mobile since desktop has Actions button */}
      {!isDesktop && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <button
              className="flex justify-center gap-2 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus /> <span>Add Attendance Request</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceRequest;
