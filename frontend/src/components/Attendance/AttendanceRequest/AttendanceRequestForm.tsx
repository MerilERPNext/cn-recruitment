import React, { useCallback, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import {
  useCreateNewAttendanceRequest,
  useGetEmployeeShift,
  useGetUserRoles,
  useReqValidationsForAttendanceRequest,
} from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import {
  useCurrentEmployeeAllDetails,
  useGetAllEmployees,
  useGetAllReasons,
} from "../../../hooks/useEmployee";
import { useShiftTypes } from "../../../hooks/useShift";
import { toast } from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useAllEmployeeCheckIns } from "../../../hooks/useAttendance";
import { X } from "lucide-react";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import DOMPurify from "dompurify";

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
}

const AttendanceRequestForm: React.FC<AttndanceRequestFormProps> = ({
  onClose,
  selectedDate = new Date(),
}) => {
  const { setRefetchAttendance } = useGlobalStore();
  const formAddressInstance = useRef<FormioFormInstance | null>(null);
  const [formData, setFormData] = useState<AttendanceFormData>();
  const [isForOthers, setIsForOthers] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { data: employeeList } = useGetAllEmployees();
  const { data: userRoles } = useGetUserRoles();
  const { data: shiftList } = useShiftTypes();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedRequestType, setSelectedRequestType] = useState<string>("");

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
      setSelectedRequestType(requestType);
    },
    []
  );

  const mutation = useCreateNewAttendanceRequest();
  const reqValidationmutation = useReqValidationsForAttendanceRequest(
    currentEmployee?.employee as string
  );

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
                  customClass: "mb-4",
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
                reqValidationmutation?.data?.shift_change_requests
                  ? {
                      label: "Shift Change Request",
                      value: "Shift Change",
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
            defaultValue: selectedDate,
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
            defaultValue: selectedDate,
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
          {
            label: "Reason",
            key: "custom__request_reason",
            type: "select",
            input: true,
            placeholder: "Select a reason",
            customClass: "mb-4",
            customConditional: "show = data.request_type !== 'Shift Change';",
            data: {
              values:
                reasonList?.map((item: { reason: string; name: string }) => ({
                  label: item?.reason || "",
                  value: item?.name,
                })) || [],
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
            tooltip: "Upload receipts or supporting documents.",
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
      employeeList,
      currentEmployee,
      reasonList,
      selectedRequestType,
      reqValidationmutation,
      employeeShift,
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
            Create Attendance Request
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
