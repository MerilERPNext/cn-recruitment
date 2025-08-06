import React, { useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import LayoutHeader from "../../shared/LayoutHeader";
import { useCreateNewAttendanceRequest } from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import {
  useCurrentEmployeeAllDetails,
  useGetAllEmployees,
  useGetAllReasons,
} from "../../../hooks/useEmployee";
import { Toaster, toast } from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";

interface AttndanceRequestFormProps {
  onClose: () => void;
}
const AttendanceRequestForm: React.FC<AttndanceRequestFormProps> = ({
  onClose,
}) => {
  const [isForOthers, setIsForOthers] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { data: employeeList } = useGetAllEmployees();
  const { data: reasonList } = useGetAllReasons();

  interface FormioFormInstance {
    submit: () => void;
  }
  const formAddressInstance = useRef<FormioFormInstance | null>(null);
  const mutation = useCreateNewAttendanceRequest();
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
                label: "Employee",
                key: "employee",
                type: "select",
                input: true,
                placeholder: "Select a leave type",
                customClass: "mb-4",
                data: {
                  values:
                    employeeList && employeeList?.length > 0
                      ? employeeList?.map(
                        (item: { name: string; employee_name: string }) => {
                          return {
                            label: item?.employee_name,
                            value: item?.name,
                          };
                        }
                      )
                      : [],
                },
              },
              {
                label: "Company",
                key: "company",
                defaultValue: currentEmployee?.company,
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
                { label: "Shift Change", value: "Shift Change" },
              ],
            },
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
                    customClass: "mb-4",
                  },
                ],
                width: 6,
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
                    customClass: "mb-4",
                  },
                ],
                width: 6,
              },
            ],
          },

          {
            label: "Reason",
            key: "reason",
            type: "select",
            input: true,
            placeholder: "Select a reason",
            customClass: "mb-4",
            data: {
              values: reasonList?.map((item) => {
                return {
                  label: item?.reason, value: item?.name
                }
              })


            },
          },
          {
            label: "Explanation",
            key: "explanation",
            type: "textarea",
            input: true,
            placeholder: "Provide additional details...",
            rows: 4,
            customClass: "mb-4",
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
            storage: "base64",
            key: "attachments",
            type: "file",
            input: true,
            tooltip: "Upload receipts or supporting documents.",
          },
        ],
      },
    ];
    return components;
  };

  const formSchema = useMemo(
    () => ({
      title: "Attendance Request",
      name: "attendanceRequest",
      path: "attendance-request",
      display: "form",
      components: baseFormComponents(isForOthers),
    }),
    [isForOthers, employeeList, currentEmployee, reasonList]
  );

  interface AttendanceFormData {
    company?: string;
    employee?: string;
    explanation?: string;
    reason?: string;
    from_date?: string | Date;
    to_date?: string | Date;
  }
  const handleSubmit = async (submission: { data: AttendanceFormData }) => {
    const body = {
      company: isForOthers ? submission?.data?.company : currentEmployee?.company,
      employee: isForOthers ? submission?.data?.employee : currentEmployee?.employee,
      explanation: submission?.data?.explanation,
      custom__request_reason: submission?.data?.reason,
      from_date: submission?.data?.from_date
        ? formatDateToYYYYMMDD(new Date(submission?.data?.from_date))
        : null,
      to_date: submission?.data?.to_date
        ? formatDateToYYYYMMDD(new Date(submission?.data?.to_date))
        : null,
      include_holidays: 1,
    };

    mutation.mutate(body, {
      onSuccess: () => {
        onClose();
        toast.success("Added Attendace Request successfully");
      },
      onError: (error) => {
        toast.error("Failed to add Attendace Request");
        console.error(error);
      },
    });
  };

  return (
    <div className="fixed top-0 left-0 w-full h-screen bg-white z-50 flex flex-col">
      {/* Fixed Header */}

      <div className="z-10">
        <LayoutHeader
          tab="Create Attendance Request"
          onBack={onClose}
          icon="x"
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-14 pb-28 px-2">
        <div className="flex bg-white rounded-lg p-1 mt-2 border border-gray-200">
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-500 ${!isForOthers ? "bg-black text-white" : ""
              }`}
            onClick={() => setIsForOthers(false)}
          >
            Self
          </button>
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-500 ${isForOthers ? "bg-black text-white" : ""
              }`}
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
            noAlerts: true,
          }}
          onFormReady={(instance: FormioFormInstance) => {
            formAddressInstance.current = instance;
          }}
          className="formio-no-border address-form-container"
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-md py-4 px-2 z-20">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => formAddressInstance.current?.submit()}
            className="w-full max-h-12 bg-gray-900 text-white py-4 rounded-lg font-semibold flex items-center justify-center"
          >
            {mutation.isPending ? (
              <div className="w-5 h-5 my-0 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </div>
      <Toaster position="top-center" containerClassName="z-50" />
    </div>
  );
};

export default AttendanceRequestForm;
