/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useMemo, useRef } from "react";
import toast from "react-hot-toast";
import reportingDetailsFomSchema from "./reportingDetailsFormSchemaV2.json";
import {
    useCurrentEmployeeDetails,
    useGetEmployeeReportingDetails,
    useUpdateEmpReportingDetailsRecordMutation,
} from "../../../hooks/useEmployee";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import Button from "../../shared/atoms/Button";
import CircularLoader from "../../shared/atoms/CircularLoader";

interface ReportingDetailsProps {
    onSuccess?: (data?: any) => void;
    onCancel?: () => void;
    isEdit?: boolean;
    category?: string;
    categoryField?: string;
}

const ReportingDetailsFormV2 = ({
    onCancel,
    isEdit = false,
    category = "Reports To",
    categoryField = "reports_to",
}: ReportingDetailsProps) => {
    const formInstance = useRef<any>(null);
    const initialSubmissionSet = useRef(false);
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const { mutateAsync: updateEmpReportingDetailsRecord } = useUpdateEmpReportingDetailsRecordMutation();

    const { data: reportingData, isPending: employeeReportingDetailsPending } =
        useGetEmployeeReportingDetails(currentEmployee?.employee || "");

    const formSchema = useMemo(() => ({
        ...reportingDetailsFomSchema,
        components: [{
            ...reportingDetailsFomSchema.components[0],
            components: [
                {
                    ...reportingDetailsFomSchema.components[0].components[0],
                    label: category,
                    errorLabel: category,
                },
                reportingDetailsFomSchema.components[0].components[1],
            ],
        }],
    }), [category]);

    const initialSubmissionData = useMemo(() => {
        if (isEdit && reportingData?.data) {
            const nameKey = `${categoryField}_name` as keyof typeof reportingData.data;
            return {
                data: {
                    defaultEmployee: reportingData.data[nameKey] || "",
                    start_date: reportingData.data.start_date || "",
                },
            };
        }
        return { data: {} };
    }, [isEdit, reportingData, categoryField]);

    const handleSubmit = async () => {
        try {
            const submission = await formInstance.current?.submit();
            const data = submission?.data;

            await updateEmpReportingDetailsRecord({
                employee: currentEmployee?.employee || "",
                field: categoryField,
                value: String(data?.reports_to ?? ""),
                start_date: String(data?.start_date ?? ""),
            });
            onCancel?.();
        } catch (err) {
            const formatedError = errorResponseFormater(
                err,
                "Submission failed. Please try again.",
            );
            toast.error(formatedError);
            console.error(err);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onCancel?.();
                }
            }}
        >
            <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {isEdit ? `Edit ${category}` : `Add ${category}`}
                    </h2>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel?.();
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {/* Form.io Form */}
                {employeeReportingDetailsPending ? (
                    <div className="flex justify-center items-center h-full w-full p-10">
                        <CircularLoader />
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-12">
                        <Form
                            form={formSchema}
                            onFormReady={(instance: any) => {
                                formInstance.current = instance;
                                if (!initialSubmissionSet.current) {
                                    instance?.setSubmission?.(initialSubmissionData);
                                    initialSubmissionSet.current = true;
                                }
                            }}
                            options={{
                                builder: { styles: false },
                                submitButton: false,
                                alerts: false,
                                disableOnSubmit: true,
                                clearOnSubmit: false,
                                formClass: "space-y-6",
                                rowClass: "flex flex-col md:flex-row md:space-x-4",
                                labelClass: "mb-1 font-medium text-gray-700",
                                inputClass:
                                    "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
                                validateOnInit: true,
                                validateOnBlur: true,
                                validateOnChange: false,
                            }}
                        />
                    </div>
                )}
                {/* Footer */}
                <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
                    <Button
                        onClick={handleSubmit}
                        fullWidth
                        size="lg"
                        variant="contain"
                        bgColor="primary"
                    >
                        {employeeReportingDetailsPending ? (
                            <CircularLoader />
                        ) : (
                            "Submit Request"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReportingDetailsFormV2;
