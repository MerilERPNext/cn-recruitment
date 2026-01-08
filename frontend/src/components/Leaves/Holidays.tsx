// import React, { useEffect } from "react";
// import { format } from "date-fns";
// import { useNavigate } from "react-router-dom";
// import { useRequestLeaveModal } from "./RequestLeaveModalContext";
// import {
//   useGetAttendancePolicyForDate,
//   useGetHolidays,
//   useGetLeaveBalance,
//   useMyLeaveRequests,
// } from "../../hooks/useLeaves";
// import { useLoggedInUser } from "../../hooks/useLoggedInUser";
// import { useEmployeeByUserId } from "../../hooks/useEmployee";
// import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
// import { HolidayCardSkeletonList } from "./LeaveSkeletons";
// import { Holiday } from "../../types/leaves";
// import { processHolidays } from "./holidayHelper";
// import { useScreenSize } from "../../hooks/useScreenSize";
// import { ViewAll } from "../shared/atoms/ViewAll";
// import { useGetUiPermission } from "../../hooks/userUiPermission";
// import { isActionEnabled } from "../../utils/uiPermission";
// import { Typography } from "../shared/atoms/Typography";
// import { Card } from "../shared/atoms/Card";

// interface HolidayCardProps {
//   holiday: Holiday;
//   showApply?: boolean;
//   disabledApply?: boolean;
//   statusLabel?: string | null;
// }

// const DISPLAY_LIMIT = 3;

// export const HolidayCard: React.FC<HolidayCardProps> = ({
//   holiday,
//   showApply,
//   disabledApply = false,
//   statusLabel,
// }) => {
//   const dateObj = new Date(holiday.date);
//   const month = format(dateObj, "MMM").toUpperCase();
//   const day = format(dateObj, "dd");
//   const weekday = format(dateObj, "EEEE");
//   const { openModal } = useRequestLeaveModal();

//   const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");
//   const canRequestLeave = isActionEnabled(
//     userUiPermission,
//     "optional_holiday_apply",
//     "Holidays"
//   );

//   return (
//     <Card
//       padding="sm"
//       radius="xl"
//       shadow="sm"
//       className="w-full mb-2 hover:shadow-md flex justify-between"
//     >
//       <div className="flex items-center gap-3">
//         <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-semibold text-xs">
//           <span className="uppercase leading-none">{month}</span>
//           <span className="text-md">{day}</span>
//         </div>

//         <div className="flex flex-col">
//           <Typography variant="subheading">{holiday.holiday_name}</Typography>
//           <Typography variant="bodySmall" color="primary">
//             {weekday}
//           </Typography>
//         </div>
//       </div>

//       {showApply && !statusLabel && canRequestLeave && (
//         <button
//           type="button"
//           disabled={disabledApply}
//           onClick={() =>
//             openModal({
//               fromDate: holiday.date,
//               toDate: holiday.date,
//               leaveType: holiday.leave_type,
//               source: "holiday",
//               hideHalfDayToggle: true,
//             })
//           }
//           className={`text-sm font-medium border p-2 px-4 rounded-lg transition-colors duration-200
//             ${
//               disabledApply
//                 ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
//                 : "text-primary border-gray-10 shadow-[0_1px_2px_0_rgba(0,0,0,.1)]"
//             }`}
//         >
//           Apply
//         </button>
//       )}
//       {statusLabel && (
//         <span
//           className={`text-sm border py-1 px-4 rounded-2xl
//             ${
//               statusLabel === "Taken"
//                 ? "text-green-600 border-green-200 bg-green-100"
//                 : statusLabel === "Rejected"
//                 ? "text-red-600 border-red-200 bg-red-100"
//                 : "text-yellow-600 border-yellow-200 bg-yellow-100"
//             }`}
//         >
//           {statusLabel}
//         </span>
//       )}
//     </Card>
//   );
// };

// const Holidays: React.FC = () => {
//   const navigate = useNavigate();
//   const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
//   const { data: currentEmployee, isLoading: isEmployeeLoading } =
//     useEmployeeByUserId(userId);
//   const { setRefetch } = useLeaveRequestRefresh();
//   const {
//     data: holidaysData,
//     isLoading,
//     isError,
//   } = useGetHolidays(currentEmployee?.name);
//   const { isDesktop } = useScreenSize();

//   const {
//     data: leaveRequests,
//     isLoading: isLeaveRequestsLoading,
//     refetch,
//   } = useMyLeaveRequests(currentEmployee?.name);

