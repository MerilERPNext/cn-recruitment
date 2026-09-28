import { useMemo } from "react";
import { useTargetUser } from "../../../context/ViewedUserContext";
import {
    useCurrentEmployeeDetails,
    useGetEmployeeDetailsByEmpIdForProfile,
    useGetEmployeeHierarchyHistory,
    useGetEmployeeProfileOverview,
} from "../../../hooks/useEmployee";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Typography } from "../../shared/atoms/Typography";
import ProfileSkeleton from "../../shared/molecules/Skeletons/ProfileSkeleton";

interface ReportingHierarchyItem {
    name?: string;
    records?: string;
    reporting_employee_name?: string;
    department?: string;
    department_name?: string;
    branch?: string;
    branch_name?: string;
    field_label?: string;
    start_date?: string;
    end_date?: string | null;
    creation?: string;
}

const ProfileSummary = () => {
    const { targetEmployeeId } = useTargetUser();

    const { data: currentUser, isLoading } =
        useCurrentEmployeeDetails({ logged_in_employee_details: true });

    const employeeId =
        targetEmployeeId || (isLoading ? null : currentUser?.employee) || "";

    const {
        data: employeeDetails,
        isLoading: isDetailsLoading,
        isError: isDetailsError,
    } = useGetEmployeeDetailsByEmpIdForProfile(employeeId);

    const {
        data: hierarchyData,
        isLoading: isHierarchyLoading,
    } = useGetEmployeeHierarchyHistory(employeeId);

    const {
        data: overviewFields,
        isLoading: isOverviewLoading,
        isError: isOverviewError,
    } = useGetEmployeeProfileOverview(employeeId);

    const emp = employeeDetails?.employee;

    const emailDisplay =
        emp?.company_email ||
        emp?.prefered_email ||
        emp?.prefered_contact_email ||
        emp?.personal_email ||
        "—";

    const companyDisplay = emp?.company_display || emp?.company || "—";

    const hrbpDisplay = useMemo(() => {
        const hrbpList = ((hierarchyData?.data || {})["HRBP"] || []) as ReportingHierarchyItem[];
        if (Array.isArray(hrbpList) && hrbpList.length > 0) {
            const sortedHrbp = [...hrbpList].sort((a, b) => {
                const aCurrent = !a.end_date;
                const bCurrent = !b.end_date;
                if (aCurrent && !bCurrent) return -1;
                if (!aCurrent && bCurrent) return 1;
                const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
                const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
                if (aDate !== bDate) return bDate - aDate;
                return String(b.creation || "").localeCompare(String(a.creation || ""));
            });
            const active = sortedHrbp[0];
            if (active) {
                const name = active.reporting_employee_name?.trim();
                const id = active.records?.trim();
                if (name && id) {
                    return `${name} (${id})`;
                }
                if (name || id) {
                    return name || id;
                }
            }
        }

        const name = emp?.custom_hrbp_display?.trim() || emp?.custom_hrbp_name?.trim();
        const id = emp?.custom_hrbp?.trim();
        if (name && id && name !== id) {
            return `${name} (${id})`;
        }
        return name || id || "—";
    }, [hierarchyData, emp]);

    // Extra fields configured in Overview Settings, if any, excluding fields already rendered
    const extraOverviewFields = useMemo(() => {
        const standardFieldNames = new Set([
            "company_email",
            "personal_email",
            "prefered_email",
            "prefered_contact_email",
            "company",
            "custom_hrbp",
            "hrbp",
        ]);
        return (overviewFields || []).filter((f) => {
            const fieldName = f.field_name?.toLowerCase();
            return !fieldName || !standardFieldNames.has(fieldName);
        });
    }, [overviewFields]);

    const isPageLoading = isDetailsLoading || (isOverviewLoading && !emp) || (isHierarchyLoading && !emp);

    if (isPageLoading) {
        return <ProfileSkeleton />;
    }

    if (isDetailsError && isOverviewError && !emp) {
        return (
            <div className="flex items-center justify-center h-full py-8">
                <Typography variant="bodyMedium" color="error">
                    Failed to load profile summary
                </Typography>
            </div>
        );
    }

    return (
        <div className="px-0 md:px-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
                <Typography
                    variant="subheading"
                    className="font-bold text-gray-900 mb-5 text-base sm:text-lg"
                >
                    Profile Summary
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                    <div>
                        <Typography
                            variant="label"
                            className="text-xs text-gray-500 block mb-1 font-normal"
                        >
                            Email ID
                        </Typography>
                        <Typography
                            variant="bodyMedium"
                            className="font-semibold text-gray-900 break-words"
                        >
                            {emailDisplay}
                        </Typography>
                    </div>

                    <div>
                        <Typography
                            variant="label"
                            className="text-xs text-gray-500 block mb-1 font-normal"
                        >
                            Company
                        </Typography>
                        <Typography
                            variant="bodyMedium"
                            className="font-semibold text-gray-900"
                        >
                            {companyDisplay}
                        </Typography>
                    </div>

                    <div>
                        <Typography
                            variant="label"
                            className="text-xs text-gray-500 block mb-1 font-normal"
                        >
                            HRBP Role
                        </Typography>
                        <Typography
                            variant="bodyMedium"
                            className="font-semibold text-gray-900"
                        >
                            {hrbpDisplay}
                        </Typography>
                    </div>

                    {extraOverviewFields?.map((field) => (
                        <div key={field.field_name || field.field_label}>
                            <Typography
                                variant="label"
                                className="text-xs text-gray-500 block mb-1 font-normal"
                            >
                                {field.field_label || field.field_name}
                            </Typography>
                            <Typography
                                variant="bodyMedium"
                                className="font-semibold text-gray-900"
                            >
                                {field?.field_type === "Date"
                                    ? formatToIndianDate(field?.display as string)
                                    : field?.display || "—"}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileSummary;