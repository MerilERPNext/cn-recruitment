import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Form } from "@tsed/react-formio";
//import { Formio } from "formiojs";
import "formiojs/dist/formio.form.css";
import { useCreateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { toast } from "react-hot-toast";
import { useRequestLeaveModal } from "../Leaves/RequestLeaveModalContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEditApprovedLeave,
  useGetLeaveReason,
  useGetLeaveRequestFields,
} from "../../hooks/useLeaves";
import { LeaveFieldFlags } from "../../types/leaves";
import { useGetLeaveBalance } from "../../hooks/useLeaves";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button from "../shared/atoms/Button";

interface FormSubmissionData {
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  halfDay?: boolean;
  half_day?: 0 | 1;
  halfDayOption?: "First Half" | "Second Half";
  description?: string;
  half_day_date?: string;
  custom_second_half_day_date?: string;
  attachment?: { url: string }[];
  custom_reason?: string;
}

interface RequestLeaveProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RequestLeave: React.FC<RequestLeaveProps> = ({ onSuccess, onCancel }) => {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const { setRefetchAttendance } = useGlobalStore();
  const today = new Date().toISOString().split("T")[0];
  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today
  );
  const { isDesktop } = useScreenSize();
  const queryClient = useQueryClient();
  const { defaults } = useRequestLeaveModal();
  const editLeaveMutation = useEditApprovedLeave();
  const { triggerRefetch } = useLeaveRequestRefresh();

  const handleUpdate = useCallback(async () => {
    if (!currentEmployee?.name) {
      toast.error("Employee data not loaded.");
      return;
    }
    if (!formInstance?.current) {
      return;
    }
    try {
      const submission = await formInstance.current.submit();
      await editLeaveMutation.mutateAsync({
        leave_application: defaults?.leave_application || "",
        new_values: {
          employee: currentEmployee.name,
          leave_type: submission.data.leaveType,
          from_date: submission.data.fromDate?.split("T")[0],
          to_date: submission.data.toDate?.split("T")[0],
          half_day: submission.data.halfDay ? 1 : 0,
          half_day_date: submission.data.half_day_date?.split("T")[0],
          custom_half_day_type: submission.data.halfDay
            ? submission.data.halfDayOption
            : undefined,
          custom_second_half_day_date:
            submission.data?.custom_second_half_day_date?.split("T")[0],
          description: submission.data.description,
          custom_reason: submission.data.custom_reason,
          custom_attachment: submission.data?.custom_attachment?.[0]?.url,
        },
      });
      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);

      queryClient.invalidateQueries({ queryKey: ["attendance"] });

      onSuccess?.();
      onCancel?.();
    } catch (error) {
      console.error("Update submit error:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee, editLeaveMutation, defaults, onSuccess, onCancel]);

  const createLeaveMutation = useCreateFrappeDocument({
    onSuccess: () => {
      toast.success("Leave request submitted successfully!");
      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);
      queryClient.invalidateQueries({ queryKey: ["comp-off-list"] });
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      triggerRefetch();
      onSuccess?.();
      onCancel?.();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      let errorMsg = "Submission failed. Please try again.";

      try {
        const raw = err?.response?.data?._server_messages;
        if (raw) {
          const messages = JSON.parse(raw);
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMessage = JSON.parse(messages[0]);
            if (firstMessage?.message) {
              errorMsg = firstMessage.message.replace(/<[^>]*>/g, "").trim();
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse server error message:", e);
      }

      toast.error(errorMsg);
    },
  });

  const [formData, setFormData] = useState<FormSubmissionData>({});
  const [leaveDays, setLeaveDays] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);

  const leaveTypeOptions = useMemo(() => {
    if (!leaveBalanceData?.leave_balance) return [];

    return leaveBalanceData.leave_balance
      .filter((entry) => entry.dont_show_in_frontend === 0)
      .map((entry) => ({
        label: entry.type,
        value: entry.type,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveBalanceData, defaults?.leaveType]);

  const calculateLeaveDays = useCallback((data: FormSubmissionData) => {
    const { fromDate, toDate, halfDay } = data;
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
        if (data.half_day_date) halfDayCount += 0.5;
        if (data.custom_second_half_day_date) halfDayCount += 0.5;
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

  useEffect(() => {
    if (defaults) {
      const initial: FormSubmissionData = {
        leaveType: defaults.leaveType,
        fromDate: defaults.fromDate,
        toDate: defaults.toDate,
        halfDay: defaults.halfDay,
        halfDayOption: defaults.halfDayOption,
        half_day_date: defaults.half_day_date,
        custom_second_half_day_date: defaults.custom_second_half_day_date,
        description: defaults.description,
        custom_reason: defaults.custom_reason,
        attachment: defaults.custom_attachment,
      };

      setFormData(initial);
      calculateLeaveDays(initial);
    }
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
          custom_attachment: submission.data?.custom_attachment?.[0]?.url,
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
        disabled: defaults?.isEdit ? false : Boolean(defaults?.leaveType),
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
                label: "From Date <span style='color:red;margin-left:3px;'> *</span>",
                errorLabel: "From Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.fromDate
                  ? `${defaults.fromDate}T00:00:00`
                  : "",
                validate: { required: true },
                input: true,
                customClass: "mb-4",
                format: "dd-MM-yyyy",
                onChange: handleFromDateChange,
                disabled: defaults?.isEdit
                  ? false
                  : Boolean(defaults?.fromDate),
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "toDate",
                label: "To Date <span style='color:red;margin-left:3px;'> *</span>",
                errorLabel: "To Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.toDate
                  ? `${defaults.toDate}T00:00:00`
                  : "",
                validate: { required: true },
                input: true,
                customClass: "mb-4",
                format: "dd-MM-yyyy",
                disabled: defaults?.isEdit ? false : Boolean(defaults?.toDate),
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
            label: "Half-Day Leave",
            defaultValue: defaults?.halfDay,
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
                        label: "Half-Day Date",
                        placeholder: "DD-MM-YYYY",
                        enableDate: true,
                        enableTime: false,
                        input: true,
                        customClass: "w-full",
                        format: "dd-MM-yyyy",
                        validate: { required: !!mandatory.half_day_date },
                        defaultValue: defaults?.half_day_date ?? "",
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
                        label: "Second Half-Day Date",
                        placeholder: "DD-MM-YYYY",
                        enableDate: true,
                        enableTime: false,
                        input: true,
                        customClass: "w-full",
                        format: "dd-MM-yyyy",
                        validate: {
                          required: !!mandatory.custom_second_half_day_date,
                        },
                        defaultValue:
                          defaults?.custom_second_half_day_date ?? "",
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
        label: "Message",
        defaultValue: defaults?.description ?? "",
        placeholder: "Enter the message for leave",
        rows: 3,
        validate: { required: !!mandatory.description, minLength: 3 },
        input: true,
        customClass: "px-2 my-3",
      },
      {
        type: "select",
        key: "custom_reason",
        label: "Reason",
        placeholder: "Select a reason",
        defaultValue: defaults?.custom_reason ?? "",
        input: true,
        validate: { required: !!mandatory.custom_reason },
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
        key: "custom_attachment",
        defaultValue: defaults?.custom_attachment ?? [],
        label: "Attachment",
        input: true,
        storage: "customBase64",
        validate: { required: !!mandatory.custom_attachment },
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
  ]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div
        className="ml-6 my-2 text-sm text-gray-700"
        style={{ visibility: leaveDays !== null ? "visible" : "hidden" }}
      >
        <strong>Applying for:</strong> {leaveDays}{" "}
        {leaveDays === 1 ? "Day" : "Days"}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
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
            suffix: "",
            // formio: Formio,
          }}
          onChange={({ data }: { data: FormSubmissionData }) => {
            setFormData(data);
            calculateLeaveDays(data);
          }}
        />
      </div>
      <div className="border-t border-gray-200 py-4 px-4">
        {!defaults?.isEdit ? (
          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            variant="contain"
            bgColor={"blue-600"}
            textColor="white"
            className="hover:bg-blue-700"
          >
            {createLeaveMutation.isPending ? "Processing..." : "Submit Request"}
          </Button>
        ) : (
          <Button
            onClick={handleUpdate}
            fullWidth
            size="lg"
            variant="contain"
            bgColor={isDesktop ? "blue-600" : "black"}
            textColor="white"
            disabled={editLeaveMutation.isPending}
            className="hover:bg-blue-700"
          >
            {editLeaveMutation.isPending ? "Updating..." : "Update Request"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RequestLeave;