//   const dateForPolicy = new Date().toISOString().split("T")[0];
//   const { data: attendancePolicy } = useGetAttendancePolicyForDate(
//     currentEmployee?.name,
//     dateForPolicy
//   );

//   console.log("Attendance Policy:", attendancePolicy);

//   useEffect(() => {
//     const unsubscribe = setRefetch(refetch);
//     return unsubscribe;
//   }, [refetch, setRefetch]);

//   const today = React.useMemo(() => {
//     const d = new Date();
//     d.setHours(0, 0, 0, 0);
//     return d;
//   }, []);
//   const currentDate = new Date().toISOString().split("T")[0];
//   const {
//     data: leaveBalance,
//     isLoading: isLeaveBalanceLoading,
//     isError: isLeaveError,
//   } = useGetLeaveBalance(currentEmployee?.name, currentDate);

//   const optionalBalance = leaveBalance?.leave_balance?.find((b) => {
//     const normalized = b.type.toLowerCase().replace(/[\s\-_]/g, "");
//     return normalized.includes("optional");
//   });

//   const { upcomingRegular, upcomingOptional, allRegular, allOptional } =
//     React.useMemo(
//       () => processHolidays(holidaysData, today),
//       [holidaysData, today]
//     );

//   const displayedRegular = upcomingRegular.slice(0, DISPLAY_LIMIT);
//   const displayedOptional = upcomingOptional.slice(0, DISPLAY_LIMIT);

//   const getHolidayStatus = (holidayDate: string) => {
//     if (!leaveRequests) return null;
//     const request = leaveRequests.find(
//       (req) => req.from_date === holidayDate && req.to_date === holidayDate
//     );
//     if (!request) return null;
//     if (request.status === "Approved") return "Taken";
//     if (request.status === "Rejected") return "Rejected";
//     if (request.status === "Open") return "Applied";
//     return null;
//   };

//   if (
//     isLoading ||
//     isUserLoading ||
//     isEmployeeLoading ||
//     isLeaveBalanceLoading ||
//     isLeaveRequestsLoading ||
//     !leaveRequests
//   ) {
//     return (
//       <div className="p-4 min-h-full pb-24">
//         <section className="mb-8">
//           <h2 className="text-lg font-semibold mb-4">
//             Upcoming Regular Holidays
//           </h2>
//           <HolidayCardSkeletonList count={3} />
//         </section>

//         <section>
//           <div className="mb-4">
//             <h2 className="text-lg font-semibold mb-4">
//               Upcoming Optional Holidays
//             </h2>
//             <div className="flex justify-between text-center border py-2 rounded-lg mb-4">
//               <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
//               <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
//               <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
//             </div>
//           </div>
//           <HolidayCardSkeletonList count={3} />
//         </section>
//       </div>
//     );
//   }

//   if (isError || isLeaveError) {
//     return (
//       <div className="p-4 min-h-full pb-24">
//         <div className="flex items-center justify-center py-8">
//           <div className="text-red-500">
//             Failed to load holidays. Please try again later.
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-4 min-h-full pb-24">
//       <section className="mb-8">
//         <div className="mb-4 flex justify-between items-center">
//           <Typography variant="subheading">
//             Upcoming Regular Holidays
//           </Typography>
//           {isDesktop && allRegular.length !== 0 && (
//             <ViewAll
//               title="View All"
//               onClick={() =>
//                 navigate("/webapp/leave-app/leaves/holidays/all", {
//                   state: { type: "regular", holidays: allRegular },
//                 })
//               }
//             />
//           )}
//         </div>

//         {upcomingRegular.length === 0 ? (
//           <p className=" text-gray-500 text-center py-4">
//             No upcoming regular holidays
//           </p>
//         ) : (
//           <>
//             {displayedRegular.map((h) => (
//               <HolidayCard
//                 key={`${h.date}-${h.holiday_name}`}
//                 holiday={h}
//                 showApply={false}
//               />
//             ))}
//           </>
//         )}
//         {!isDesktop && allRegular.length !== 0 && (
//           <button
//             type="button"
//             onClick={() =>
//               navigate("/webapp/leave-app/leaves/holidays/all", {
//                 state: { type: "regular", holidays: allRegular },
//               })
//             }
//             className="flex-1 w-full py-3 my-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
//           >
//             View All
//           </button>
//         )}
//       </section>

