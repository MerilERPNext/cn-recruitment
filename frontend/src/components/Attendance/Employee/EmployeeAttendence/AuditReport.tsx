import { format } from "date-fns";
import { useGetAuditReport } from "../../../../hooks/useAttendance";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import {
    AttendancePolicyAudit,
    ShiftAndPolicyAudit,
    WeekOffAudit,
} from "../../../../types/attendance"; // adjust path if needed
import TableSkeleton from "../../../shared/molecules/Skeletons/TableSkeleton";
import { Typography } from "../../../shared/atoms/Typography";

const AuditReport = () => {
    const { data: currentUser } = useCurrentUser();

    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name as string
    );

    const { data: auditReports, isLoading, isError, error } = useGetAuditReport({
        employee: currentEmployee?.employee,
    });

    if (isLoading) {
        return <div className="space-y-8">
            <TableSkeleton columns={4} rows={6} />
            <TableSkeleton columns={4} rows={6} />
        </div>;
    }

    /* ===================== Error ===================== */
    if (isError) {
        return (
            <div className="p-4 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
                Failed to load audit report.
                <div className="mt-1 text-xs text-red-600">
                    {(error as Error)?.message || "Something went wrong"}
                </div>
            </div>
        );
    }

    /* ===================== No Data ===================== */
    if (!auditReports) {
        return (
            <div className="p-4 text-sm text-gray-500">
                No audit data available.
            </div>
        );
    }
    return (
        <div className="space-y-8">
            {/* ================= Shift & Policy Table ================= */}
            <div>
                <Typography variant="body" className="mb-2 font-semibold">Shift & Policy </Typography>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full border-collapse divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>

                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Shift
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Effective From
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Updated By
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Updated On
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                            {auditReports.shift_and_policy?.length > 0 ? auditReports.shift_and_policy.map(
                                (item: ShiftAndPolicyAudit, index) => (
                                    <tr key={index} className="hover:bg-gray-50">

                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.shift || "-"}
                                        </td>
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {format(
                                                new Date(item.effective_from),
                                                "dd-MM-yyyy"
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.updated_by}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                            {format(
                                                new Date(item.updated_on),
                                                "dd-MM-yyyy"
                                            )}
                                        </td>
                                    </tr>
                                )
                            ) :
                                <tr className="hover:bg-gray-50">
                                    <td colSpan={4} className="text-center whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        No data available
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            {/* ================= Attendance Policy Table ================= */}

            <div>
                <Typography variant="body" className="mb-2 font-semibold">Attendance Policy </Typography>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full border-collapse divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Policy
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Effective From
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Updated By
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Updated On
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                            {auditReports.attedance_policies?.length > 0 ? auditReports.attedance_policies.map(
                                (item: AttendancePolicyAudit, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.policy || "-"}
                                        </td>
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.effective_from || "-"}
                                        </td>
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.updated_by}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                            {format(
                                                new Date(item.updated_on),
                                                "dd MMM yyyy"
                                            )}
                                        </td>
                                    </tr>
                                )
                            ) :
                                <tr>
                                    <td colSpan={4} className="text-center whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        No data available
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= Week Off Table ================= */}
            <div>
                <Typography variant="body" className="mb-2 font-semibold">Week Off </Typography>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full border-collapse divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Week Off
                                </th>
                                <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Updated By
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                                    Updated On
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                            {auditReports.week_off?.length > 0 ? auditReports.week_off.map(
                                (item: WeekOffAudit, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.week_off || "-"}
                                        </td>
                                        <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                            {item.updated_by}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                            {format(
                                                new Date(item.updated_on),
                                                "dd MMM yyyy"
                                            )}
                                        </td>
                                    </tr>
                                )
                            ) :
                                <tr>
                                    <td colSpan={4} className="text-center whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                        No data available
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default AuditReport;
