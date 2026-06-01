import React, { useRef, useMemo, useEffect, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { X } from "lucide-react";
import {
  useGetLeaveBalance,
  useGetLeaveRequestFields,
  useGetLeaveReason,
} from "../../hooks/useLeaves";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import Button from "../shared/atoms/Button";
import { useScreenSize } from "../../hooks/useScreenSize";
import {
  getFormioAttachmentFileItems,
  resolvePendingAttachmentUploads,
} from "./requestLeaveHelper";


interface ReplaceLeaveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReplace: (data: any) => void;
  currentLeaveType?: string;
  currentLeaveName?: string;
  currentLeaveDays?: number | undefined;
  fromDate?: string;
  toDate?: string;
}

const ReplaceLeaveOverlay: React.FC<ReplaceLeaveOverlayProps> = ({
  isOpen,
  onClose,
  onReplace,
  currentLeaveType,
  currentLeaveDays,
  fromDate,
  toDate,
}) => {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const today = new Date().toISOString().split("T")[0];
  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today
  );
  const { isDesktop } = useScreenSize()

  const [activeLeaveType, setActiveLeaveType] = useState<string | undefined>();
  const [activeFirstHalfType, setActiveFirstHalfType] = useState<string | undefined>();
  const [activeSecondHalfType, setActiveSecondHalfType] = useState<string | undefined>();
  const [isReplaceBoth, setIsReplaceBoth] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);

  const { data: singleFields } = useGetLeaveRequestFields(
    activeLeaveType,
    fromDate ?? today,
    toDate ?? today
  );

  const { data: firstHalfFields } = useGetLeaveRequestFields(
    activeFirstHalfType,
    fromDate ?? today,
    toDate ?? today
  );

  const { data: secondHalfFields } = useGetLeaveRequestFields(
    activeSecondHalfType,
    fromDate ?? today,
    toDate ?? today
  );

  const fields = useMemo(() => {
    if (isReplaceBoth) {
      return {
        show: {
          custom_attachment:
            firstHalfFields?.show?.custom_attachment === 1 ||
              secondHalfFields?.show?.custom_attachment === 1
              ? 1
              : 0,
        },
        mandatory: {
          description:
            firstHalfFields?.mandatory?.description === 1 ||
              secondHalfFields?.mandatory?.description === 1
              ? 1
              : 0,
          custom_reason:
            firstHalfFields?.mandatory?.custom_reason === 1 ||
              secondHalfFields?.mandatory?.custom_reason === 1
              ? 1
              : 0,
          custom_attachment:
            firstHalfFields?.mandatory?.custom_attachment === 1 ||
              secondHalfFields?.mandatory?.custom_attachment === 1
              ? 1
              : 0,
        },
      };
    }
    return singleFields;
  }, [isReplaceBoth, singleFields, firstHalfFields, secondHalfFields]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);
  const leaveTypeOptions = useMemo(() => {
    if (!leaveBalanceData?.leave_balance)
      return [{ label: "Select Leave Type", value: "" }];

    return [
      { label: "Select Leave Type", value: "" },
      ...leaveBalanceData.leave_balance
        .filter(
          (entry) =>
            entry.dont_show_in_frontend === 0 && entry.leave_id !== currentLeaveType
        )
        .map((entry) => ({
          label: `${entry.type} (${entry.leave_id})`,
          value: entry.leave_id,
        })),
    ];
  }, [leaveBalanceData, currentLeaveType]);

  const leaveForm = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [
      ...(currentLeaveDays === 1
        ? [
          {
            type: "checkbox",
            key: "replaceBoth",
            label: "Replace Both Halves Separately",
            input: true,
            labelPosition: "right",
            customClass: "mb-4",
          },
        ]
        : []),

      {
        type: "select",
        key: "newLeaveType",
        label: 'New Leave Type <span style="color:red">*</span>',
        placeholder: "Select Leave Type",
        input: true,
        validate: {
          required: true,
          customMessage: "New Leave Type is required",
        },
        showRequiredIndicator: true,
        data: { values: leaveTypeOptions },
        conditional:
          currentLeaveDays === 1
            ? { show: true, when: "replaceBoth", eq: false }
            : undefined,
        selectConfiguration: { appendToBody: true, dropdownParent: null },
        html: true,
      },

      ...(currentLeaveDays === 1
        ? [
          {
            type: "select",
            key: "firstHalfType",
            label: 'First Half Leave Type <span style="color:red">*</span>',
            placeholder: "Select Leave Type",
            input: true,
            validate: {
              required: true,
              customMessage: "First Half Type is required",
            },
            showRequiredIndicator: true,
            data: { values: leaveTypeOptions },
            conditional: { show: true, when: "replaceBoth", eq: true },
            selectConfiguration: {
              appendToBody: true,
              dropdownParent: null,
            },
            html: true,
          },
          {
            type: "select",
            key: "secondHalfType",
            label: 'Second Half Leave Type <span style="color:red">*</span>',
            placeholder: "Select Leave Type",
            input: true,
            validate: {
              required: true,
              customMessage: "Second Half Type is required",
            },
            showRequiredIndicator: true,
            data: { values: leaveTypeOptions },
            conditional: { show: true, when: "replaceBoth", eq: true },
            selectConfiguration: {
              appendToBody: true,
              dropdownParent: null,
            },
            html: true,
          },
        ]
        : []),
      {
        type: "textarea",
        key: "description",
        label:
          fields?.mandatory?.description === 1 || requiredFieldMap["description"]
            ? "Message <span style='color:red;margin-left:3px;'> *</span>"
            : "Message",
        errorLabel: "Message",
        placeholder: "Enter the message for leave",
        rows: 3,
        validate: {
          required:
            fields?.mandatory?.description === 1 ||
            requiredFieldMap["description"],
          minLength: 3,
        },
        input: true,
        customClass: "mb-4",
        html: true,
      },
      {
        type: "select",
        key: "custom_reason",
        label:
          fields?.mandatory?.custom_reason === 1 || requiredFieldMap["custom_reason"]
            ? "Reason <span style='color:red;margin-left:3px;'> *</span>"
            : "Reason",
        errorLabel: "Reason",
        placeholder: "Select a reason",
        input: true,
        validate: {
          required:
            fields?.mandatory?.custom_reason === 1 ||
            requiredFieldMap["custom_reason"],
        },
        data: {
          values:
            reasons?.map((reason) => ({
              label: reason.reason,
              value: reason.name,
            })) ?? [],
        },
        customClass: "mb-4",
        disabled: isReasonLoading || isReasonError,
        selectConfiguration: { appendToBody: true, dropdownParent: null },
        html: true,
      },
    ];

    if (fields?.show?.custom_attachment === 1) {
      components.push({
        type: "file",
        key: "attachment",
        label:
          fields?.mandatory?.custom_attachment === 1
            ? 'Attachment <span style="color:red">*</span>'
            : "Attachment",
        input: true,
        storage: "customfiles",
        validate: {
          required: fields?.mandatory?.custom_attachment === 1,
          customMessage: "Attachment is required",
        },
        filePattern:
          ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.xls",
        customClass: "px-2 mb-4",
      });
    }

    return { components };
  }, [
    leaveTypeOptions,
    currentLeaveDays,
    fields,
    requiredFieldMap,
    reasons,
    isReasonLoading,
    isReasonError,
  ]);

  useEffect(() => {
    if (formRef.current) {
      formRef.current.redraw();
    }
  }, [isOpen]);

  const handleReplace = async () => {
    if (!formRef.current) {
      return;
    }

    try {
      const submission = await formRef.current.submit();
      const filesFromComponent = getFormioAttachmentFileItems(
        formRef.current,
        "attachment",
      );

      const attachment = resolvePendingAttachmentUploads(
        currentAttachments,
        filesFromComponent,
        submission?.data?.attachment,
      );

      onReplace({
        ...submission.data,
        attachment,
      });
      onClose();
    } catch (error) {
      console.error("ReplaceLeaveModal submit failed:", error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormChange = (change: any) => {
    const data = change.data;
    const changed = change.changed;

    if (changed?.component?.key === "attachment") {
      setCurrentAttachments(data?.attachment || []);
    }

    if (currentLeaveDays === 1 && data.replaceBoth) {
      setIsReplaceBoth(true);
      if (data.firstHalfType) setActiveFirstHalfType(data.firstHalfType);
      if (data.secondHalfType) setActiveSecondHalfType(data.secondHalfType);
    } else {
      setIsReplaceBoth(false);
      if (data.newLeaveType) setActiveLeaveType(data.newLeaveType);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center md:items-center items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white md:rounded-xl rounded-t-xl shadow-md w-full max-w-md relative pb-3">
        <div className="flex justify-between items-center border-b px-4 py-4">
          <h2 className="base-title md:text-lg font-semibold">
            Replace Leave Type
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <Form
            form={leaveForm}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
            onChange={handleFormChange}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              validateOnInit: false,
              validateOnBlur: true,
              validateOnChange: false,
              formClass: "space-y-4",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200",
            }}
          />
          <div className="flex justify-end">
            {isDesktop ? <Button onClick={handleReplace} variant="contain" size="md">
              Replace
            </Button> : <Button onClick={handleReplace} variant="contain" size="md" fullWidth>
              Replace
            </Button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplaceLeaveOverlay;
