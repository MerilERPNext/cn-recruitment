import { useNavigate } from "react-router";
import LayoutHeader from "../../shared/LayoutHeader";
import { CalendarDays, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import SelectByMonth, { MonthOption } from "./SelectByMonth";

import { endOfMonth, format, parse, startOfMonth } from "date-fns";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";
import { getStatusGradient } from "../../../utils/helperUtils";
import Badge from "../../shared/Badge";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "on leave":
        return "bg-yellow-100 text-yellow-600";
      case "work from home":
        return "bg-purple-100 text-purple-700";
      case "holidays":
        return "!bg-blue-100 !text-blue-700";
      case "weekly off":
        return "!bg-gray-100 !text-gray-700";
      default:
        return "bg-gray-50 text-gray-700";
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

      <div className="mx-auto bg-white h-screen mt-14 px-4">
        <h2 className="font-semibold text-lg text-center py-2">
          {selectedMonth?.label}
        </h2>
        <div className="flex flex-col gap-2 pb-4">
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
                <div className="flex items-center p-4 border border-gray-200 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow space-x-4">
                  {/* Date Box */}
                  <div
                    className={`flex flex-col items-center justify-center h-full rounded-md py-2 px-2  ${getStatusColor(
                      item.status.toLocaleLowerCase()
                    )}`}
                    style={
                      item.status.toLocaleLowerCase() === "half day"
                        ? getStatusGradient(
                            item?.half_day_status_first_half || "",
                            item?.half_day_status_second_half || ""
                          )
                        : {}
                    }
                  >
                    <div className="text-sm font-bold leading-none font-semibold">
                      {date}
                    </div>
                    <div className="text-sm uppercase tracking-wide leading-tight font-semibold">
                      {month}
                    </div>
                    <div className="text-sm capitalize leading-tight text-gray-600 font-semibold">
                      {day}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-center space-y-1">
                    <div className="flex gap-2">
                      <div className="text-base font-semibold text-lg text-gray-800">
                        {item?.doctype === "Attendance Request"
                          ? "Attendance Request - "
                          : ""}
                        {item?.status}
                      </div>
                      {/* Shift Info */}
                      {item?.shift && (
                        <Badge
                          label={`Shift ${item?.shift}`}
                          backgroundColor="bg-gray-200"
                          textColor="text-gray-600"
                        />
                      )}
                    </div>
                    {item?.doctype === "Attendance" && (
                      <div className="mt-2 w-full rounded-xl flex justify-between">
                        <div>
                          <p className="text-gray-400 text-sm text-start font-semibold">
                            Check In
                          </p>
                          <div className="flex justify-center items-center gap-2">
                            <LogIn
                              className={`h-4 w-4 ${
                                item?.in_time
                                  ? "text-green-600"
                                  : "text-gray-600"
                              }`}
                            />
                            <h5 className="font-semibold text-start">
                              {item?.in_time
                                ? format(
                                    parse(
                                      item?.in_time,
                                      "HH:mm:ss",
                                      new Date()
                                    ),
                                    "HH:mm"
                                  )
                                : "--:--"}
                            </h5>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm text-start font-semibold">
                            Check Out
                          </p>
                          <div className="flex justify-center items-center gap-2">
                            <LogOut
                              className={`h-4 w-4 ${
                                item?.out_time
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            />
                            <h5 className="font-semibold text-start">
                              {item?.in_time
                                ? format(
                                    parse(
                                      item?.out_time || "",
                                      "HH:mm:ss",
                                      new Date()
                                    ),
                                    "HH:mm"
                                  )
                                : "--:--"}
                            </h5>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
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
