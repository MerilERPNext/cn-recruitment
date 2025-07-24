import React, { useState, useMemo } from "react";
// @ts-expect-error ignore
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
                            placeholder: "Design",
                            customClass: "mb-4",
                        },
                    ]
                    : []),
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
            from_date: formatDateToYYYYMMDD(new Date(submission?.data?.from_date)),
            to_date: formatDateToYYYYMMDD(new Date(submission?.data?.to_date)),
            include_holidays: 1
        };
        mutation.mutate(body)
        // API call or further logic here
    };
    return (<div className="fixed top-0 z-20 w-full mx-auto left-0 h-screen bg-white">
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
                className="formio-no-border"
            />
        </div>
    </div>
    );
};

export default AttendanceRequestForm;
