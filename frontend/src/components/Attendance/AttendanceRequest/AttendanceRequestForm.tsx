import React from "react";
// @ts-expect-error ignore
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css"; // Ensure you import default styles if not already

const attndanceRequestFormSchema = {
    title: "Attendance Request",
    name: "attendanceRequest",
    path: "attendance-request",
    display: "form",
    components: [
        {
            type: "panel",
            key: "attendanceRequestPanel",
            label: "Attendance Request",
            title: "Attendance Request",
            hideLabel: true,
            customClass: "bg-white rounded-lg",
            components: [
                {
                    label: "Employee Name",
                    key: "employeeName",
                    type: "textfield",
                    input: true,
                    placeholder: "John Doe",
                    customClass: "mb-4"
                },
                {
                    label: "Department",
                    key: "department",
                    type: "textfield",
                    input: true,
                    placeholder: "Design",
                    customClass: "mb-4"
                },
                {
                    type: "columns",
                    columns: [
                        {
                            components: [
                                {
                                    label: "From Date",
                                    key: "fromDate",
                                    type: "datetime",
                                    input: true,
                                    widget: { type: "calendar" },
                                    format: "yyyy-MM-dd",
                                    customClass: "mb-4"
                                }
                            ],
                            width: 6
                        },
                        {
                            components: [
                                {
                                    label: "To Date",
                                    key: "toDate",
                                    type: "datetime",
                                    input: true,
                                    widget: { type: "calendar" },
                                    format: "yyyy-MM-dd",
                                    customClass: "mb-4"
                                }
                            ],
                            width: 6
                        }
                    ]
                },
                {
                    label: "Reason",
                    key: "reason",
                    type: "select",
                    input: true,
                    placeholder: "Select a reason",
                    customClass: "mb-4",
                    data: {
                        values: [
                            { label: "Work From Home", value: "work-from-home" },
                            { label: "Sick Leave", value: "sick-leave" },
                            { label: "Vacation", value: "vacation" },
                            { label: "Personal Leave", value: "personal-leave" },
                            { label: "Training", value: "training" },
                            { label: "Other", value: "other" }
                        ]
                    }
                },
                {
                    label: "Explanation",
                    key: "explanation",
                    type: "textarea",
                    input: true,
                    placeholder: "Provide additional details...",
                    rows: 4,
                    customClass: "mb-4"
                },
                {
                    type: "button",
                    label: "Submit",
                    key: "submit",
                    disableOnInvalid: true,
                    input: true,
                    theme: "transparent",
                    customClass: "text-black w-full"
                }
            ]
        }
    ]
};

const AttndanceRequestForm: React.FC = () => {
    const handleSubmit = (submission: any) => {
        console.log("Form data:", submission.data);
        // Send data to API here
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Form
                form={attndanceRequestFormSchema}
                onSubmit={handleSubmit}
                options={{
                    builder: { styles: false },
                    submitButton: false,
                    noAlerts: true
                }}
                className="formio-no-border" // custom class to strip form border
            />
        </div>
    );
};

export default AttndanceRequestForm;
