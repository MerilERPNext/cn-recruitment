import { Form } from "@tsed/react-formio";
import SideDrawer from "../shared/SideDrawer";
import toast from "react-hot-toast";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import Button from "../shared/atoms/Button";
import CircularLoader from "../shared/atoms/CircularLoader";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

const EmployeeSidebarForm = ({
    edit,
    setEdit,
    formioTabs,
    formInstances,
    employeeId,
    refetchEmployee,
    employeeIsLoading,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: { edit: any, setEdit: any, formioTabs: any, formInstances: any, employeeId: string, refetchEmployee: () => void, employeeIsLoading: boolean | null }) => {

    const mutation = useUpdateFrappeDocument();


    const handleSubmit = async () => {
        try {
            const allData: Record<string, unknown> = {};

            for (const tab of formioTabs) {
                const instance = formInstances.current[tab.key];
                if (instance) {
                    const submission = await instance.submit();
                    const submissionData = submission?.data || {};
                    Object.assign(allData, submissionData);
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sanitizeData = (data: any): any => {
                if (Array.isArray(data)) {
                    // Convert empty arrays to empty string (fixes empty attachments issue)
                    if (data.length === 0) {
                        return "";
                    }
                    // Flatten file arrays to URL string
                    if (data[0]?.storage === "customBase64" || data[0]?.storage === "url") {
                        return data[0]?.url || "";
                    }
                    // Recursively sanitize array items
                    return data.map(item => sanitizeData(item));
                }

                if (data !== null && typeof data === 'object') {
                    // Recursively sanitize object values
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const cleansed: Record<string, any> = {};
                    for (const [key, value] of Object.entries(data)) {
                        // Skip 'branch' key as per original logic
                        if (key === "branch") continue;
                        cleansed[key] = sanitizeData(value);
                    }
                    return cleansed;
                }

                return data;
            };

            const formattedData = sanitizeData(allData);

            if (employeeId) {
                mutation.mutate(
                    {
                        doctype: "Employee",
                        name: employeeId,
                        data: formattedData,
                    },
                    {
                        onSuccess() {
                            refetchEmployee()
                            toast.success("Updated data successfully.");
                        },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onError(err: any) {
                            // toast.error("Failed to update data.");
                            const error = errorResponseFormater(err)
                            toast.error(error);
                            console.warn("Form submission error -", err);
                        },
                    }
                );
            }
        } catch (err) {
            const error = errorResponseFormater(err)
            toast.error(error);

            console.warn("Form submission error -", err);
        }
    };

    const schema = formioTabs.find((tab: { key: string }) => tab.key === edit?.key)?.schema;
    return (
        <div>
            <SideDrawer size="xxl" open={!!edit} onClose={() => setEdit(null)} title={edit?.label || ""}>
                {schema ? (
                    <div className="pb-16 overflow-hidden">
                        <Form
                            className="profile-form w-full max-w-full bg-white"
                            form={schema}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onFormReady={(instance: any) => {
                                formInstances.current[edit?.key || ""] = instance;
                            }}
                            options={{
                                builder: { styles: false },
                                submitButton: false,
                                alerts: false,
                                disableOnSubmit: true,
                                rowClass: "flex flex-col md:flex-row md:space-x-4",
                                labelClass: "mb-1 font-medium text-gray-700",
                                inputClass:
                                    "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
                                validateOnInit: true,
                                validateOnBlur: true,
                                validateOnChange: false,
                            }}
                        />
                        {/* Submit button */}
                        <div className="w-full bg-white">
                            <Button
                                onClick={handleSubmit}
                                disabled={mutation?.isPending}
                                className="mt-2 w-full rounded-lg py-3 bg-black text-white font-medium hover:bg-blue-800 transition-colors"
                            >
                                {mutation?.isPending || employeeIsLoading ? (
                                    <CircularLoader size="sm" color="white" />
                                ) : (
                                    "Update"
                                )}{" "}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <CircularLoader size="sm" color="gray-700" />
                )}
            </SideDrawer>
        </div>
    );

};
export default EmployeeSidebarForm;