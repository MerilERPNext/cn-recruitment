import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useCreateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { toast } from "react-hot-toast";
import { useLeaveRequestRefresh } from "../Leaves/LeaveRequestRefreshContext";
import { useRequestLeaveModal } from "../Leaves/RequestLeaveModalContext";
import { X } from "lucide-react";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLeaveReason,
  useGetLeaveRequestFields,
  useGetLeaveBalance,
} from "../../hooks/useLeaves";
import { LeaveFieldFlags } from "../../types/leaves";
import Button from "../shared/atoms/Button";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useRequiredFields } from "../../hooks/useRequiredFields";

interface FormSubmissionData {
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  halfDay?: boolean;
  halfDayOption?: "First Half" | "Second Half";
  description?: string;
  half_day_date?: string;
  custom_second_half_day_date?: string;
  custom_reason?: string;
  attachment?: { url: string }[];
}

interface RequestLeaveProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LeaveRequest: React.FC<RequestLeaveProps> = ({ onSuccess, onCancel }) => {
  const { setRefetchAttendance } = useGlobalStore();
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today
  );

  const { triggerRefetch } = useLeaveRequestRefresh();
  const { defaults } = useRequestLeaveModal();
  const createLeaveMutation = useCreateFrappeDocument({
    onSuccess: (newDoc) => {
      setTimeout(() => {
        setRefetchAttendance(true);
      }, 1000);
      toast.success("Leave request submitted successfully!");
      queryClient.setQueryData(
        ["documents", "Leave Application"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: [newDoc, ...(old.data || [])],
          };
        }
      );
      queryClient.invalidateQueries({
        queryKey: ["documents", "Leave Application"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["comp-off-list"] });
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      triggerRefetch();
      onSuccess?.();
      onCancel?.();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const formatedError = errorResponseFormater(
        err,
        "Submission failed. Please try again."
      );
      toast.error(formatedError);
      console.error(err);
    },
  });

  const [formData, setFormData] = useState<FormSubmissionData>({});
  const [leaveDays, setLeaveDays] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);

  const leaveTypeOptions = useMemo(() => {
    if (!leaveBalanceData?.leave_balance) return [];
    return leaveBalanceData.leave_balance
      .filter((entry) => entry.dont_show_in_frontend !== 1)
      .map((entry) => ({
        label: entry.type,
        value: entry.type,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveBalanceData, defaults?.leaveType]);

  const calculateLeaveDays = useCallback((data: FormSubmissionData) => {
    const {
      fromDate,
      toDate,
      halfDay,
      half_day_date,
      custom_second_half_day_date,
    } = data;
    if (!fromDate || !toDate) return setLeaveDays(null);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) {
      return setLeaveDays(null);
    }
    const diffMs = to.getTime() - from.getTime();
    let days = diffMs / (1000 * 60 * 60 * 24) + 1;
    if (halfDay) {
      if (fromDate === toDate) {
        days -= 0.5;
      } else {
        let halfDayCount = 0;
        if (half_day_date) halfDayCount += 0.5;
        if (custom_second_half_day_date) halfDayCount += 0.5;
        days -= halfDayCount;
      }
    }
    setLeaveDays(days);
  }, []);

  const { data: fields } = useGetLeaveRequestFields(
    formData.leaveType,
    formData.fromDate || "",
    formData.toDate || ""
  );

  const {
    data: reasons,
    isLoading: isReasonLoading,
    isError: isReasonError,
  } = useGetLeaveReason();

  const { data: requiredFields } = useRequiredFields("Leave Application");
  const requiredFieldMap = useMemo(() => {
    if (!requiredFields?.fields) return {};
    const map: Record<string, boolean> = {};
    requiredFields.fields.forEach((f) => {
      if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    return map;
  }, [requiredFields]);

  console.log("requiredFieldMap", requiredFieldMap);

  useEffect(() => {
    if (defaults?.fromDate && defaults?.toDate) {
      const initial: FormSubmissionData = {
        fromDate: defaults.fromDate,
        toDate: defaults.toDate,
        halfDay: formData.halfDay || false,
      };
      setFormData(initial);
      calculateLeaveDays(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults, calculateLeaveDays]);

  const handleFromDateChange = useCallback(
    (event: { data: FormSubmissionData }) => {
      const fromDateValue = event?.data?.fromDate;
      const form = formInstance.current;
      if (form && fromDateValue) {
        const toDateComponent = form.getComponent("toDate");
        if (toDateComponent) {
          toDateComponent.setValue(fromDateValue, { noUpdateEvent: true });
          toDateComponent.redraw();
        }
      }
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!currentEmployee?.name) {
      toast.error("Employee data not loaded.");
      return;
    }
    if (!formInstance?.current) {
      return;
    }
    try {
      const submission = await formInstance.current.submit();
      await createLeaveMutation.mutateAsync({
        doctype: "Leave Application",
        data: {
          employee: currentEmployee.name,
          leave_type: submission.data.leaveType,
          from_date: submission.data.fromDate?.split("T")[0],
          to_date: submission.data.toDate?.split("T")[0],
          half_day: submission.data.halfDay,
          half_day_date: submission.data.half_day_date?.split("T")[0],
          custom_half_day_type: submission.data.halfDay
            ? submission.data.halfDayOption
            : undefined,
          custom_second_half_day_date:
            submission.data?.custom_second_half_day_date?.split("T")[0],
          description: submission.data.description,
          custom_reason: submission.data.custom_reason,
          custom_attachment: submission.data?.attachment?.[0]?.url,
        },
      });
    } catch (error) {
      console.error("Form submit error:", error);
    }
  }, [currentEmployee, createLeaveMutation]);

  const leaveForm = useMemo(() => {
    const defaultFieldFlags: LeaveFieldFlags = {
      leave_type: 1,
      from_date: 1,
      to_date: 1,
      custom_reason: 0,
      description: 0,
      custom_attachment: 0,
      half_day: 0,
      half_day_date: 0,
      custom_second_half_day_date: 0,
    };

    const show: LeaveFieldFlags = fields?.show ?? defaultFieldFlags;
    const mandatory: LeaveFieldFlags = fields?.mandatory ?? defaultFieldFlags;

    const baseComponents = [
      {
        type: "select",
        key: "leaveType",
        label: "Leave Type <span style='color:red;margin-left:3px;'> *</span>",
        errorLabel: "Leave Type",
        placeholder: "Select Leave Type",
        input: true,
        defaultValue: defaults?.leaveType ?? "",
        validate: { required: true },
        data: { values: leaveTypeOptions },
        customClass: "px-2 mb-4",
        disabled: Boolean(defaults?.leaveType),
      },
      {
        type: "columns",
        key: "dateColumns",
        customClass: "px-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "fromDate",
                label: requiredFieldMap["from_date"]
                  ? "From Date <span style='color:red;margin-left:3px;'> *</span>"
                  : "From Date",
                errorLabel: "From Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.fromDate
                  ? `${defaults.fromDate}T00:00:00`
                  : "",
                validate: { required: requiredFieldMap["from_date"] },
                input: true,
                customClass: "mb-4",
                format: "dd-MM-yyyy",
                onChange: handleFromDateChange,
                disabled: Boolean(defaults?.fromDate),
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "toDate",
                label: requiredFieldMap["to_date"]
                  ? "To Date <span style='color:red;margin-left:3px;'> *</span>"
                  : "To Date",
                errorLabel: "To Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.toDate
                  ? `${defaults.toDate}T00:00:00`
                  : "",
                validate: { required: requiredFieldMap["to_date"] },
                input: true,
                customClass: "mb-4",
                format: "dd-MM-yyyy",
                disabled: Boolean(defaults?.toDate),
              },
            ],
          },
        ],
      },
    ];

    const halfDayComponents = show.half_day
      ? [
          {
            type: "checkbox",
            key: "halfDay",
            errorLabel: "Half-Day Leave",
            label: !!mandatory.half_day
              ? "Half-Day Leave <span style='color:red;margin-left:3px;'> *</span>"
              : "Half-Day Leave",
            input: true,
            labelPosition: "bottom",
            validate: { required: !!mandatory.half_day },
            customClass:
              "custom-halfday-toggle ml-2 my-3 border rounded-lg shadow-sm bg-white p-2",
          },
          {
            type: "radio",
            key: "halfDayOption",
            label: "Select Half-Day Option",
            input: true,
            validate: { required: true },
            values: [
              { label: "First Half", value: "First Half" },
              { label: "Second Half", value: "Second Half" },
            ],
            conditional: { show: true, when: "halfDay", eq: true },
            customClass: "px-2 mb-4 ml-4",
          },
          {
            type: "columns",
            key: "halfDayDates",
            conditional: { show: true, when: "halfDay", eq: true },
            customClass: "px-2 mb-4",
            columns: [
              {
                width: 6,
                components: show.half_day_date
                  ? [
                      {
                        type: "datetime",
                        key: "half_day_date",
                        errorLabel: "Half-Day Date",
                        label: !!mandatory.half_day_date
                          ? "Half-Day Date <span style='color:red;margin-left:3px;'> *</span>"
                          : "Half-Day Date",
                        placeholder: "DD-MM-YYYY",
                        enableDate: true,
                        enableTime: false,
                        input: true,
                        customClass: "w-full",
                        format: "dd-MM-yyyy",
                        validate: { required: !!mandatory.half_day_date },
                        datePicker: {
                          minDate: formData.fromDate
                            ? formData.fromDate
                            : undefined,
                          maxDate: formData.toDate
                            ? formData.toDate
                            : undefined,
                        },
                      },
                    ]
                  : [],
              },
              {
                width: 6,
                components: show.custom_second_half_day_date
                  ? [
                      {
                        type: "datetime",
                        key: "custom_second_half_day_date",
                        errorLabel: "Second Half-Day Date",
                        label: !!mandatory.custom_second_half_day_date
                          ? "Second Half-Day Date <span style='color:red;margin-left:3px;'> *</span>"
                          : "Second Half-Day Date",
                        placeholder: "DD-MM-YYYY",
                        enableDate: true,
                        enableTime: false,
                        input: true,
                        customClass: "w-full",
                        format: "dd-MM-yyyy",
                        validate: {
                          required: !!mandatory.custom_second_half_day_date,
                        },
                        datePicker: {
                          minDate: formData.fromDate
                            ? formData.fromDate
                            : undefined,
                          maxDate: formData.toDate
                            ? formData.toDate
                            : undefined,
                        },
                      },
                    ]
                  : [],
              },
            ],
          },
        ]
      : [];

    const panelComponents = [
      ...baseComponents,
      ...(defaults?.hideHalfDayToggle ? [] : halfDayComponents),
      {
        type: "textarea",
        key: "description",
        label: requiredFieldMap["description"]
          ? "Message <span style='color:red;margin-left:3px;'> *</span>"
          : "Message",
        errorLabel: "Message",
        placeholder: "Enter the message for leave",
        rows: 3,
        validate: { required: !!mandatory.description, minLength: 3 },
        input: true,
        customClass: "px-2 my-3",
      },
      {
        type: "select",
        key: "custom_reason",
        label: requiredFieldMap["custom_reason"]
          ? "Reason <span style='color:red;margin-left:3px;'> *</span>"
          : "Reason",
        errorLabel: "Reason",
        placeholder: "Select a reason",
        input: true,
        validate: {
          required:
            !!mandatory.custom_reason || requiredFieldMap["custom_reason"],
        },
        data: {
          values:
            reasons?.map((r) => ({
              label: r.reason,
              value: r.name,
            })) ?? [],
        },
        customClass: "px-2 mb-4",
        disabled: isReasonLoading || isReasonError,
      },
      {
        type: "file",
        key: "attachment",
        label: requiredFieldMap["custom_attachment"]
          ? "Attachment <span style='color:red;margin-left:3px;'> *</span>"
          : "Attachment",
        errorLabel: "Attachment",
        input: true,
        storage: "customBase64",
        validate: {
          required:
            !!mandatory.custom_attachment ||
            requiredFieldMap["custom_attachment"],
        },
        fileTypes: [
          { label: "Documents", value: ".pdf,.doc,.docx" },
          { label: "Images", value: ".jpg,.jpeg,.png" },
        ],
        filePattern: "*/*",
        customClass: "px-2 mb-6",
      },
    ];

    return {
      components: [
        {
          type: "panel",
          key: "leavePanel",
          title: "Leave Application",
          hideLabel: true,
          customClass: "px-2",
          components: panelComponents,
        },
      ],
    };
  }, [
    fields,
    reasons,
    isReasonLoading,
    isReasonError,
    leaveTypeOptions,
    defaults,
    handleFromDateChange,
    formData.fromDate,
    formData.toDate,
    requiredFieldMap,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">Request Leave</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onCancel) {
                onCancel();
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <div
            className="ml-6 my-2 text-sm text-gray-700"
            style={{ visibility: leaveDays !== null ? "visible" : "hidden" }}
          >
            <strong>Applying for:</strong> {leaveDays}{" "}
            {leaveDays === 1 ? "Day" : "Days"}
          </div>

          <Form
            form={leaveForm}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formInstance.current = instance;
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              formClass: "space-y-6",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
            onChange={({ data }: { data: FormSubmissionData }) => {
              setFormData(data);
              calculateLeaveDays(data);
            }}
          />
        </div>
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <Button
            fullWidth
            size="lg"
            variant="contain"
            className="hover:bg-blue-700"
            onClick={handleSubmit}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequest;
