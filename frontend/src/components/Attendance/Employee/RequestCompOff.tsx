import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css"; // Ensure you import default styles if not already
import LayoutHeader from "../../shared/LayoutHeader";
import { useLeaveType } from "../../../hooks/useAttendance";
import { useMemo } from "react";
import { useRequestCompOff } from "../../../hooks/useLeaves";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";

const RequestCompOff = () => {
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
                      type: "datetime" as const,
                      key: "fromDate",
                      label: "From Date",
                      input: true,
                      format: "dd/MM/yyyy",
                      enableDate: true,
                      enableTime: false,
                      defaultValue: "2024-05-10",
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
              type: "checkbox",
              key: "halfDay",
              label: "Half-Day Leave",
              description: "Apply for a morning or afternoon leave",
              input: true,
              labelPosition: "bottom",
              customClass: "custom-halfday-toggle border border-gray-300 rounded-lg mt-6 shadow-sm p-2 bg-white mb-4"
            },
            {
              type: 'radio',
              key: 'halfDayOption',
              label: 'Select Half-Day Option',
              values: [
                { label: 'First Half', value: 'first_half' },
                { label: 'Second Half', value: 'second_half' },
              ],
              input: true,
              validate: { required: true },
              conditional: { show: true, when: 'halfDay', eq: true },
              customClass: 'mb-4 ml-4',
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

              customClass: "custom-w-fill-available bg-white  w-full text-white [&>button]:bg-black border-black py-2 px-0 rounded-lg"
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
      work_from_date: submission?.data?.fromDate ? formatDateToYYYYMMDD(new Date(submission?.data?.fromDate)) : null,
      work_end_date: submission?.data?.toDate ? formatDateToYYYYMMDD(new Date(submission?.data?.toDate)) : null,
      reason: submission?.data?.reason,
      include_holidays: 1,
      employee_name: user?.employee_name,
      department: user?.department,
      employee: user?.employee,
    };
    mutation.mutate(body, {
      onSuccess() {
        // onClose()
      },
      onError(e) {
        console.log(e)
        // onClose()
      }
    })
    // Send data to API here
  };

  return (
    <>
      <LayoutHeader
        tab="Request Compensatory Off"
      />
      <div className="z-20 w-full mx-auto left-0 bg-white">
        <div className="max-w-full mx-auto p-4">
          <Form
            form={reqCompensatoryOff}
            onSubmit={handleSubmit}
            options={{
              builder: { styles: false },
              submitButton: false,
              noAlerts: true,
            }}
            className="formio-no-border"
          />
        </div>
      </div>
    </>
  );
};

export default RequestCompOff;