//       <section>
//         <div className="mb-4">
//           <div className="mb-4 flex justify-between items-center ">
//             <Typography variant="subheading">
//               Upcoming Optional Holidays
//             </Typography>
//             {attendancePolicy && isDesktop && allOptional.length !== 0 && (
//               <ViewAll
//                 title="View All"
//                 onClick={() =>
//                   navigate("/webapp/leave-app/leaves/holidays/all", {
//                     state: { type: "optional", holidays: allOptional },
//                   })
//                 }
//               />
//             )}
//           </div>

//           {attendancePolicy && (
//             <div className="flex justify-between text-center py-2 rounded-lg bg-primary/10 divide-x-1 divide-primary">
//               <p className="w-full">
//                 Total:
//                 <span className="font-semibold">
//                   {optionalBalance?.entitled}
//                 </span>
//               </p>
//               <p className="border-x-2 w-full">
//                 Availed:
//                 <span className="font-semibold">
//                   {optionalBalance?.availed}
//                 </span>
//               </p>
//               <p className="w-full">
//                 Remaining:
//                 <span className="font-semibold">
//                   {optionalBalance?.balance}
//                 </span>
//               </p>
//             </div>
//           )}
//         </div>

//         {upcomingOptional.length === 0 ? (
//           <p className="text-gray-500 text-center py-4">
//             No upcoming optional holidays
//           </p>
//         ) : (
//           <>
//             {attendancePolicy ? (
//               displayedOptional.map((h) => (
//                 <HolidayCard
//                   key={`${h.date}-${h.holiday_name}`}
//                   holiday={h}
//                   showApply={true}
//                   statusLabel={getHolidayStatus(h.date)}
//                 />
//               ))
//             ) : (
//               <p className="w-full text-center mt-5 text-red-500 flex item-start justify-center gap-1">
//                 ! Please contact HR to assign an attendance policy to view
//                 optional holidays.
//               </p>
//             )}
//           </>
//         )}
//         {attendancePolicy && !isDesktop && allOptional.length !== 0 && (
//           <button
//             type="button"
//             onClick={() =>
//               navigate("/webapp/leave-app/leaves/holidays/all", {
//                 state: { type: "optional", holidays: allOptional },
//               })
//             }
//             className="flex-1 w-full my-2 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
//           >
//             View All
//           </button>
//         )}
//       </section>
//     </div>
//   );
// };

// export default Holidays;

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import {
  useGetAttendancePolicyForDate,
  useGetHolidays,
  useGetLeaveBalance,
  useMyLeaveRequests,
} from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { HolidayCardSkeletonList } from "./LeaveSkeletons";
import { Holiday, HolidayGroup } from "../../types/leaves";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import CustomDropdown from "../shared/CustomDropdown";

interface HolidayCardProps {
  holiday: Holiday;
  showApply?: boolean;
  disabledApply?: boolean;
  statusLabel?: string | null;
}

export const HolidayCard: React.FC<HolidayCardProps> = ({
  holiday,
  showApply,
  statusLabel,
}) => {
  const dateObj = new Date(holiday.date);
  const month = format(dateObj, "MMM").toUpperCase();
  const day = format(dateObj, "dd");
  const weekday = format(dateObj, "EEEE");

  const { openModal } = useRequestLeaveModal();
  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");

  const canRequestLeave = isActionEnabled(
    userUiPermission,
    "optional_holiday_apply",
    "Holidays"
  );

  return (
    <Card
      padding="sm"
      radius="xl"
      shadow="sm"
      className="w-full mb-2 flex justify-between items-center hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-semibold text-xs">
          <span className="uppercase leading-none">{month}</span>
          <span className="text-base">{day}</span>
        </div>

        <div className="flex flex-col">
          <Typography variant="subheading">{holiday.holiday_name}</Typography>
          <Typography variant="bodySmall" className="text-primary">
            {weekday}
          </Typography>
        </div>
      </div>

      {showApply && !statusLabel && canRequestLeave && (
        <button
          type="button"
          onClick={() =>
            openModal({
              fromDate: holiday.date,
              toDate: holiday.date,
              leaveType: holiday.leave_type,
              source: "holiday",
              hideHalfDayToggle: true,
            })
          }
          className="text-sm font-medium border px-4 py-2 rounded-lg text-primary border-gray-300 hover:bg-primary/5"
        >
          Apply
        </button>
      )}

      {statusLabel && (
        <span
          className={`text-sm px-4 py-1 rounded-2xl border
            ${
              statusLabel === "Taken"
                ? "text-green-600 bg-green-100 border-green-200"
                : statusLabel === "Rejected"
                ? "text-red-600 bg-red-100 border-red-200"
                : "text-yellow-600 bg-yellow-100 border-yellow-200"
            }`}
        >
          {statusLabel}
        </span>
      )}
    </Card>
  );
};

