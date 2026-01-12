import { format } from "date-fns";
import { useState } from "react";
import { useGetAllEmployeeCheckin } from "../../../../hooks/useAttendance";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { EmployeeAllCheckin } from "../../../../types/attendance";
import { generateMonthOptions } from "../../../../utils/helperUtils";
import { MonthOption } from "../../AllEmpAttendance/SelectByMonth";
import { endOfMonth, parse, startOfMonth } from "date-fns";
import { Select } from "../../../shared/atoms/Select";
import TableSkeleton from "../../../shared/molecules/Skeletons/TableSkeleton";

const getMonthDateRange = (monthValue: string) => {
    const parsedMonth = parse(monthValue, "yyyy-MM", new Date());

    return {
        frm_date: format(startOfMonth(parsedMonth), "yyyy-MM-dd"),
        to_date: format(endOfMonth(parsedMonth), "yyyy-MM-dd"),
    };
};

const CheckInStatus = () => {
    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name as string
    );

    const monthOptions: MonthOption[] = generateMonthOptions(12);

    const [selectedMonth, setSelectedMonth] = useState<MonthOption>(monthOptions[0]);


    const { frm_date, to_date } = getMonthDateRange(selectedMonth.value);

    const {
        data: checkins,
        isLoading,
        isError,
        error,
    } = useGetAllEmployeeCheckin({
        employee: currentEmployee?.employee,
        frm_date,
        to_date,
    });

    if (isLoading) {
        return (
            <div>
                <div className="animate-pulse mb-2">
                    <div className="h-8 w-1/2 bg-gray-200 rounded-lg" />
                </div>
                <TableSkeleton columns={4} rows={16} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
                Failed to load check-ins.
                <div className="mt-1 text-xs text-red-600">
                    {(error as Error)?.message || "Something went wrong"}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ================= Month Dropdown ================= */}

            <Select
                options={monthOptions}
                value={selectedMonth}
                onChange={setSelectedMonth}
            />

            {/* ================= Empty State ================= */}
            {!checkins || checkins.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                    No check-ins found for the selected month.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full border-collapse divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Employee
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Log Type
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Check-in Time
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Shift
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Shift Timing
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Check-in Type
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                            {checkins.map((item: EmployeeAllCheckin) => (
                                <tr key={item.name} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        <div className="font-medium">
                                            {item.employee_name}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {item.employee}
                                        </div>
                                    </td>

                                    <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm">
                                        <span
                                            className={`inline-flex rounded-xl px-4 py-1 text-xs font-semibold ${item.log_type === "IN"
                                                ? "bg-success-100 text-success"
                                                : "bg-error-50 text-error"
                                                }`}
                                        >
                                            {item.log_type}
                                        </span>
                                    </td>

                                    <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        {format(
                                            new Date(item.time),
                                            "dd MMM yyyy, hh:mm a"
                                        )}
                                    </td>

                                    <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        {item.shift || "-"}
                                    </td>

                                    <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        {item.shift_start && item.shift_end
                                            ? `${format(
                                                new Date(item.shift_start),
                                                "hh:mm a"
                                            )} - ${format(
                                                new Date(item.shift_end),
                                                "hh:mm a"
                                            )}`
                                            : "-"}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                        {item.custom_checkin_type || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CheckInStatus;
