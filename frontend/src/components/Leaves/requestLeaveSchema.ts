import {
  LeaveDateRangeResponse,
  LeaveFieldFlags,
  LeaveReason,
  RequestLeaveDefaults,
} from "../../types/leaves";
import { normalizeAttachments } from "./requestLeaveHelper";

type LeaveTypeOption = {
  label: string;
  value: string;
};

type BuildRequestLeaveSchemaParams = {
  dateRangeData?: LeaveDateRangeResponse;
  defaults: RequestLeaveDefaults | null;
  formFromDate?: string;
  isAttachmentMandatory: boolean;
  isReasonError: boolean;
  isReasonLoading: boolean;
  leaveTypeOptions: LeaveTypeOption[];
  mandatory?: LeaveFieldFlags;
  reasons?: LeaveReason[];
  requiredFieldMap: Record<string, boolean>;
  today: string;
};

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

export const buildRequestLeaveSchema = ({
  dateRangeData,
  defaults,
  formFromDate,
  isAttachmentMandatory,
  isReasonError,
  isReasonLoading,
  leaveTypeOptions,
  mandatory: providedMandatory,
  reasons,
  requiredFieldMap,
  today,
}: BuildRequestLeaveSchemaParams) => {
  const mandatory = providedMandatory ?? defaultFieldFlags;
  const halfDayComponents: unknown[] = [];

  const panelComponents = [
    {
      type: "select",
      key: "leaveType",
      label:
        defaults?.source === "holiday"
          ? "Holiday Type <span style='color:red;margin-left:3px;'> *</span>"
          : "Leave Type <span style='color:red;margin-left:3px;'> *</span>",
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
      type: "textarea",
      key: "description",
      label:
        mandatory.description || requiredFieldMap["description"]
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
            label:
              mandatory.custom_reason || requiredFieldMap["custom_reason"]
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
                reasons?.map((reason) => ({
                  label: reason.reason,
                  value: reason.name,
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
              ? normalizeAttachments(defaults.custom_attachment)
              : [],
            label:
              mandatory.custom_attachment || isAttachmentMandatory
                ? "Attachments <span style='color:red;margin-left:3px;'> *</span>"
                : "Attachments",
            errorLabel: "Attachments",
            input: true,
            multiple: true,
            storage: "customfiles",
            validate: {
              required:
                !!mandatory.custom_attachment ||
                requiredFieldMap["custom_attachment"] ||
                isAttachmentMandatory,
            },
            filePattern:
              ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.xls",
            customClass: "px-2 mb-4",
          },
        ]
      : []),
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
                  ? `${today}T00:00:00+05:30`
                  : defaults?.fromDate
                    ? `${defaults.fromDate}T00:00:00`
                    : "",
              validate: { required: requiredFieldMap["from_date"] },
              input: true,
              customClass: "mb-4",
              format: "dd-MM-yyyy",
              datePicker: {
                minDate: dateRangeData?.min_date || undefined,
                maxDate: dateRangeData?.max_date || undefined,
              },
              disabled:
                !defaults?.isEdit &&
                defaults?.source !== "other" &&
                Boolean(defaults?.fromDate),
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
              validate: {
                required: requiredFieldMap["to_date"],
                custom:
                  'if (!input || !data.fromDate) { valid = true; } else { valid = (new Date(input).setHours(0,0,0,0) >= new Date(data.fromDate).setHours(0,0,0,0)) ? true : "To Date cannot be before From Date"; }',
              },
              input: true,
              customClass: "mb-4",
              format: "dd-MM-yyyy",
              datePicker: {
                minDate: formFromDate || dateRangeData?.min_date || today,
                maxDate: dateRangeData?.max_date || undefined,
              },
              disabled:
                !defaults?.isEdit &&
                defaults?.source !== "other" &&
                Boolean(defaults?.toDate),
            },
          ],
        },
      ],
    },
    ...(defaults?.hideHalfDayToggle ? [] : halfDayComponents),
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
};
