/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form } from "@tsed/react-formio";
import { format } from "date-fns";
import { X } from "lucide-react";
import { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import "../../../formio.custom.css";
import {
  useAttendanceById,
  useEditAttendance,
  useGetEmployeeShift,
} from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import CircularLoader from "../../shared/atoms/CircularLoader";
import { Typography } from "../../shared/atoms/Typography";

interface EditAttendanceProps {
  onClose: () => void;
  open?: boolean;
  requestId: string | undefined;
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
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string,
  );
  const { data, isLoading: isDataLoading } = useAttendanceById(open, [
    ["name", "=", requestId],
    // ["employee", "=", effectiveEmployeeId],
  ]);
  const attendanceDate = data?.[0]?.attendance_date;
  const { data: shiftData, isLoading: isShiftLoading } = useGetEmployeeShift(
    currentEmployee?.user_id || "",
    {
      date: attendanceDate,
    },
  );
  const mutation = useEditAttendance();

  const isActuallyLoading =
    isDataLoading || (open && !!employeeId && isShiftLoading);

  const initialSubmission = useMemo(() => {
    if (!data?.[0] || isActuallyLoading) return undefined;

    const normalizeTimeValue = (val?: string | null) => {
      if (!val) return undefined;
      // If it's already a full datetime string, parse it
      if (val.includes(" ") || val.includes("T")) {
        const d = new Date(val.replace(" ", "T"));
        return isNaN(d.getTime()) ? undefined : d;
      }
      // If it's just a time string (HH:mm or HH:mm:ss), prefix it
      if (val.includes(":")) {
        const d = new Date(`1970-01-01T${val}`);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return val;
    };

    return {
      data: {
        employee: employeeName || employeeId || "",
        attendance_date: data[0].attendance_date,
        shift: data[0].shift || shiftData?.shift || "",
        in_time: normalizeTimeValue(data[0].in_time || shiftData?.start_time),
        out_time: normalizeTimeValue(data[0].out_time || shiftData?.end_time),
        status: data[0].status || "",
        working_hours: data[0].working_hours || 0,
        department: data[0].department || "",
        company: data[0].company || "",
      },
    };
  }, [data, employeeName, employeeId, shiftData, isActuallyLoading]);

  // Only build form after data is available
  const attendanceForm = useMemo(() => {
    if (!data?.[0] || isActuallyLoading) return null;

    return {
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
            },
            {
              label: "Attendance Date",
              key: "attendance_date",
              type: "datetime",
              input: true,
              disabled: true,
              widget: { type: "calendar" },
              format: "dd-MM-yyyy",
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
              validate: { required: true },
              data: {
                values: [
                  { label: "Present", value: "Present" },
                  { label: "Absent", value: "Absent" },
                  { label: "On Leave", value: "On Leave" },
                  { label: "Half Day", value: "Half Day" },
                  { label: "Work From Home", value: "Work From Home" },
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
              step: "0.01",
            },
            {
              label: "Department",
              key: "department",
              type: "textfield",
              input: true,
              disabled: true,
              customClass: "mb-4",
            },
            {
              label: "Company",
              key: "company",
              type: "textfield",
              input: true,
              disabled: true,
              customClass: "mb-4",
            },
          ],
        },
      ],
    };
  }, [data, isActuallyLoading]);

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
            toast.error("Failed while updating attendance.");
          },
        },
      );
    } catch (err) {
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error -", err);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[85vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="h4"
            className="text-lg font-semibold text-gray-800"
          >
            Edit Attendance
          </Typography>
          {isDesktop && (
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
          )}
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 pt-4 pb-32 md:pb-6">
          {isActuallyLoading ? (
            <div className="h-full w-full flex justify-center items-center">
              <CircularLoader size="lg" />
            </div>
          ) : (
            <Form
              form={attendanceForm}
              submission={initialSubmission}
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
        <div className="fixed md:static bottom-0 w-full border-gray-200 bg-white border-t shadow-md p-4 z-20">
          <div className="max-w-4xl mx-auto flex flex-row gap-3 md:gap-4 md:justify-end">
            {!isDesktop && (
              <Button
                onClick={onClose}
                size="md"
                variant="outline"
                className="w-full md:w-auto min-w-[150px] rounded-md font-brand"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={() => {
                handleSubmit();
              }}
              size="md"
              variant="contain"
              bgColor="primary"
              className="w-full md:w-auto min-w-[150px] rounded-md font-brand"
              disabled={!attendanceForm}
            >
              {mutation?.isPending ? (
                <CircularLoader size="sm" color="white" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
