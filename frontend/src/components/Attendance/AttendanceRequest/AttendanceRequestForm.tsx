
import React from "react";
import { Form } from "react-formio";

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
            components: [
                {
                    label: "Employee Name",
                    key: "employeeName",
                    type: "textfield",
                    input: true,
                    placeholder: "John Doe",
                    customClass: "w-full border border-gray-300 px-3 py-2 rounded-lg"
                },
                {
                    label: "Department",
                    key: "department",
                    type: "textfield",
                    input: true,
                    placeholder: "Design"
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
                                    format: "yyyy-MM-dd"
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
                                    format: "yyyy-MM-dd"
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
                    rows: 4
                },
                {
                    type: "button",
                    label: "Submit",
                    key: "submit",
                    disableOnInvalid: true,
                    input: true,
                    theme: "primary"
                }
            ]
        }
    ]
};

const AttndanceRequestForm: React.FC = () => {
    const handleSubmit = (submission: any) => {
        console.log("Form data:", submission.data);
        // You can send this to your API here
    };

    return (
        <div className="h-full w-full p-2">
            <Form
                form={attndanceRequestFormSchema}
                onSubmit={handleSubmit}
                options={{
                    builder: { styles: false },
                    submitButton: false,
                    noAlerts: true,

                }}
            />
        </div>
    );
};

export default AttndanceRequestForm;
