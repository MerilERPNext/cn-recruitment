import React, { useMemo, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import LayoutHeader from "../../shared/LayoutHeader";
import { useCreateNewAttendanceRequest } from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";

const baseFormComponents = (isForOthers: boolean) => {
    const components = [
        {
            type: "panel",
            key: "attendanceRequestPanel",
            label: "Attendance Request",
            title: "Attendance Request",
            hideLabel: true,
            customClass: "bg-white rounded-lg",
            components: [

                ...(isForOthers
                    ? [
                        {
                            label: "Employee Name",
                            key: "employee",
                            type: "textfield",
                            input: true,
                            placeholder: "John Doe",
                            customClass: "mb-4"
                        },
                        {
                            label: "Company",
                            key: "company",
                            type: "textfield",
                            input: true,
                            placeholder: "Hybrowlabs Technologies",
                            customClass: "mb-4",
                        },
                    ]
                    : []),
                {
                    label: "Request Type",
                    key: "request-type",
                    type: "select",
                    input: true,
                    placeholder: "Select a Request Type",
                    customClass: "mb-4",
                    data: {
                        values: [
                            { label: "Attendance Request", value: "Attendance Request" },
                            { label: "Clockin", value: "Clockin" },
                            { label: "Out Duty", value: "Out Duty" },
                            { label: "Shift Change", value: "Shift Change" },]
                    }
                },
                {
                    customClass: "mb-4",
                    type: "columns",
                    columns: [
                        {
                            components: [
                                {
                                    label: "From Date",
                                    key: "from_date",
                                    type: "datetime",
                                    input: true,
                                    widget: { type: "calendar" },
                                    format: "yyyy-MM-dd",
                                    placeholder: "yyyy-mm-dd",
                                    customClass: "mb-4"
                                }
                            ],
                            width: 6
                        },
                        {
                            components: [
                                {
                                    label: "To Date",
                                    key: "to_date",
                                    type: "datetime",
                                    input: true,
                                    widget: { type: "calendar" },
                                    format: "yyyy-MM-dd",
                                    placeholder: "yyyy-mm-dd",
                                    customClass: "mb-4"
                                }
                            ],
                            width: 6
                        }
                    ]
                },
                {
                    "label": "Break Duration",
                    "tableView": true,
                    "validateWhenHidden": false,
                    "key": "break_duration",
                    "type": "time",
                    "input": true,
                    "inputMask": "99:99"

                },


                {
                    type: "checkbox",
                    key: "overnight_clockout",
                    label: "Overnight Clockout ?",
                    input: true,
                    labelPosition: "bottom",
                    customClass: "custom-halfday-toggle border border-gray-300 rounded-lg shadow-sm p-2 bg-white mb-4 text-xl font-semibold "
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
                            { label: "Work From Home", value: "Work From Home" },
                            { label: "On Duty", value: "On Duty" },
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
                    label: "Attachments",
                    tableView: false,
                    webcam: true,
                    fileTypes: [
                        { label: "Images", value: "image/*" },
                        { label: "Documents", value: "application/*" },
                    ],
                    image: true,
                    imageSize: "200",
                    storage: "base64", // Or 'url' if you have a backend for file storage
                    key: "attachments",
                    type: "file",
                    input: true,
                    tooltip: "Upload receipts or supporting documents.",
                },
                {
                    type: "button",
                    label: "Submit",
                    key: "submit",
                    disableOnInvalid: true,
                    input: true,
                    theme: "transparent",
                    customClass: "text-white w-full bg-black rounded-lg"
                }
            ]
        }
    ];
    return components;
};

interface AttndanceRequestFormProps {
    onClose: () => void;
}
const AttendanceRequestForm: React.FC<AttndanceRequestFormProps> = ({ onClose }) => {
    const [isForOthers, setIsForOthers] = useState(false);
    const { data: user_id } = useLoggedInUser();

    const { data: user } = useCurrentEmployeeAllDetails(user_id as string);
    const mutation = useCreateNewAttendanceRequest()

    const formSchema = useMemo(() => ({
        title: "Attendance Request",
        name: "attendanceRequest",
        path: "attendance-request",
        display: "form",
        components: baseFormComponents(isForOthers),
    }), [isForOthers]);
    const handleSubmit = (submission: any) => {
        console.log("Form data:", submission.data);
        const body = {
            company: isForOthers ? submission?.data?.company : user?.company,
            employee: isForOthers ? submission?.data?.employee : user?.employee,
            explanation: submission?.data?.explanation,
            reason: submission?.data?.reason,
            from_date: submission?.data?.from_date ? formatDateToYYYYMMDD(new Date(submission?.data?.from_date)) : null,
            to_date: submission?.data?.to_date ? formatDateToYYYYMMDD(new Date(submission?.data?.to_date)) : null,
            include_holidays: 1
        };
        mutation.mutate(body, {
            onSuccess: () => {
                onClose();
            },
            onError: (error) => {
                console.error(error)
            }
        })
    };
    return (<div className="fixed top-0 z-20 w-full mx-auto left-0 h-screen bg-white overflow-scroll">
        <LayoutHeader
            tab="Attendance Request"
            onBack={() => {
                onClose()
            }}
            icon="x"
        />
        <div className=" p-4 ">
            <div className="flex gap-2 mb-2 bg-gray-200 p-1 rounded-md">
                <button
                    style={{ outline: "none", border: "none" }}
                    className={`w-full p-2 rounded text-gray-500  ${!isForOthers ? "bg-white text-black" : ""}`}
                    onClick={() => setIsForOthers(false)}
                >
                    Self
                </button>
                <button
                    style={{ outline: "none", border: "none" }}

                    className={`w-full p-2 rounded text-gray-500 ${isForOthers ? "bg-white text-black" : ""}`}
                    onClick={() => setIsForOthers(true)}
                >
                    For Others
                </button>
            </div>

            <Form
                form={formSchema}
                onSubmit={handleSubmit}
                options={{
                    builder: { styles: false },
                    submitButton: false,
                    noAlerts: true
                }}
                className="formio-no-border address-form-container"
            />
        </div>
    </div>
    );
};

export default AttendanceRequestForm;
