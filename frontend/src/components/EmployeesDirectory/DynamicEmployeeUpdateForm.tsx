import { useRef } from "react";
import Button from "../shared/atoms/Button";
import { Form } from "@tsed/react-formio";
import schema from "./DynamicEmployeeUpdateForm.json";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import CircularLoader from "../shared/atoms/CircularLoader";

interface DynamicEmployeeUpdateFormProps {
    doctype: string;
    fieldDoctype: string;
    updateValue: string;
    fieldName: string;
    isOpen: boolean;
    onClose: () => void;
}

const DynamicEmployeeUpdateForm: React.FC<DynamicEmployeeUpdateFormProps> = ({ doctype, fieldDoctype, updateValue, fieldName, isOpen, onClose }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formInstance = useRef<any>(null);

    const { targetEmployeeId } = useTargetUser();
    const { data: userId } = useLoggedInUser();
    const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentEmployeeAllDetails(userId || "");
    const employeeId =
        targetEmployeeId ||
        (isCurrentUserLoading ? null : currentUser?.employee) ||
        "";
    const mutation = useUpdateFrappeDocument();

    const handleSubmit = async () => {
        try {
            if (formInstance.current) {
                const submission = await formInstance.current.submit();
                if (submission && submission.data) {
                    mutation.mutate(
                        {
                            doctype: doctype,
                            name: employeeId,
                            data: {
                                [updateValue]: submission?.data?.selected_value
                            },
                        },
                        {
                            onSuccess() {
                                toast.success("Updated data successfully.");
                                onClose();
                            },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onError(err: any) {
                                onClose()
                                const error = errorResponseFormater(err)
                                toast.error(error);
                                console.warn("Form submission error -", err);
                            },
                        }
                    );
                }
            }
        } catch (error) {
            console.error("Form submission error:", error);
            toast.error("Please correct the errors in the form.");
            onClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center md:p-4 ">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onClose() }} />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">
                        Update {fieldName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                    <Form
                        key={doctype}
                        className="profile-form w-full"
                        form={schema}
                        submission={{ data: { doctype: fieldDoctype, fieldName } }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onFormReady={(instance: any) => {
                            formInstance.current = instance;
                        }}
                        options={{
                            builder: { styles: false },
                            submitButton: false,
                            alerts: false,
                            disableOnSubmit: true,
                            rowClass: "flex flex-col space-y-4",
                            labelClass: "mb-1.5 text-sm font-semibold text-gray-700",
                            inputClass: "w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all px-3 py-2 text-sm",
                            validateOnInit: true,
                            validateOnBlur: true,
                            validateOnChange: false,
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Button
                        onClick={handleSubmit}
                        size="md"
                        fullWidth
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 py-2.5 rounded-lg font-bold"
                    >
                        {mutation.isPending ? <CircularLoader color="white" /> : "Apply Updates"}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DynamicEmployeeUpdateForm;