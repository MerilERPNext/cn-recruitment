
// @ts-expect-error ignore
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css"; // Ensure you import default styles if not already
import LayoutHeader from "../../shared/LayoutHeader";
import { useLeaveType } from "../../../hooks/useAttendance";
import { useMemo } from "react";
import { useRequestCompOff } from "../../../hooks/useLeaves";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";

const RequestCompOff = ({ onClose }: { onClose: () => void }) => {
    const { data } = useLeaveType();
    const mutation = useRequestCompOff()
    const reqCompensatoryOff = useMemo(() => {
        return {
            title: "Request Compensatory Off",
            name: "requestCompensatoryOff",
            path: "request-compensatory-off",
            display: "form",
            components: [
                {
                    type: "panel",
                    key: "requestCompensatoryOff",
                    label: "Request Compensatory",
                    title: "Request Compensatory",
                    hideLabel: true,
                    customClass: "bg-white rounded-lg",
                    components: [
                        {
                            label: "Leave Type",
                            key: "leave_type",
                            type: "select",
                            input: true,
                            placeholder: "Select a leave type",
                            customClass: "mb-4",
                            data: {
                                values: data && data?.length > 0 ?
                                    data?.map((item: { name: any; leave_type_name: any; }) => { return { label: item?.name, value: item?.leave_type_name } }) : []

                            }
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
                                            key: "toDate",
                                            type: "datetime",
                                            input: true,
                                            placeholder: "yyyy-mm-dd",
                                            widget: { type: "calendar" },
                                            format: "yyyy-MM-dd",
                                            customClass: "mb-4 mt-4"
                                        }
                                    ],
                                    width: 6
                                }
                            ]
                        },
                        {
                            label: "Reason for Comp Off",
                            key: "reason",
                            type: "textarea",
                            input: true,
                            placeholder: "Provide additional details...",
                            rows: 4,
                            customClass: "mb-4 mt-4"
                        },
                        {
                            type: "button",
                            label: "Submit Request",
                            key: "submit",
                            disableOnInvalid: true,
                            input: true,
                            theme: "transparent",
                            customClass: "fixed bottom-0 left-0 custom-w-fill-available bg-white border-t p-4 m-4 text-black [&>button]:border-1 border-black py-2 rounded-lg"
                        }
                    ]
                }
            ]
        };
    }, [data])
    const { data: user_id } = useLoggedInUser();

    const { data: user } = useCurrentEmployeeAllDetails(user_id as string);
    const handleSubmit = (submission: any) => {
        console.log("Form data:", submission.data);
        const body = {
            leave_type: submission?.data?.leave_type,
            work_from_date: formatDateToYYYYMMDD(new Date(submission?.data?.fromDate)),
            work_end_date: formatDateToYYYYMMDD(new Date(submission?.data?.toDate)),
            reason: submission?.data?.reason,
            include_holidays: 1,
            employee_name: user?.employee_name,
            department: user?.department,
            employee: user?.employee,
        };
        mutation.mutate(body)
        // Send data to API here
    };

    return (
        <div className="fixed top-0 z-20 w-full mx-auto left-0 h-screen bg-white">
            <LayoutHeader tab="Request Compensatory Off"
                onBack={() => {
                    onClose()
                }}
                icon="x"
            />
            <div className="max-w-2xl h-full w-full mx-auto p-4">
                <Form
                    form={reqCompensatoryOff}
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
}

export default RequestCompOff