const Holidays: React.FC = () => {
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
  const { data: employee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(userId);

  const { setRefetch } = useLeaveRequestRefresh();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const y = currentYear - 2 + i;
      return { value: String(y), label: String(y) };
    });
  }, [currentYear]);

  const {
    data: holidaysData,
    isLoading: isHolidayLoading,
    isError: isHolidayError,
  } = useGetHolidays(employee?.name, year);

  const {
    data: leaveRequests,
    isLoading: isLeaveReqLoading,
    refetch,
  } = useMyLeaveRequests(employee?.name);

  useEffect(() => {
    const unsub = setRefetch(refetch);
    return unsub;
  }, [refetch, setRefetch]);

  const today = new Date().toISOString().split("T")[0];
  const { data: attendancePolicy } = useGetAttendancePolicyForDate(
    employee?.name,
    today
  );

  const { data: leaveBalance, isLoading: isBalanceLoading } =
    useGetLeaveBalance(employee?.name, today);

  const regularHolidays: Holiday[] = useMemo(() => {
    if (!holidaysData) return [];
    return holidaysData
      .filter(
        (g: HolidayGroup) =>
          g.type_name === "National Holiday" || g.type_name === "Mandatory"
      )
      .flatMap((g: HolidayGroup) => g.holidays);
  }, [holidaysData]);

  const optionalHolidays: Holiday[] = useMemo(() => {
    return (
      holidaysData?.find((g: HolidayGroup) => g.type_name === "Optional")
        ?.holidays || []
    );
  }, [holidaysData]);

  const optionalBalance = leaveBalance?.leave_balance?.find((b) =>
    b.type.toLowerCase().includes("optional")
  );

  const getHolidayStatus = (date: string) => {
    const req = leaveRequests?.find(
      (r) => r.from_date === date && r.to_date === date
    );
    if (!req) return null;
    if (req.status === "Approved") return "Taken";
    if (req.status === "Rejected") return "Rejected";
    if (req.status === "Open") return "Applied";
    return null;
  };

  if (
    isUserLoading ||
    isEmployeeLoading ||
    isHolidayLoading ||
    isLeaveReqLoading ||
    isBalanceLoading
  ) {
    return (
      <div className="p-4">
        <HolidayCardSkeletonList count={6} />
      </div>
    );
  }

  if (isHolidayError) {
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load holidays
      </div>
    );
  }

  return (
    <div className="p-4 min-h-full pb-24">
      <div className="flex justify-between items-end mb-4">
        <Typography variant="subheading">Regular Holidays</Typography>
        <CustomDropdown
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={yearOptions}
        />
      </div>

      <section className="mb-8">
        {regularHolidays.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No regular holidays</p>
        ) : (
          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
            {regularHolidays.map((h) => (
              <HolidayCard key={h.name} holiday={h} showApply={false} />
            ))}
          </div>
        )}
      </section>

      <section>
        <Typography variant="subheading">Optional Holidays</Typography>

        {attendancePolicy && (
          <div className="flex justify-between text-center py-2 rounded-lg bg-primary/10 my-3 divide-x-1 divide-primary">
            <p className="w-full">
              Total:{" "}
              <span className="font-semibold">
                {optionalBalance?.entitled ?? 0}
              </span>
            </p>
            <p className="w-full border-x">
              Availed:{" "}
              <span className="font-semibold">
                {optionalBalance?.availed ?? 0}
              </span>
            </p>
            <p className="w-full">
              Remaining:{" "}
              <span className="font-semibold">
                {optionalBalance?.balance ?? 0}
              </span>
            </p>
          </div>
        )}

        {!attendancePolicy ? (
          <p className="text-center text-red-500 mt-4">
            ! Please contact HR to assign an attendance policy
          </p>
        ) : optionalHolidays.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No optional holidays</p>
        ) : (
          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
            {optionalHolidays.map((h) => (
              <HolidayCard
                key={h.name}
                holiday={h}
                showApply
                statusLabel={getHolidayStatus(h.date)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Holidays;
