/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef } from "react";
import { createPortal } from "react-dom";
import "../../../formio.custom.css";
import toast from "react-hot-toast";
import {
  useAttendanceById,
  useEditAttendance,
} from "../../../hooks/useAttendance";
import CircularLoader from "../../shared/atoms/CircularLoader";
import { format } from "date-fns";

interface EditAttendanceProps {
  onClose: () => void;
  open?: boolean;
  requestId: string;
  employeeName: string;
  employeeId: string;
  onRefetchData?: (() => void) | null;
}
export const EditAttendance = ({
  onClose,
  open = true,
  requestId,
  employeeId,
  employeeName,
  onRefetchData,
}: EditAttendanceProps) => {
  const formInstance = useRef<any>(null);
  const { data, isLoading } = useAttendanceById(open, [
    ["name", "=", requestId],
    ["employee", "=", employeeId],
  ]);
  const mutation = useEditAttendance();
  // Only build form after data is available
  const attendanceForm = data?.[0]
    ? {
        display: "form",
        components: [
          {
            type: "panel",
            key: "attendance_assignments",
            label: "Attendance Assignments",
            hideLabel: true,
            customClass: "border-0",
            components: [
              {
                label: "Employee",
                key: "employee",
                type: "textfield",
                input: true,
                disabled: true,
                customClass: "mb-4",
                defaultValue: employeeName || "",
              },
              {
                label: "Attendance Date",
                key: "attendance_date",
                type: "datetime",
                input: true,
                disabled: true,
                widget: { type: "calendar" },
                format: "dd-MM-yyyy",
                defaultValue: data[0].attendance_date,
                placeholder: "dd-mm-yyyy",
                customClass: "mb-4",
                enableTime: false,
              },
              {
                label: "Shift",
                key: "shift",
                type: "textfield",
                input: true,
                disabled: true,
                customClass: "mb-4",
                defaultValue: data[0].shift || "",
              },
              {
                type: "columns",
                key: "in_out_time_row",
                customClass: "mb-4",
                columns: [
                  {
                    components: [
                      {
                        label: "In Time",
                        key: "in_time",
                        type: "datetime",
                        input: true,
                        enableDate: false,
                        enableTime: true,
                        format: "HH:mm:ss",
                        placeholder: "hh:mm",
                        defaultValue: data[0].in_time,
                        widget: {
                          type: "calendar",
                          time_24hr: true,
                          noCalendar: true,
                          enableTime: true,
                          dateFormat: "H:i",
                        },
                      },
                    ],
                  },
                  {
                    components: [
                      {
                        label: "Out Time",
                        key: "out_time",
                        type: "datetime",
                        input: true,
                        enableDate: false,
                        enableTime: true,
                        format: "HH:mm:ss",
                        placeholder: "hh:mm",
                        widget: {
                          type: "calendar",
                          time_24hr: true,
                          noCalendar: true,
                          enableTime: true,
                          dateFormat: "H:i",
                        },
                        defaultValue: data[0].out_time,
                      },
                    ],
                  },
                ],
              },

              {
                label: "Status",
                key: "status",
                type: "select",
                input: true,
                placeholder: "Select Status",
                customClass: "mb-4",
                defaultValue: data[0].status || "",
                validate: { required: true },
                data: {
                  values: [
                    {
                      label: "Present",
                      value: "Present",
                    },
                    {
                      label: "Absent",
                      value: "Absent",
                    },
                    {
                      label: "On Leave",
                      value: "On Leave",
                    },
                    {
                      label: "Half Day",
                      value: "Half Day",
                    },
                    {
                      label: "Work From Home",
                      value: "Work From Home",
                    },
                  ],
                },
              },

              {
                label: "Working Hours",
                key: "working_hours",
                type: "number",
                input: true,
                disabled: true,
                customClass: "mb-4",
                defaultValue: data[0].working_hours || 0,
                step: "0.01",
              },
              {
                label: "Department",
                key: "department",
                type: "textfield",
                input: true,
                disabled: true,
                customClass: "mb-4",
                defaultValue: data[0].department || "",
              },
              {
                label: "Company",
                key: "company",
                type: "textfield",
                input: true,
                disabled: true,
                customClass: "mb-4",
                defaultValue: data[0].company || "",
              },
            ],
          },
        ],
      }
    : null;

  const formatTime = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    const d = new Date(date);

    // Format the date using date-fns
    return format(d, "yyyy-MM-dd HH:mm:ss");
  };

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();
      const submissionData = submission?.data || {};
      mutation.mutate(
        {
          attendance_doc_name: requestId,
          attendance_fields: {
            ...data?.[0],
            in_time: formatTime(submissionData?.in_time),
            out_time: formatTime(submissionData?.out_time),
            status: submissionData?.status,
          },
        },
        {
          onSuccess() {
            toast.success("Updated Attendance Successfully.");
            if (onRefetchData) {
              onRefetchData();
            }
            onClose();
          },
          onError() {
            toast.success("Failed while updating attendance.");
          },
        }
      );
    } catch (err) {
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error -", err);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Edit Attendance
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {!attendanceForm && isLoading ? (
            <div className="h-full w-full flex justify-center items-center">
              <CircularLoader size="lg" />
            </div>
          ) : (
            <Form
              form={attendanceForm}
              onFormReady={(instance: any) => {
                formInstance.current = instance;
              }}
              options={{
                builder: { styles: false },
                submitButton: false,
                alerts: false,
                disableOnSubmit: true,
                formClass: "space-y-6",
                rowClass: "flex flex-col md:flex-row md:space-x-4",
                labelClass: "mb-1 font-medium text-gray-700",
                inputClass:
                  "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
                validateOnInit: true,
                validateOnBlur: true,
                validateOnChange: false,
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <button
            onClick={() => {
              handleSubmit();
            }}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            disabled={!attendanceForm}
          >
            {mutation?.isPending ? (
              <CircularLoader size="sm" color="white" />
            ) : (
              "Update"
            )}{" "}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
