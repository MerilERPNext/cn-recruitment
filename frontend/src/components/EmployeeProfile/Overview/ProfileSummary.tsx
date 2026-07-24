import { useTargetUser } from "../../../context/ViewedUserContext";
import { useCurrentEmployeeDetails, useGetEmployeeProfileOverview } from "../../../hooks/useEmployee";
import formatToIndianDate from "../../../utils/formatToIndianDate";

import { Typography } from "../../shared/atoms/Typography";
import ProfileSkeleton from "../../shared/molecules/Skeletons/ProfileSkeleton";

const ProfileSummary = () => {
    const { targetEmployeeId } = useTargetUser();

    const { data: currentUser, isLoading } =
        useCurrentEmployeeDetails({ logged_in_employee_details: true });

    const employeeId =
        targetEmployeeId || (isLoading ? null : currentUser?.employee) || "";

    const { data: employee, isLoading: employeeLoading, isError } = useGetEmployeeProfileOverview(employeeId);

    if (employeeLoading) {
        return <ProfileSkeleton />
    }

    if (isError) {
        return <div className="flex items-center justify-center h-full">
            <Typography variant="bodyMedium" color="error">
                Failed to load employee profile
            </Typography>
        </div>
    }

    return (
        <div className="px-0 md:px-6">
            <div className="flex items-center rounded-xl justify-between mb-6 py-2 max-sm:px-4 px-6 bg-gray-50/50 border border-gray-100/50">
                <Typography variant="subheading" className="font-bold text-gray-800 max-sm:text-md">
                    Profile Summary
                </Typography>


            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6 px-4">
                {employee?.map(field => {
                    return (
                        <div
                            className={`"px-4 py-2  hover:border-primary-200 transition-colors"`}
                        >
                            <Typography variant="label" color="disabled" className="text-[12px] uppercase tracking-widest mb-3 block">
                                {field.field_label || "-"}
                            </Typography>
                            <Typography variant="bodyMedium" className="font-bold text-gray-900">
                                {formatToIndianDate(field?.display as string) || "—"}
                            </Typography>

                        </div>
                    );
                })}
            </div>        </div>
    );
};
export default ProfileSummary;