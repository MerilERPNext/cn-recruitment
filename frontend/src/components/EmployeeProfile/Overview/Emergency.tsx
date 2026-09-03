import { useTargetUser } from "../../../context/ViewedUserContext";
import { useCurrentEmployeeDetails, useGetEmployeeDetailsByEmpIdForProfile } from "../../../hooks/useEmployee";
import { Typography } from "../../shared/atoms/Typography";
import ProfileSkeleton from "../../shared/molecules/Skeletons/ProfileSkeleton";

const Emergency = () => {
    const { targetEmployeeId } = useTargetUser();

    const { data: currentUser, isLoading } =
        useCurrentEmployeeDetails({ logged_in_employee_details: true });

    const employeeId =
        targetEmployeeId || (isLoading ? null : currentUser?.employee) || "";

    const { data, isLoading: employeeLoading, isError } = useGetEmployeeDetailsByEmpIdForProfile(employeeId);

    if (employeeLoading) {
        return <ProfileSkeleton />;
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-full">
                <Typography variant="bodyMedium" color="error">
                    Failed to load emergency contact details
                </Typography>
            </div>
        );
    }

    const emp = data?.employee;

    const bloodGroup = emp?.custom_emergency_blood_group || emp?.blood_group;

    const fields = [
        { label: "Blood Group", value: bloodGroup },
        { label: "Alternative Contact Number", value: emp?.custom_alternative_emergency_contact_number },
        { label: "Relation", value: emp?.relation },
    ];

    const hasAnyData = fields.some(f => f.value);

    return (
        <div className="px-0 md:px-6">
            <div className="flex items-center rounded-xl justify-between mb-6 py-2 max-sm:px-4 px-6 bg-gray-50/50 border border-border">
                <Typography variant="subheading" className="font-bold text-gray-800 max-sm:text-md">
                    Emergency Details
                </Typography>
            </div>

            {!hasAnyData ? (
                <div className="flex items-center justify-center py-12">
                    <Typography variant="bodyMedium" color="disabled">
                        No emergency details available
                    </Typography>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6 px-4">
                    {fields.map(({ label, value }) => (
                        <div key={label} className="px-4 py-2 hover:border-primary-200 transition-colors">
                            <Typography variant="label" color="disabled" className="text-[12px] uppercase tracking-widest mb-3 block">
                                {label}
                            </Typography>
                            <Typography variant="bodyMedium" className="font-bold text-gray-900">
                                {value || "—"}
                            </Typography>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
export default Emergency;
