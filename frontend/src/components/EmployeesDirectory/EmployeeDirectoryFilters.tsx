import { useRef } from "react";
import Button from "../shared/atoms/Button";
import { Form } from "@tsed/react-formio";
import schema from "./EmployeeDirectoryLayoutForm.json";
import toast from "react-hot-toast";
import { EmployeeDirectoryFilterData } from "./EmployeeSearch";

interface EmployeeDirectoryFiltersProps {
    onUpdate: (data: EmployeeDirectoryFilterData) => void;
}

const EmployeeDirectoryFilters: React.FC<EmployeeDirectoryFiltersProps> = ({ onUpdate }) => {
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
        <div>
            <div className="pb-16 overflow-hidden">
                <Form
                    className="profile-form w-full max-w-full bg-white"
                    form={schema}
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
                {/* Submit button */}
                <div className="w-full bg-white mt-4">
                    <Button
                        onClick={handleSubmit}
                        size="md"
                        fullWidth
                    >
                        Update
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDirectoryFilters;