import React, { useCallback, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import LayoutHeader from "../../shared/LayoutHeader";
import {
  useCreateNewAttendanceRequest,
  useGetEmployeeShift,
} from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import {
  useCurrentEmployeeAllDetails,
  useGetAllEmployees,
  useGetAllReasons,
} from "../../../hooks/useEmployee";
import { useShiftTypes } from "../../../hooks/useShift";
import { Toaster, toast } from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useAllEmployeeCheckIns } from "../../../hooks/useAttendance";

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
  const { data: shiftList } = useShiftTypes();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedRequestType, setSelectedRequestType] = useState<string>("");

  const { data: reasonList } = useGetAllReasons(selectedRequestType);

  const { data: employeeCheckInLogs } = useAllEmployeeCheckIns();

  // ...existing code...
  const employeeIdToShow = isForOthers
    ? selectedEmployee
    : currentEmployee?.employee;

  const filteredLogs = employeeCheckInLogs?.filter(
    (log) => log.employee === employeeIdToShow
  );

  // Sort logs by time (descending)
  const sortedLogs = filteredLogs?.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  // Get latest check-in and check-out
  const latestCheckIn = sortedLogs?.find((log) => log.log_type === "IN");
  const latestCheckOut = sortedLogs?.find((log) => log.log_type === "OUT");

  const latestCheckInTime = latestCheckIn ? latestCheckIn.time : "N/A";
  const latestCheckOutTime = latestCheckOut ? latestCheckOut.time : "N/A";

  // ...existing code...

  // Get shift for current employee or selected employee in 'For Others' mode
  const employeeIdToQuery = isForOthers
    ? selectedEmployee
    : currentEmployee?.employee || "";
  const { data: employeeShift, refetch: refetchShift } = useGetEmployeeShift(
    employeeIdToQuery,
    { employee: employeeIdToQuery } // Pass employee ID as filter
  );

  // Handle employee selection change
  const handleEmployeeChange = (event: { data: { employee: string } }) => {
    // Get the selected value from the form data
    const employeeId = event?.data?.employee || "";

    // Update the selected employee state
    setSelectedEmployee(employeeId);
  };
  // Handle employee selection change
  const handleRequestTypeChange = useCallback(
    (event: { data: { request_type: string } }) => {
      const requestType = event?.data?.request_type || "";
      setSelectedRequestType(requestType);
    },
    []
  );

  // ...existing code...

  React.useEffect(() => {
    if (formAddressInstance.current) {
      // Update Latest Check-In Time
      const checkInComponent = formAddressInstance.current.getComponent(
        "latest_checkin_time"
      );
      if (checkInComponent) {
        checkInComponent.setValue(latestCheckInTime, { noUpdateEvent: true });
        checkInComponent.redraw();
      }
      // Update Latest Check-Out Time
      const checkOutComponent = formAddressInstance.current.getComponent(
        "latest_checkout_time"
      );
      if (checkOutComponent) {
        checkOutComponent.setValue(latestCheckOutTime, { noUpdateEvent: true });
        checkOutComponent.redraw();
      }
    }
  }, [latestCheckInTime, latestCheckOutTime, selectedEmployee, isForOthers]);

  // ...existing code...
  // Update shift and company fields when employee data changes
  React.useEffect(() => {
    if (formAddressInstance.current) {
      // Update company field based on selected employee or current user
      let company = "Not Assigned";
      if (isForOthers && selectedEmployee) {
        const selectedEmp = employeeList?.find(
          (emp) => emp.name === selectedEmployee
        );
        company = selectedEmp?.company || "Not Assigned";
      } else if (currentEmployee?.company) {
        company = currentEmployee.company;
      }

      const companyComponent =
        formAddressInstance.current.getComponent("company");
      if (companyComponent) {
        companyComponent.setValue(company, { noUpdateEvent: true });
        companyComponent.redraw();
      }

      // Update shift field if employeeShift is available
      if (employeeShift) {
        const shiftValue = employeeShift.shift || "Not Assigned";
        const shiftComponent =
          formAddressInstance.current.getComponent("current_shift");
        if (shiftComponent) {
          shiftComponent.setValue(shiftValue, { noUpdateEvent: true });
          shiftComponent.redraw();
        }
      }
    }
  }, [
    employeeShift,
    selectedEmployee,
    isForOthers,
    currentEmployee,
    employeeList,
  ]);

  // Refetch shift when employee changes
  React.useEffect(() => {
    if (employeeIdToQuery) {
      refetchShift();
    }
  }, [employeeIdToQuery, refetchShift]);

  interface FormioFormInstance {
    submit: () => void;
    getValue: () => { data: AttendanceFormData };
    setValue: (value: { data: AttendanceFormData }) => void;
    redraw: () => void;
    getComponent: (key: string) => {
      setValue: (value: string, options?: { noUpdateEvent?: boolean }) => void;
      redraw: () => void;
    } | null;
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
                  placeholder: "Select Employee",
                  customClass: "mb-4",
                  // Form.io will automatically update the form data
                  onChange: handleEmployeeChange,
                  validate: { required: true },
                  data: {
                    values:
                      employeeList && employeeList?.length > 0
                        ? employeeList?.map(
                            (item: {
                              name: string;
                              employee_name: string;
                            }) => ({
                              label: `${item?.employee_name} (${item?.name})`,
                              value: item?.name,
                            })
                          )
                        : [],
                  },
                },
                {
                  label: "Company",
                  key: "company",
                  type: "textfield",
                  input: true,
                  placeholder:
                    isForOthers && !selectedEmployee
                      ? "Select an employee first"
                      : "Loading company information...",
                  customClass: "mb-4",
                  disabled: true,
                  defaultValue: currentEmployee?.company || "Not Assigned",
                  value: currentEmployee?.company || "Not Assigned",
                  clearOnHide: false,
                },
              ]
            : []),

          {
            label: "Request Type",
            key: "request_type",
            type: "select",
            input: true,
            onChange: handleRequestTypeChange,
            placeholder: "Select a Request Type",
            customClass: "mb-4",
            data: {
              values: [
                { label: "Clockin Request", value: "Clockin" },
                { label: "Out Duty Request", value: "Out Duty" },
                {
                  label: "Short Attendance Request",
                  value: "Short Attendance Request",
                },
                {
                  label: "Attendance Adjustment",
                  value: "Attendance Adjustment",
                },
                { label: "Shift Change Request", value: "Shift Change" },
              ],
            },
          },
          // Employee Shift Information (Read-only)
          {
            label: "Current Shift",
            key: "current_shift",
            type: "textfield",
            input: true,
            placeholder:
              isForOthers && !selectedEmployee
                ? "Select an employee first"
                : "Loading shift information...",
            customClass: "mb-4",
            disabled: true,
            defaultValue: employeeShift?.shift || "Not Assigned",
            value: employeeShift?.shift || "Not Assigned",
            clearOnHide: false,
          },
          // Date fields (shown for all request types)
          {
            label: "From Date",
            key: "from_date",
            type: "datetime",
            input: true,
            widget: { type: "calendar" },
            format: "dd-MM-yyyy",
            placeholder: "dd-mm-yyyy",
            customClass: "mb-4",
            enableTime: false,
            validate: { required: true },
          },
          {
            label: "To Date",
            key: "to_date",
            type: "datetime",
            input: true,
            widget: { type: "calendar" },
            format: "dd-MM-yyyy",
            placeholder: "dd-mm-yyyy",
            customClass: "mb-4",
            enableTime: false,
            validate: { required: true },
            customConditional:
              "show = !['Clockin'].includes(data.request_type || '');",
          },
          {
            label: "From Time",
            key: "custom_from_time",
            type: "datetime",
            input: true,
            enableDate: false,
            enableTime: true,
            format: "HH:mm:ss",
            placeholder: "HH:mm:ss",
            customClass: "mb-4",
            customConditional:
              "show = ['Out Duty', 'Attendance Adjustment', 'Short Attendance Request', 'Clockin'].includes(data.request_type || '');",
            widget: {
              type: "calendar",
              time_24hr: true,
              noCalendar: true,
              enableTime: true,
              dateFormat: "H:i",
            },
          },
          {
            label: "To Time",
            key: "custom_to_time",
            type: "datetime",
            input: true,
            enableDate: false,
            enableTime: true,
            format: "HH:mm:ss",
            placeholder: "HH:mm:ss",
            customClass: "mb-4",
            customConditional:
              "show = ['Out Duty', 'Attendance Adjustment', 'Short Attendance Request'].includes(data.request_type || '');",
            time_24hr: true,
            widget: {
              type: "calendar",
              time_24hr: true,
              noCalendar: true,
              enableTime: true,
              dateFormat: "H:i",
              widget: {
                type: "calendar",
                time_24hr: true,
                noCalendar: true,
                enableTime: true,
                dateFormat: "H:i",
              },
            },
          },

          // Overnight Out Duty checkbox (for Out Duty)
          {
            label: "Overnight Out Duty",
            key: "overnight_out_duty",
            type: "checkbox",
            input: true,
            customClass: "mb-4",
            customConditional: "show = data.request_type === 'Out Duty';",
            defaultValue: false,
          },
          {
            label: "Latest Check-In Time",
            key: "latest_checkin_time",
            type: "textfield",
            input: true,
            disabled: true,
            customClass: "mb-4",
            defaultValue: latestCheckInTime,
            value: latestCheckInTime,
            clearOnHide: false,
            customConditional:
              "show = data.request_type === 'Attendance Adjustment';",
          },
          {
            label: "Latest Check-Out Time",
            key: "latest_checkout_time",
            type: "textfield",
            input: true,
            disabled: true,
            customClass: "mb-4",
            defaultValue: latestCheckOutTime,
            value: latestCheckOutTime,
            clearOnHide: false,
            customConditional:
              "show = data.request_type === 'Attendance Adjustment';",
          },
          // Shift selection for Shift Change
          {
            label: "Select Shift",
            key: "select_shift",
            type: "select",
            input: true,
            placeholder: "Select shift",
            customClass: "mb-4",
            customConditional: "show = data.request_type === 'Shift Change';",
            data: {
              values:
                shiftList?.data?.map((item) => ({
                  label: `${item.name}`,
                  value: item.name,
                })) || [],
            },
          },
          // Reason field (shown for all except Shift Change)
          {
            label: "Reason",
            key: "reason",
            type: "select",
            input: true,
            placeholder: "Select a reason",
            customClass: "mb-4",
            customConditional: "show = data.request_type !== 'Shift Change';",
            data: {
              values:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                reasonList?.map((item: { reason: string }) => ({
                  label: item?.reason || "",
                  value: item?.reason,
                })) || [],
            },
          },
          // Message field (shown for all)
          {
            label: "Message",
            key: "message",
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
            storage: "customBase64",
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
    request_type?: string;
    company?: string;
    employee?: string;
    message?: string;
    reason?: string;
    from_date?: string | Date;
    to_date?: string | Date;
    clockin_time?: string | Date;
    clockout_time?: string | Date;
    custom_from_time?: string | Date;
    custom_to_time?: string | Date;
    select_shift?: string;
    overnight_out_duty?: boolean;
    attachments?: File[];
    custom_attachments?: File;
  }

  const formatTime = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    const d = new Date(date);
    // Using 'en-GB' locale is a common way to get 24-hour format HH:mm:ss
    return d.toLocaleTimeString("en-GB");
  };

  const handleSubmit = async (submission: { data: AttendanceFormData }) => {
    const baseBody = {
      request_type: submission.data.request_type,
      company: isForOthers ? submission.data.company : currentEmployee?.company,
      employee: isForOthers
        ? submission.data.employee
        : currentEmployee?.employee,
      message: submission.data.message,
      ...(submission.data.from_date && {
        from_date: formatDateToYYYYMMDD(new Date(submission.data.from_date)),
      }),
      ...(submission.data.to_date && {
        to_date: formatDateToYYYYMMDD(new Date(submission.data.to_date)),
      }),
    };

    let requestBody: AttendanceFormData = { ...baseBody };

    // Handle different request types
    switch (submission.data.request_type) {
      case "Clockin":
        requestBody = {
          ...baseBody,
          to_date: baseBody.from_date,
          custom_from_time: formatTime(submission.data.custom_from_time),
          reason: submission.data.reason,
        };
        break;
      case "Out Duty":
        requestBody = {
          ...baseBody,
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          reason: submission.data.reason,
          overnight_out_duty: submission.data.overnight_out_duty || false,
        };
        break;

      case "Short Attendance Request":
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(
            new Date(submission.data.from_date || new Date())
          ),
          to_date: formatDateToYYYYMMDD(
            new Date(submission.data.to_date || new Date())
          ),
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          reason: submission.data.reason,
        };
        break;

      case "Attendance Adjustment":
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(
            new Date(submission.data.from_date || new Date())
          ),
          to_date: formatDateToYYYYMMDD(
            new Date(submission.data.to_date || new Date())
          ),
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          reason: submission.data.reason,
        };
        break;

      case "Shift Change":
        requestBody = {
          ...baseBody,
          select_shift: submission.data.select_shift,
        };
        break;
    }

    if (submission.data.attachments?.[0]) {
      requestBody.custom_attachments = submission.data.attachments[0];
    }

    mutation.mutate(requestBody as Record<string, unknown>, {
      onSuccess: () => {
        onClose();
        toast.success("Added Attendace Request successfully");
      },
      onError: (error) => {
        toast.error(error?.message);
        console.error(error);
      },
    });
  };

  return (
    <div className="absolute inset-0 w-full h-screen bg-white z-50 flex flex-col">
      <div className="max-w-md mx-auto bg-white rounded-lg">
        <LayoutHeader
          tab="Create Attendance Request"
          onBack={onClose}
          icon="x"
        />
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto pt-14 px-2 min-h-screen pb-22">
        <div className="flex bg-white rounded-lg p-1 mt-2 border border-gray-200">
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-500 ${
              !isForOthers ? "bg-black text-white" : ""
            }`}
            onClick={() => setIsForOthers(false)}
          >
            Self
          </button>
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-500 ${
              isForOthers ? "bg-black text-white" : ""
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

      <div className="fixed w-full bottom-0 bg-white border-t shadow-md p-4 z-20">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => formAddressInstance.current?.submit()}
            className="flex-1 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
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
