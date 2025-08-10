import React, { useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import LayoutHeader from "../../shared/LayoutHeader";
import { useCreateNewAttendanceRequest, useGetEmployeeShift } from "../../../hooks/useAttendance";
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
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  
  // Get shift for current employee or selected employee in 'For Others' mode
  const employeeIdToQuery = isForOthers ? selectedEmployee : (currentEmployee?.employee || '');
  const { data: employeeShift, refetch: refetchShift } = useGetEmployeeShift(
    employeeIdToQuery,
    { employee: employeeIdToQuery } // Pass employee ID as filter
  );

  // Handle employee selection change
  const handleEmployeeChange = (event: any) => {
    // Get the selected value from the form data
    const employeeId = event?.data?.employee || '';
    console.log("Selected Employee ID:", employeeId);
    
    // Update the selected employee state
    setSelectedEmployee(employeeId);
    
    // Update company field immediately
    if (formAddressInstance.current) {
      const selectedEmp = employeeList?.find(emp => emp.name === employeeId);
      if (selectedEmp) {
        const formData = formAddressInstance.current.getValue() || {};
        formData.company = selectedEmp.company || '';
        formAddressInstance.current.setValue(formData);
      }
    }
  };

  // Update shift field when employee shift data changes
  React.useEffect(() => {
    if (formAddressInstance.current && employeeShift) {
      const formData = formAddressInstance.current.getValue() || {};
      formAddressInstance.current.setValue(formData);
    }
  }, [employeeShift]);
  
  // Refetch shift when employee changes
  React.useEffect(() => {
    if (employeeIdToQuery) {
      refetchShift();
    }
  }, [employeeIdToQuery, refetchShift]);

  interface FormioFormInstance {
    submit: () => void;
    getValue: () => any;
    setValue: (value: any) => void;
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
                data: {
                  values:
                    employeeList && employeeList?.length > 0
                      ? employeeList?.map(
                        (item: { name: string; employee_name: string }) => ({
                          label: item?.employee_name,
                          value: item?.name,
                        })
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
                placeholder: "Company name",
                customClass: "mb-4",
              },
            ]
            : []),
          
          {
            label: "Request Type",
            key: "request_type",
            type: "select",
            input: true,
            placeholder: "Select a Request Type",
            customClass: "mb-4",
            data: {
              values: [
                { label: "Clockin Request", value: "Clockin" },
                { label: "Out Duty Request", value: "Out Duty" },
                { label: "Short Attendance Request", value: "Short Attendance Request" },
                { label: "Attendance Adjustment", value: "Attendance Adjustment" },
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
            placeholder: isForOthers && !selectedEmployee ? "Select an employee first" : "Loading shift information...",
            customClass: "mb-4",
            disabled: true,
            defaultValue: employeeShift?.shift || "Not Assigned",
            value: employeeShift?.shift || "Not Assigned",
            clearOnHide: false,
          },
          // Date fields (shown for all request types)
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
          // Clockin time field (for Clockin and Out Duty)
          {
            label: "Clockin Time",
            key: "clockin_time",
            type: "datetime",
            input: true,
            enableDate: false,
            enableTime: true,
            format: "HH:mm:ss",
            placeholder: "HH:mm:ss",
            customClass: "mb-4",
            customConditional: "show = ['Clockin', 'Out Duty'].includes(data.request_type || '');",
            time_24hr: true,
            widget: {
              type: "calendar",
              time_24hr: true,
              noCalendar: true,
              enableTime: true,
              dateFormat: "H:i"
            }
          },
          // Clockout time field (for Out Duty)
          {
            label: "Clockout Time",
            key: "clockout_time",
            type: "datetime",
            input: true,
            enableDate: false,
            enableTime: true,
            format: "HH:mm:ss",
            placeholder: "HH:mm:ss",
            customClass: "mb-4",
            customConditional: "show = data.request_type === 'Out Duty';",
            time_24hr: true,
            widget: {
              type: "calendar",
              time_24hr: true,
              noCalendar: true,
              enableTime: true,
              dateFormat: "H:i"
            }
          },
          // Overnight Out Duty (for Out Duty)
          {
            label: "Overnight Out Duty",
            key: "overnight_out_duty",
            type: "checkbox",
            input: true,
            customClass: "mb-4",
            customConditional: "show = data.request_type === 'Out Duty';",
            defaultValue: false
          },
          // Custom times for Attendance Adjustment
          {
            customClass: "mb-4",
            type: "columns",
            customConditional: "show = data.request_type === 'Attendance Adjustment';",
            columns: [
              {
                components: [
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
                  },
                ],
                width: 6,
              },
              {
                components: [
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
                  },
                ],
                width: 6,
              },
            ],
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
              values: [
                { label: "Morning Shift", value: "Morning Shift" },
                { label: "Evening Shift", value: "Evening Shift" },
                { label: "Night Shift", value: "Night Shift" },
              ],
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
              values: reasonList?.map((item) => ({
                label: item?.reason,
                value: item?.name
              })) || []
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
  }

  const formatTime = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    const d = new Date(date);
    return d.toTimeString().substring(0, 8); // Returns HH:mm:ss
  };

  const handleSubmit = async (submission: { data: AttendanceFormData }) => {
    const baseBody = {
      request_type: submission.data.request_type,
      company: isForOthers ? submission.data.company : currentEmployee?.company,
      employee: isForOthers ? submission.data.employee : currentEmployee?.name,
      message: submission.data.message,
      ...(submission.data.from_date && {
        from_date: formatDateToYYYYMMDD(new Date(submission.data.from_date)),
      }),
      ...(submission.data.to_date && {
        to_date: formatDateToYYYYMMDD(new Date(submission.data.to_date)),
      }),
    };

    let requestBody: any = { ...baseBody };

    // Handle different request types
    switch (submission.data.request_type) {
      case 'Clockin':
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(new Date()),
          to_date: formatDateToYYYYMMDD(new Date()),
          clockin_time: formatTime(submission.data.clockin_time) || '09:00:00',
          reason: submission.data.reason || 'ATRN-001',
        };
        break;

      case 'Out Duty':
        requestBody = {
          ...baseBody,
          clockin_time: formatTime(submission.data.clockin_time) || '10:00:00',
          clockout_time: formatTime(submission.data.clockout_time) || '15:00:00',
          reason: submission.data.reason || 'ATRN_0002',
          overnight_out_duty: submission.data.overnight_out_duty || false,
        };
        break;

      case 'Short Attendance Request':
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(new Date(submission.data.from_date || new Date())),
          to_date: formatDateToYYYYMMDD(new Date(submission.data.to_date || new Date())),
          reason: submission.data.reason || 'ATRN_0002',
        };
        break;

      case 'Attendance Adjustment':
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(new Date(submission.data.from_date || new Date())),
          to_date: formatDateToYYYYMMDD(new Date(submission.data.to_date || new Date())),
          custom_from_time: formatTime(submission.data.custom_from_time) || '09:30:00',
          custom_to_time: formatTime(submission.data.custom_to_time) || '18:30:00',
          reason: submission.data.reason || 'ATRN_0002',
        };
        break;

      case 'Shift Change':
        requestBody = {
          ...baseBody,
          select_shift: submission.data.select_shift || 'Night Shift',
        };
        break;
    }

    // Add attachments if any
    if (submission.data.attachments?.[0]) {
      requestBody.custom_attachments = submission.data.attachments[0];
    }
    
    mutation.mutate(requestBody, {
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
