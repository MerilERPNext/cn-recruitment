import { format } from "date-fns";
import { useGetAllEmployeeOvertimeLog } from "../../../../hooks/useAttendance";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { IOvertimeLog } from "../../../../types/attendance";
import TableSkeleton from "../../../shared/molecules/Skeletons/TableSkeleton";

const OvertimeLog = () => {
    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name as string
    );
    const { data: overtimeLog, isError, isLoading, error } = useGetAllEmployeeOvertimeLog({
        employee: currentEmployee?.name as string,
    });

    if (isLoading) {
        return (
            <div>
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
        <div>
            {
                !overtimeLog || overtimeLog.length === 0 ?
                    <div className="flex items-center justify-center">
                        <p className="text-gray-500">No Overtime Log Found</p>
                    </div>
                    :
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full table-auto border-collapse divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>

                                    <th className="whitespace-nowrap border-r px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                                        Created By
                                    </th>
                                    <th className="whitespace-nowrap border-r px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                                        Created On
                                    </th>
                                    <th className="whitespace-nowrap border-r px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                                        Overtime For
                                    </th>
                                    <th className="whitespace-nowrap border-r px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                                        Shift
                                    </th>
                                    <th className="whitespace-nowrap border-r px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                                        OT Hours
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase text-gray-600">
                                        Comp Off
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 bg-white">
                                {overtimeLog?.map((item: IOvertimeLog) => (
                                    <tr key={item.name} className="hover:bg-gray-50">

                                        <td className="whitespace-nowrap border-r px-4 py-3 text-sm text-gray-700">
                                            {item.owner}
                                        </td>

                                        <td className="whitespace-nowrap border-r px-4 py-3 text-sm text-gray-700">
                                            {format(new Date(item.creation), "dd-MM-yyyy")}
                                        </td>

                                        <td className="whitespace-nowrap border-r px-4 py-3 text-sm text-gray-700">
                                            {item.overtime_for}
                                        </td>

                                        <td className="whitespace-nowrap border-r px-4 py-3 text-sm text-gray-700">
                                            {item.shift || "-"}
                                        </td>

                                        <td className="whitespace-nowrap border-r px-4 py-3 text-sm text-gray-700">
                                            {item.overtime_hrs}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span
                                                className={`inline-flex whitespace-nowrap rounded-xl px-2 py-1 text-xs font-semibold ${item.compoff_created
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {item.compoff_created ? "Created" : "Not Created"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
            }

        </div>
    );
};

export default OvertimeLog;
