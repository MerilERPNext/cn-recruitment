import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import {
  useCheckAttachmentMandatory,
  useCreateNewAttendanceRequest,
  useGetEmployeeShift,
  useGetUserRoles,
  useReqValidationsForAttendanceRequest,
  useUpdateAttendanceRequest,
} from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import {
  useCurrentEmployeeAllDetails,
  useEmployeeReportees,
  useGetAllReasons,
} from "../../../hooks/useEmployee";
import { useShiftTypes } from "../../../hooks/useShift";
import { toast } from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useAllEmployeeCheckIns } from "../../../hooks/useAttendance";
import { X } from "lucide-react";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import { AttendanceRequest } from "../../../types/attendance";

interface AttendanceFormData {
  request_type?: string;
  company?: string;
  employee?: string;
  message?: string;
  custom__request_reason?: string;
  from_date?: string | Date;
  to_date?: string | Date;
  clockin_time?: string | Date;
  clockout_time?: string | Date;
  custom_from_time?: string | Date;
  custom_to_time?: string | Date;
  select_shift?: string;
  overnight_out_duty?: boolean;
  attachments?: { url: string }[];
  custom_attachment?: string;
  custom_location?: string;
}

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

interface AttndanceRequestFormProps {
  onClose: () => void;
  selectedDate?: Date | string;
  defaultAttendanceData?: AttendanceRequest | null;
  forActionType?: "create" | "edit";
}

