import { useRef } from "react";
import Button from "../shared/atoms/Button";
import { Form } from "@tsed/react-formio";
import schema from "./EmployeeDirectoryLayoutForm.json";
import toast from "react-hot-toast";
import { EmployeeDirectoryFilterData } from "./EmployeeSearch";

interface EmployeeDirectoryFiltersProps {
    onUpdate: (data: EmployeeDirectoryFilterData) => void;
    data: EmployeeDirectoryFilterData;
    onCancel: () => void;
    onReset: () => void;
}

const EmployeeDirectoryFilters: React.FC<EmployeeDirectoryFiltersProps> = ({ onUpdate, data, onCancel, onReset }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formInstance = useRef<any>(null);

    const handleSubmit = async () => {
        try {
            if (formInstance.current) {
                const submission = await formInstance.current.submit();
                if (submission && submission.data) {
                    onUpdate(submission.data);
                }
            }
        } catch (error) {
            console.error("Filter submission error:", error);
            toast.error("Please correct the errors in the form.");
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50/30">
            <div className="flex-1 overflow-y-auto p-4 pb-8">
                <Form
                    className="profile-form w-full max-w-full bg-transparent"
                    form={schema}
                    submission={{ data: data }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onFormReady={(instance: any) => {
                        formInstance.current = instance;
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
            </div>
            {/* Submit button */}
            <div className="flex justify-between items-center w-full bg-white border-t px-4 py-4 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Button
                    onClick={() => {
                        if (formInstance.current) {
                            formInstance.current.emit('resetForm');
                        }
                        onReset();
                    }}
                    size="md"
                    variant="outline"
                >
                    Reset
                </Button>
                <div className="flex gap-2">
                    <Button
                        onClick={onCancel}
                        size="md"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        size="md"
                        variant="contain"
                    >
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDirectoryFilters;