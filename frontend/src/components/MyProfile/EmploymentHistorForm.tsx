/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useMemo, useRef } from "react";
import toast from "react-hot-toast";
import Button from "../shared/atoms/Button";
import employmentHistoryFormSchema from "./employmentHistoryFormSchema.json";
import { useAddEmployeeHistoryMutation, useCurrentEmployeeAllDetails, useGetDesignationHierarchy, useGetEmpDesignationHierarchyCurrentDetails } from "../../hooks/useEmployee";
import CircularLoader from "../shared/atoms/CircularLoader";
import useCurrentUser from "../../hooks/useCurrentUser";


interface EmploymentHistoryProps {
    onSuccess?: (data?: any) => void;
    onCancel?: () => void;
    isEdit?: boolean;
}


const EmploymentHistoryForm = ({ onCancel, isEdit = false }: EmploymentHistoryProps) => {
    const formInstance = useRef<any>(null);
    const initialSubmissionSet = useRef(false);
    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name || ""
    );
    const { data: designationHierarchy, isLoading: designationHierarchyLoading } = useGetDesignationHierarchy(
        currentEmployee?.company || "",
        currentEmployee?.department || "",
        currentEmployee?.designation || "",
        isEdit
    );
    const { mutateAsync: addEmployeeHistory, isPending: addEmployeeHistoryPending } = useAddEmployeeHistoryMutation();
    const { data: empDesignationHierarchyCurrentDetails, isLoading: empDesignationHierarchyCurrentDetailsPending } = useGetEmpDesignationHierarchyCurrentDetails(currentEmployee?.employee || "", isEdit);


    const initialSubmissionData = useMemo(
        () => ({
            data: {
                companies: designationHierarchy?.data?.companies,
                departments: designationHierarchy?.data?.departments,
                designations: designationHierarchy?.data?.designations,
                functional_areas: designationHierarchy?.data?.functional_areas,
                ...(isEdit && {
                    company: empDesignationHierarchyCurrentDetails?.data?.company,
                    department: empDesignationHierarchyCurrentDetails?.data?.department,
                    designation: empDesignationHierarchyCurrentDetails?.data?.designation,
                    functional_area: empDesignationHierarchyCurrentDetails?.data?.functional_area,
                    startDate: empDesignationHierarchyCurrentDetails?.data?.start_date,
                }),
            },
        }),
        [designationHierarchy, empDesignationHierarchyCurrentDetails, isEdit]
    );

    const handleSubmit = async () => {
        try {
            const submission = await formInstance.current?.submit(); // returns all form data
            const data = submission?.data;

            await addEmployeeHistory({
                company: data.company,
                department: data.department,
                designation: data.designation,
                start_date: data.startDate,
                functional_area: data.functional_area,

            });
            onCancel?.();
        } catch (err) {
            toast.error("Please fill in all required fields.");
            console.warn("Form submission error -", err);
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
                        Employment History
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
                {empDesignationHierarchyCurrentDetailsPending || designationHierarchyLoading ?
                    <div className="flex justify-center items-center h-full w-full p-10">
                        <CircularLoader />
                    </div>
                    : <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-12">
                        <Form
                            form={employmentHistoryFormSchema}

                            /** CRITICAL FIX: Do NOT pass submission prop */
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
                }
                {/* Footer */}
                <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
                    <Button
                        onClick={handleSubmit}
                        fullWidth
                        size="lg"
                        variant="contain"
                        bgColor={"blue-600"}
                        textColor="white"
                        className="hover:bg-blue-700 font-medium"
                    >
                        {
                            addEmployeeHistoryPending ? <CircularLoader />
                                :
                                "Submit Request"
                        }

                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmploymentHistoryForm;