const AttendanceRequestForm: React.FC<AttndanceRequestFormProps> = ({
  onClose,
  selectedDate = new Date(),
  defaultAttendanceData,
  forActionType = "create",
}) => {
  const [isAttachmentRequired, setIsAttachmentRequired] = useState(false);
  const { setRefetchAttendance } = useGlobalStore();
  const formAddressInstance = useRef<FormioFormInstance | null>(null);

  const [formData, setFormData] = useState<AttendanceFormData>();

  const [isForOthers, setIsForOthers] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  const { data: employeeReporteeList } = useEmployeeReportees();
  const { data: userRoles } = useGetUserRoles();
  const { data: shiftList } = useShiftTypes();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedRequestType, setSelectedRequestType] = useState<string>(defaultAttendanceData?.custom_request_type ||"");

  const { data: reasonList } = useGetAllReasons(selectedRequestType);
  const employeeIdToShow = isForOthers
    ? selectedEmployee
    : currentEmployee?.employee;
  const { data: employeeCheckInLogs } = useAllEmployeeCheckIns([
    ["time", "between", [formData?.from_date, formData?.to_date]],
    ["employee", "=", employeeIdToShow],
  ]);
  const filteredLogs = employeeCheckInLogs?.filter(
    (log) => log.employee === employeeIdToShow
  );

  const sortedLogs = filteredLogs?.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

    const normalizeTime = (timeStr?: string) => {
        if (!timeStr) return null;
        try {
          // Parse and format to HH:mm:ss
          const [h, m, s] = timeStr.split(":");
          const seconds = s ? s.split(".")[0].padStart(2, "0") : "00";
          return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${seconds}`;
        } catch {
          return null;
        }
    };

  const latestCheckIn = sortedLogs?.find((log) => log.log_type === "IN");
  const latestCheckOut = sortedLogs?.find((log) => log.log_type === "OUT");

  const latestCheckInTime = latestCheckIn ? latestCheckIn.time : "N/A";
  const latestCheckOutTime = latestCheckOut ? latestCheckOut.time : "N/A";

  const employeeIdToQuery = isForOthers
    ? selectedEmployee
    : currentEmployee?.user_id || "";
  const { data: employeeShift, refetch: refetchShift } = useGetEmployeeShift(
    employeeIdToQuery,
    { employee: employeeIdToQuery }
  );

  const handleEmployeeChange = (event: { data: { employee: string } }) => {
    const employeeId = event?.data?.employee || "";
    setSelectedEmployee(employeeId);
  };

  const handleRequestTypeChange = useCallback(
    (event: { data: { request_type: string } }) => {
      const requestType = event?.data?.request_type || "";
      if (
        requestType === "Short Attendance Request" ||
        requestType === "Out Duty"
      ) {
         setSelectedRequestType(
           requestType === "Out Duty" ? "Out Duty Request" : requestType
         );
          
      }
    },
    []
  );

  const { data: attachmentRequirement } = useCheckAttachmentMandatory(
    currentEmployee?.employee,
    format(new Date(), "yyyy-dd-MM"),
    selectedRequestType
  );

  useEffect(() => {
    if (attachmentRequirement) {
      setIsAttachmentRequired(attachmentRequirement?.is_mandatory);
    }
  }, [attachmentRequirement]);

  const mutation = useCreateNewAttendanceRequest();
  const reqValidationmutation = useReqValidationsForAttendanceRequest(
    currentEmployee?.employee as string
  );

  const { mutate: updateAttendanceReuqest } = useUpdateAttendanceRequest();


  const handleFromDateChange = (event: { data: AttendanceFormData }) => {
    const formInstance = formAddressInstance.current;
    if (formInstance) {
      const fromDateValue = event?.data?.from_date;
      const toDateComponent = formInstance.getComponent("to_date");
      if (toDateComponent) {
        toDateComponent.setValue(fromDateValue as string, {
          noUpdateEvent: true,
        });
        toDateComponent.redraw();
      }
    }
  };

  React.useEffect(() => {
    if (formAddressInstance.current) {
      const employeeComponent =
        formAddressInstance.current.getComponent("employee");

      if (employeeComponent) {
        if (isForOthers) {
          // Reset when switching to "For Others"
          setSelectedEmployee("");
          employeeComponent.setValue("", { noUpdateEvent: true });
        } else {
          // Auto-fill current employee when switching back to "Self"
          const empId = currentEmployee?.employee || "";
          setSelectedEmployee(empId);
          employeeComponent.setValue(empId, { noUpdateEvent: true });
        }
        employeeComponent.redraw();
      }
    }
  }, [isForOthers, currentEmployee]);

  React.useEffect(() => {
    if (formAddressInstance.current) {
      const checkInComponent = formAddressInstance.current.getComponent(
        "latest_checkin_time"
      );
      if (checkInComponent) {
        checkInComponent.setValue(latestCheckInTime, { noUpdateEvent: true });
        checkInComponent.redraw();
      }
      const checkOutComponent = formAddressInstance.current.getComponent(
        "latest_checkout_time"
      );
      if (checkOutComponent) {
        checkOutComponent.setValue(latestCheckOutTime, { noUpdateEvent: true });
        checkOutComponent.redraw();
      }
    }
  }, [latestCheckInTime, latestCheckOutTime, selectedEmployee, isForOthers]);

  React.useEffect(() => {
    if (formAddressInstance.current) {
      let company = "Not Assigned";
      if (isForOthers && selectedEmployee) {
        const selectedEmp = employeeReporteeList?.find(
          (emp) => emp.name == selectedEmployee
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
      if (employeeShift) {
        const shiftValue = employeeShift.shift || "Not Assigned";
        const shiftStartValue = employeeShift.start_time || "Not Assigned";
        const shiftEndValue = employeeShift.end_time || "Not Assigned";
        const shiftComponent =
          formAddressInstance.current.getComponent("current_shift");
        const shiftStartComponent =
          formAddressInstance.current.getComponent("shift_start");
        const shiftEndComponent =
          formAddressInstance.current.getComponent("shift_end");
        if (shiftComponent && shiftEndComponent && shiftStartComponent) {
          shiftComponent.setValue(shiftValue, { noUpdateEvent: true });
          shiftStartComponent.setValue(shiftStartValue, {
            noUpdateEvent: true,
          });
          shiftEndComponent.setValue(shiftEndValue, { noUpdateEvent: true });
          shiftComponent.redraw();
          shiftEndComponent.redraw();
          shiftStartComponent.redraw();
        }
      }
    }
  }, [
    employeeShift,
    selectedEmployee,
    isForOthers,
    currentEmployee,
    employeeReporteeList,
  ]);

  React.useEffect(() => {
    if (employeeIdToQuery) {
      refetchShift();
    }
  }, [employeeIdToQuery, refetchShift]);
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
                  defaultValue: defaultAttendanceData?.employee,
                  customClass: "mb-4",
                  onChange: handleEmployeeChange,
                  validate: { required: true },
                  data: {
                    values:
                      employeeReporteeList && employeeReporteeList?.length > 0
                        ? employeeReporteeList?.map(
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
                  defaultValue: defaultAttendanceData?.company || currentEmployee?.company || "Not Assigned",
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
            defaultValue: defaultAttendanceData?.custom_request_type,
            customClass: "mb-4",
            data: {
              values: [
                reqValidationmutation?.data?.clockin_requests
                  ? {
                      label: "Clockin Request",
                      value: "Clockin",
                    }
                  : "",
                reqValidationmutation?.data?.out_duty_requests
                  ? {
                      label: "Out Duty Request",
                      value: "Out Duty",
                    }
                  : "",
                reqValidationmutation?.data?.short_leave_requests
                  ? {
                      label: "Short Attendance Request",
                      value: "Short Attendance Request",
                    }
                  : "",
                reqValidationmutation?.data?.attendance_adjustment_requests
                  ? {
                      label: "Attendance Adjustment",
                      value: "Attendance Adjustment",
                    }
                  : "",
              ],
            },
          },
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
            hidden: true
          },

          {
            type: "columns",
            key: "dateColumns",
            columns: [
              {
                width: 6,
                components: [
                  {
                    type: "textfield",
                    key: "shift_start",
                    label: "Shift Start",
                    enableDate: true,
                    enableTime: false,
                    placeholder:
                      isForOthers && !selectedEmployee
                        ? "Select an employee first"
                        : "Loading shift information...",
                    input: true,
                    defaultValue: employeeShift?.start_time || "Not Assigned",
                    value:  employeeShift?.start_time || "Not Assigned",
                    customClass: "mb-4",
                    disabled: true,
                    hidden: true
                  },
                ],
              },
              {
                width: 6,
                components: [
                  {
                    type: "textfield",
                    key: "shift_end",
                    label: "Shift End",
                    placeholder:
                      isForOthers && !selectedEmployee
                        ? "Select an employee first"
                        : "Loading shift information...",
                    enableDate: true,
                    enableTime: false,
                    defaultValue: employeeShift?.end_time || "Not Assigned",
                    value: employeeShift?.end_time || "Not Assigned",
                    input: true,
                    customClass: "mb-4",
                    disabled: true,
                    hidden: true
                  },
                ],
              },
            ],
          },

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
            defaultValue: defaultAttendanceData?.from_date || selectedDate,
            onChange: handleFromDateChange,
            disabled: selectedRequestType === "Clockin",
            redrawOn: "request_type",
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
            disabled: selectedRequestType === "Short Attendance Request",
            validate: { required: true },
            defaultValue: defaultAttendanceData?.to_date || selectedDate,
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
            placeholder: "hh:mm",
            customClass: "mb-4",
            defaultValue: defaultAttendanceData?.custom_from_time
                              ? new Date(`1970-01-01T${normalizeTime(defaultAttendanceData.custom_from_time)}`)
                              : "",
            validate: {
              required: true,
              customMessage: "From Time is required",
              custom:
                "valid = ['Clockin', 'Short Attendance Request', 'On Duty'].includes(data.request_type) ? !!input : true;",
            },
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
            placeholder: "hh:mm",
            customClass: "mb-4",
            defaultValue: defaultAttendanceData?.custom_to_time
                              ? new Date(`1970-01-01T${normalizeTime(defaultAttendanceData.custom_to_time)}`)
                              : "",
            customConditional:
              "show = ['Out Duty', 'Attendance Adjustment', 'Short Attendance Request'].includes(data.request_type || '');",
            time_24hr: true,
            validate: {
              required: true,
              customMessage: "To Time is required",
              custom:
                "valid = ['Short Attendance Request', 'On Duty'].includes(data.request_type) ? !!input : true;",
            },
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

          {
            label: "Overnight Out Duty",
            key: "overnight_out_duty",
            type: "checkbox",
            input: true,
            customClass: "mb-4 hidden",
            customConditional: "show = data.request_type === 'Out Duty';",
            defaultValue: false,
            hidden: true
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
          {
            label: "Select Shift",
            key: "select_shift",
            type: "select",
            input: true,
            placeholder: "Select shift",
            customClass: "mb-4",
            customConditional: "show = data.request_type === 'Shift Change';",
            defaultValue: defaultAttendanceData?.shift || "",
            data: {
              values:
                shiftList?.data?.map((item) => ({
                  label: `${item.name}`,
                  value: item.name,
                })) || [],
            },
          },
          {
            label: "Reason",
            key: "custom__request_reason",
            type: "select",
            input: true,
            placeholder: "Select a reason",
            customClass: "mb-4",
            customConditional: "show = data.request_type !== 'Shift Change';",
            defaultValue: defaultAttendanceData?.custom__request_reason || "",
            data: {
              values:
                reasonList?.map((item: { reason: string; name: string }) => ({
                  label: item?.reason || "",
                  value: item?.name,
                })) || [],
            },
          },
          {
            label: "Location",
            key: "custom_location",
            type: "select",
            input: true,
            placeholder: "Select a location",
            customClass: "mb-4",
            defaultValue: defaultAttendanceData?.custom_location || "",
            customConditional:
              "show = ['Clockin', 'Attendance Adjustment'].includes(data.request_type || '');",
            validate: {
              required: true,
              customMessage: "Location is required",
              custom:
                "valid = ['Clockin', 'Attendance Adjustment'].includes(data.request_type) ? !!input : true;",
            },
            data: {
              values: [
                {
                  label: "Office",
                  value: "Office",
                },
                {
                  label: "Home",
                  value: "Home",
                },
                {
                  label: "Field Duty",
                  value: "Field Duty",
                },
              ],
            },
          },
          {
            label: "Message",
            key: "message",
            type: "textarea",
            input: true,
            placeholder: "Provide additional details...",
            rows: 4,
            customClass: "mb-4",
            defaultValue: defaultAttendanceData?.explanation || "",
          },
          {
            label: "Attachments",
            fileTypes: [
              { label: "Documents", value: ".pdf,.doc,.docx" },
              { label: "Images", value: ".jpg,.jpeg,.png" },
            ],
            storage: "customBase64",
            key: "attachments",
            type: "file",
            input: true,
            multiple: false,
            validate: {
              required: isAttachmentRequired,
            },
            tooltip: "Upload receipts or supporting documents.",
             defaultValue: defaultAttendanceData?.custom_attachment
    ? [
        {
          name: defaultAttendanceData.custom_attachment.split("/").pop(),
          url:  defaultAttendanceData.custom_attachment,
        },
      ]
    : [],
          },
        ],
      },
    ];
    return components;
  };
  type CustomError = Error & {
    response?: { data?: { exception?: string } };
  };
  const formSchema = useMemo(
    () => ({
      title: "Attendance Request",
      name: "attendanceRequest",
      path: "attendance-request",
      display: "form",
      components: baseFormComponents(isForOthers),
    }),
    [
      isForOthers,
      employeeReporteeList,
      currentEmployee,
      reasonList,
      selectedRequestType,
      reqValidationmutation,
      employeeShift,
      isAttachmentRequired,
    ]
  );

  const formatTime = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    const d = new Date(date);
    return d.toLocaleTimeString("en-GB");
  };

  const handleSubmit = async (submission: { data: AttendanceFormData }) => {
    const baseBody = {
      custom_request_type: submission.data.request_type,
      company: isForOthers ? submission.data.company : currentEmployee?.company,
      employee: isForOthers
        ? submission.data.employee
        : currentEmployee?.employee,
      explanation: submission.data.message,
      ...(submission.data.from_date && {
        from_date: formatDateToYYYYMMDD(new Date(submission.data.from_date)),
      }),
      ...(submission.data.to_date && {
        to_date: formatDateToYYYYMMDD(new Date(submission.data.to_date)),
      }),
    };

    let requestBody: AttendanceFormData = { ...baseBody };

    switch (submission.data.request_type) {
      case "Clockin":
        requestBody = {
          ...baseBody,
          to_date: baseBody.from_date,
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom__request_reason: submission.data.custom__request_reason,
          custom_location: submission?.data?.custom_location,
        };
        break;
      case "Out Duty":
        requestBody = {
          ...baseBody,
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          custom__request_reason: submission.data.custom__request_reason,
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
          custom__request_reason: submission.data.custom__request_reason,
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
          custom__request_reason: submission.data.custom__request_reason,
          custom_location: submission?.data?.custom_location,
        };
        break;

      case "Shift Change":
        requestBody = {
          ...baseBody,
          select_shift: submission.data.select_shift,
        };
        break;
    }

    if (
      submission.data.attachments?.[0] &&
      submission?.data?.attachments?.length > 0
    ) {
      requestBody.custom_attachment = submission.data?.attachments?.[0]?.url;
    }

    if (forActionType && forActionType === "edit" && defaultAttendanceData) {
        updateAttendanceReuqest({
          doctype: "Attendance Request",
          name: defaultAttendanceData.name,
          data: requestBody as Record<string, unknown>,
        }, {
          onSuccess: () => {
            onClose();
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 2000);
            toast.success("Updated Attendance Request successfully!");
          },
          onError: (error: CustomError) => {
            const errorMessage =
              error?.response?.data?.exception
                ?.split(":")
                .slice(1)
                .join(":")
                .trim() || "Something went wrong!!";
            const cleanString = DOMPurify.sanitize(errorMessage || "");
            toast.error(<span dangerouslySetInnerHTML={{ __html: cleanString }} />);
            console.error(error);
          },
        });
    }
    else{
      mutation.mutate(requestBody as Record<string, unknown>, {
        onSuccess: () => {
          onClose();
          setTimeout(() => {
            setRefetchAttendance(true);
          }, 2000);
          toast.success("Added Attendance Request successfully!");
        },
        onError: (error: CustomError) => {
          const errorMessage =
            error?.response?.data?.exception
              ?.split(":")
              .slice(1)
              .join(":")
              .trim() || "Something went wrong!!";
          const cleanString = DOMPurify.sanitize(errorMessage || "");
          toast.error(<span dangerouslySetInnerHTML={{ __html: cleanString }} />);
          console.error(error);
        },
      });
  }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4   border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            { (forActionType && forActionType=="edit") ?"Edit" : "Create"} Attendance Request
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 pt-4 pb-32 md:pb-6">
          {userRoles?.roles["Employee Direct Manager"] ? (
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
          ) : null}
          <Form
            form={formSchema}
            onSubmit={handleSubmit}
            options={{
              builder: { styles: false },
              submitButton: false,
              noAlerts: true,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(submission: any) => {
              setFormData(submission?.data);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formAddressInstance.current = instance;

              try {
                const rootEl: HTMLElement | Document =
                  (instance && instance.element) || document;

                const flatInputs: NodeListOf<HTMLInputElement> = (
                  rootEl as HTMLElement
                ).querySelectorAll
                  ? (rootEl as HTMLElement).querySelectorAll(
                      "input.flatpickr-input"
                    )
                  : document.querySelectorAll("input.flatpickr-input");

                flatInputs.forEach((input) => {
                  const handler = () => {
                    flatInputs.forEach((other) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      if (other !== input && (other as any)._flatpickr) {
                        try {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (other as any)._flatpickr.close();
                        } catch (err) {
                          console.error("flatpickr close failed", err);
                        }
                      }
                    });
                  };

                  // avoid adding duplicate listeners
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  if (!(input as any).__closeOtherFPHandler) {
                    input.addEventListener("focus", handler);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (input as any).__closeOtherFPHandler = handler;
                  }
                });
              } catch (err) {
                // non-fatal: attach failed, but app continues
                console.warn("flatpickr focus bind failed", err);
              }
            }}
            className="formio-no-border address-form-container mt-4"
          />
        </div>

        {/* Submit Bar */}
        <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
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
      </div>
    </div>
  );
};

export default AttendanceRequestForm;
