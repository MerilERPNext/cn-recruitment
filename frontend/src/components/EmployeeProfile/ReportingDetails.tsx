import { useCurrentEmployeeAllDetails, useGetEmployeeReportingDetails, } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import CircularLoader from "../shared/atoms/CircularLoader";

const ReportingDetails = () => {
    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name || ""
    );
    const { data: reportingData, isLoading: employeeReportingDetailsPending } = useGetEmployeeReportingDetails(currentEmployee?.employee || "");
    const Field = ({ label, value }: { label: string; value: string }) => (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-gray-900 font-medium">
                {value || "—"}
            </p>
        </div>
    );
    if (employeeReportingDetailsPending) {
        return <CircularLoader />
    }

    return (
        <div className="address-form-container bg-white rounded-lg border border-gray-200">
            <div className="p-4 md:p-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="border-b border-gray-200 pb-6 mb-8 w-full">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Reporting Details
                        </h2>
                        <p className="text-gray-600">
                            Your reporting hierarchy information
                        </p>
                    </div>

                    {/* <Button
                        icon={<EditIcon className="h-4 w-4" />}
                        variant="subtle"
                        size="md"
                    >
                        Edit
                    </Button> */}
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field
                        label="Employee Name"
                        value={reportingData?.data?.employee_name}
                    />

                    <Field
                        label="Reporting Manager"
                        value={reportingData?.data?.reports_to_name}
                    />

                    <Field
                        label="Dotted Line Manager"
                        value={reportingData?.data?.custom_dotted_line_manager_name}
                    />

                    <Field
                        label="HR Business Partner"
                        value={reportingData?.data?.custom_hrbp_name}
                    />

                    <Field
                        label="Head of Department"
                        value={reportingData?.data?.custom_hod_name}
                    />

                    <Field
                        label="CXO"
                        value={reportingData?.data?.custom_cxo_name}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReportingDetails;