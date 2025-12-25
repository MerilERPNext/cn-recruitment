import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { toast } from "react-hot-toast";
import { useRequestLeaveModal } from "../Leaves/RequestLeaveModalContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateLeaveApplication,
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
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import DailyConfiguration from "./DailyConfiguration";
import { buildLeavePayload, getDatesBetween } from "../../utils/helperUtils";

interface FormSubmissionData {
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  halfDay?: boolean;
  half_day?: 0 | 1;
  half_day_mode?: "continuous" | "individual";
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
  console.log("defaults", defaults?.source);
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
          custom_half_day_type: submission.data.custom_half_day_type,
          custom_second_half_day_date:
            submission.data?.custom_second_half_day_date?.split("T")[0],
          description: submission.data.description,
          custom_reason: submission.data.custom_reason,
          custom_attachment: submission.data?.custom_attachment?.[0]?.url,
          daily_half_day_config:
            submission.data.custom_half_day_type === "individual"
              ? dailyConfig
              : undefined,
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
  const createLeaveMutation = useCreateLeaveApplication();

  const [formData, setFormData] = useState<FormSubmissionData>({});
  const [leaveDays, setLeaveDays] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);
  const [dailyConfig, setDailyConfig] = useState<
    Record<string, "Full Day" | "First Half" | "Second Half">
  >({});

  const showDailyConfig = Boolean(
    formData.halfDay &&
      formData.half_day_mode === "individual" &&
      formData.fromDate &&
      formData.toDate
  );

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

  const leaveBalanceMap = useMemo(() => {
    if (!leaveBalanceData?.leave_balance) return {};
    return leaveBalanceData.leave_balance.reduce(
      (acc: Record<string, number>, entry) => {
        acc[entry.type] = entry.balance;
        return acc;
      },
      {}
    );
  }, [leaveBalanceData]);

  const selectedLeaveBalance =
    formData.leaveType && leaveBalanceMap[formData.leaveType]
      ? leaveBalanceMap[formData.leaveType]
      : null;

  const calculateLeaveDays = useCallback(
    (data: FormSubmissionData, dailyCfg?: typeof dailyConfig) => {
      const { fromDate, toDate, halfDay } = data;

      if (!fromDate || !toDate) {
        setLeaveDays(null);
        return;
      }

      if (halfDay && data.half_day_mode === "individual" && dailyCfg) {
        let total = 0;

        Object.values(dailyCfg).forEach((v) => {
          if (v === "Full Day") total += 1;
          else total += 0.5;
        });

        setLeaveDays(total);
        return;
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) {
        setLeaveDays(null);
        return;
      }

      let days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24) + 1;

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
    },
    []
  );

  const { data: fields } = useGetLeaveRequestFields(
    formData.leaveType,
    formData.fromDate || "",
    formData.toDate || ""
  );

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

  useEffect(() => {
    if (
      !formData.halfDay ||
      formData.half_day_mode !== "individual" ||
      !formData.fromDate ||
      !formData.toDate
    ) {
      return;
    }

    const dates = getDatesBetween(formData.fromDate, formData.toDate);

    setDailyConfig((prev) => {
      const next: Record<string, "Full Day" | "First Half" | "Second Half"> =
        {};
      dates.forEach((d) => {
        next[d] = prev[d] ?? "Full Day";
      });
      return next;
    });
  }, [
    formData.halfDay,
    formData.half_day_mode,
    formData.fromDate,
    formData.toDate,
  ]);

  useEffect(() => {
    if (!formData.halfDay || formData.half_day_mode !== "individual") {
      setDailyConfig({});
    }
  }, [formData.halfDay, formData.half_day_mode]);

  useEffect(() => {
    if (formData.half_day_mode !== "individual") return;

    const form = formInstance.current;
    if (!form) return;

    form.getComponent("half_day_date")?.setValue(null);
    form.getComponent("custom_second_half_day_date")?.setValue(null);
  }, [formData.half_day_mode]);

  useEffect(() => {
    if (formData.halfDay && formData.half_day_mode === "individual") {
      calculateLeaveDays(formData, dailyConfig);
    }
  }, [dailyConfig]);

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
    if (!currentEmployee?.name || !formInstance.current) return;

    try {
      const submission = await formInstance.current.submit();

      const payload = buildLeavePayload({
        employee: currentEmployee.name,
        submission: submission.data,
        dailyConfig,
      });

      await createLeaveMutation.mutateAsync(payload);

      toast.success("Leave request submitted successfully!");
      triggerRefetch();
      onSuccess?.();
      onCancel?.();
    } catch (err) {
      const formatted = errorResponseFormater(
        err,
        "Submission failed. Please try again."
      );
      toast.error(formatted);
    }
  }, [currentEmployee, dailyConfig]);

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
      show_half_day_options: 0,
      show_individual_continuous: 0,
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
                label: requiredFieldMap["from_date"]
                  ? "From Date <span style='color:red;margin-left:3px;'> *</span>"
                  : "From Date",
                errorLabel: "From Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue:
                  defaults?.source === "balances"
                    ? `${today}T00:00:00`
                    : defaults?.fromDate
                    ? `${defaults.fromDate}T00:00:00`
                    : "",
                validate: { required: requiredFieldMap["from_date"] },
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
            type: "columns",
            key: "halfDayColumns",
            customClass: "bg-gray-100 mx-2 p-3 rounded-md mt-4",
            columns: [
              {
                width: 6,
                components: [
                  {
                    type: "checkbox",
                    key: "halfDay",
                    label: mandatory.half_day
                      ? "Half-Day Leave <span style='color:red;margin-left:3px;'> *</span>"
                      : "Half-Day Leave",
                    input: true,
                    labelPosition: "bottom",
                    defaultValue: defaults?.halfDay,
                    validate: { required: !!mandatory.half_day },
                    customClass:
                      "custom-halfday-toggle border rounded-lg shadow-sm p-2",
                  },
                ],
              },
              {
                width: 6,
                components: show.show_individual_continuous
                  ? [
                      {
                        type: "radio",
                        key: "half_day_mode",
                        label: "Leave Type",
                        hideLabel: true,
                        input: true,
                        optionsLabelPosition: "right",
                        values: [
                          { label: "Continuous", value: "continuous" },
                          { label: "Individual", value: "individual" },
                        ],
                        customClass: "inline-radio-group",
                        defaultValue: "continuous",
                        conditional: {
                          show: true,
                          when: "halfDay",
                          eq: true,
                        },
                      },
                    ]
                  : [],
              },
            ],
          },
          ...(show.show_half_day_options
            ? [
                {
                  type: "radio",
                  key: "halfDayOption",
                  label: "Select Half-Day Option",
                  input: true,
                  validate: { required: !!mandatory.show_half_day_options },
                  values: [
                    { label: "First Half", value: "First Half" },
                    { label: "Second Half", value: "Second Half" },
                  ],
                  conditional: { show: true, when: "halfDay", eq: true },
                  customClass: "px-2 mb-4 ml-4 mt-2",
                },
              ]
            : []),
          {
            type: "columns",
            key: "halfDayDates",
            customConditional: `
  show = data.halfDay === true && data.half_day_mode !== "individual";`,
            customClass: "px-2 mb-4 mx-2",
            columns: [
              {
                width: 6,
                components: show.half_day_date
                  ? [
                      {
                        type: "datetime",
                        key: "half_day_date",
                        errorLabel: "Half-Day Date",
                        label: mandatory.half_day_date
                          ? "Half-Day Date <span style='color:red;margin-left:3px;'> *</span>"
                          : "Half-Day Date",
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
                        errorLabel: "Second Half-Day Date",
                        label: mandatory.custom_second_half_day_date
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
        label: requiredFieldMap["description"]
          ? "Message <span style='color:red;margin-left:3px;'> *</span>"
          : "Message",
        errorLabel: "Message",
        defaultValue: defaults?.description ?? "",
        placeholder: "Enter the message for leave",
        rows: 3,
        validate: {
          required: !!mandatory.description || requiredFieldMap["description"],
          minLength: 3,
        },
        input: true,
        customClass: "px-2 my-3",
      },
      ...(defaults?.source !== "holiday"
        ? [
            {
              type: "select",
              key: "custom_reason",
              label: requiredFieldMap["custom_reason"]
                ? "Reason <span style='color:red;margin-left:3px;'> *</span>"
                : "Reason",
              errorLabel: "Reason",
              placeholder: "Select a reason",
              defaultValue: defaults?.custom_reason ?? "",
              input: true,
              validate: {
                required:
                  !!mandatory.custom_reason ||
                  requiredFieldMap["custom_reason"],
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
          ]
        : []),
      ...(defaults?.source !== "holiday"
        ? [
            {
              type: "file",
              key: "custom_attachment",
              defaultValue: defaults?.custom_attachment
                ? [
                    {
                      name: defaults.custom_attachment,
                      url: defaults.custom_attachment,
                      storage: "url",
                      size: 0,
                    },
                  ]
                : [],
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
              filePattern: "*/*",
              customClass: "px-2 mb-6",
            },
          ]
        : []),
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
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-between items-center ml-6 my-2 text-sm text-gray-700">
        <div style={{ visibility: leaveDays !== null ? "visible" : "hidden" }}>
          <strong>Applying for:</strong> {leaveDays}{" "}
          {leaveDays === 1 ? "Day" : "Days"}
        </div>

        {selectedLeaveBalance !== null && (
          <div className="mr-6">
            <strong>Available Balance:</strong> {selectedLeaveBalance}
          </div>
        )}
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
          }}
          onChange={({
            data,
            changed,
          }: {
            data: FormSubmissionData;
            changed?: { component?: { key?: string } };
          }) => {
            setFormData(data);
            calculateLeaveDays(data);
            if (changed?.component?.key === "half_day_mode") {
              if (
                data.halfDay &&
                data.half_day_mode === "individual" &&
                data.fromDate &&
                data.toDate
              ) {
                const dates = getDatesBetween(data.fromDate, data.toDate);

                setDailyConfig((prev) => {
                  const next: Record<
                    string,
                    "Full Day" | "First Half" | "Second Half"
                  > = {};
                  dates.forEach((d) => {
                    next[d] = prev[d] ?? "Full Day";
                  });
                  return next;
                });
              } else {
                setDailyConfig({});
              }
            }
          }}
        />
        {showDailyConfig && (
          <DailyConfiguration
            fromDate={formData.fromDate!}
            toDate={formData.toDate!}
            value={dailyConfig}
            onChange={setDailyConfig}
          />
        )}
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
