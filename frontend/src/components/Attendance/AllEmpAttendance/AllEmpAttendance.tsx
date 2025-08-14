import { useNavigate } from "react-router";
import LayoutHeader from "../../shared/LayoutHeader";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import SelectByMonth, { MonthOption } from "./SelectByMonth";

import { endOfMonth, format, parse, startOfMonth } from "date-fns";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";

const AllEmpAttendance = () => {
  const navigate = useNavigate();
  const [showSelectByMonth, setShowSelectByMonth] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>({
    label: format(new Date(), "MMM-yyyy"),
    value: format(new Date(), "yyyy-MM"),
  });

  const selectedMonthStr =
    selectedMonth?.value ?? format(new Date(), "yyyy-MM");
  const parsedDate = parse(selectedMonthStr, "yyyy-MM", new Date());

  // Get start and end of the month
  const start = format(startOfMonth(parsedDate), "yyyy-MM-dd");
  const end = format(endOfMonth(parsedDate), "yyyy-MM-dd");
  const { data: allEventsAndAttendance } = useGetAllEventsAndAttendance({
    start: start,
    end: end,
  });

  // console.log(
  //   "--------------------------------------------------------------------",
  //   allEventsAndAttendance
  // );
  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "text-green-600";
      case "absent":
        return "text-red-600";
      case "on-leave":
        return "text-orange-600";
      case "half-day":
        return "text-yellow-500";
      case "work-from-home":
        return "text-purple-600";
      default:
        return "hover:bg-gray-100 text-gray-600";
    }
  };

  return (
    <>
      <LayoutHeader
        tab={"All Attendance"}
        onBack={() => navigate(-1)}
        children={
          <button onClick={() => setShowSelectByMonth(true)}>
            <CalendarDays />
          </button>
        }
      />

      <div className="max-w-md mx-auto bg-white h-screen mt-14 px-4">
        <h2 className="font-semibold text-lg text-center py-2">
          {selectedMonth?.label}
        </h2>
        <div className="flex flex-col gap-2">
          {allEventsAndAttendance &&
            allEventsAndAttendance?.length > 0 &&
            allEventsAndAttendance?.map((item) => {
              const dateObj = new Date(item?.start);
              const date = dateObj.getDate();
              const month = dateObj.toLocaleString("default", {
                month: "short",
              });
              const day = dateObj.toLocaleString("default", {
                weekday: "short",
              });

              return (
                <div className="flex items-center py-3 px-4 border border-gray-200 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex flex-col items-center w-12 mr-4">
                    <div className="text-lg font-semibold text-gray-900">
                      {date}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      {month}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {day}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${getStatusColor(
                        item.status.toLocaleLowerCase()
                      )} mb-1`}
                    >
                      {item?.doctype === "Attendance Request"
                        ? "Attendance Request - "
                        : ""}
                      {item?.status}{" "}
                    </div>
                    <div
                      className="text-sm text-gray-400 [&>div]:p-0 m-0"
                      dangerouslySetInnerHTML={{ __html: item?.employee }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
        {/* <FrappeListView
          doctype="Attendance"
          defaultFields={[
            "name",
            "status",
            "attendance_date",
            "shift",
            "employee",
          ]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          defaultFilters={defaultFilters as any}
          infiniteScroll
          isFilter={false}
          isSearch={false}
          showRefereshButton={false}
          ItemComponent={({ item }) => {
            const day = transformItem(item as AttendanceItem);
            return (
              <div className="flex items-center py-3 px-4 border border-gray-200 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center w-12 mr-4">
                  <div className="text-lg font-semibold text-gray-900">
                    {day.date}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {day.month}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {day.day}
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className={`font-medium ${getStatusColor(day.status)} mb-1`}
                  >
                    {day.statusLabel}
                  </div>
                  <div className="text-sm text-gray-400">{day.location}</div>
                </div>
              </div>
            );
          }}
        /> */}
      </div>

      {showSelectByMonth && (
        <SelectByMonth
          onClose={() => setShowSelectByMonth(false)}
          selected={selectedMonth}
          onChange={(monthObj) => {
            setSelectedMonth(monthObj);
            setShowSelectByMonth(false);
          }}
        />
      )}
    </>
  );
};

export default AllEmpAttendance;
