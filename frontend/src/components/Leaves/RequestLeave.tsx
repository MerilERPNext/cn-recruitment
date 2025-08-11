import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import {
  useCreateFrappeDocument,
  useFrappeDocuments,
} from "../../hooks/useFrappeQuery";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import HeaderBar from "../HeaderBar";
import { toast } from "react-hot-toast";

interface FormSubmissionData {
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  halfDay?: boolean;
  halfDayOption?: "First Half" | "Second Half";
  description?: string;
  attachment?: { url: string }[];
}

interface RequestLeaveProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RequestLeave: React.FC<RequestLeaveProps> = ({ onSuccess, onCancel }) => {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);

  const { data: leaveAllocations } = useFrappeDocuments({
    doctype: "Leave Allocation",
    fields: ["leave_type"],
    filters: {
      employee: currentEmployee?.name,
      docstatus: 1,
      to_date: [">=", new Date().toISOString().split("T")[0]],
    },
    searchFields: [],
    pageParam: 0,
    pageSize: 100,
  });

  const { triggerRefetch } = useLeaveRequestRefresh();
  const { defaults } = useRequestLeaveModal();
  const createLeaveMutation = useCreateFrappeDocument({
    onSuccess: () => {
      toast.success("Leave request submitted successfully!");
      triggerRefetch();
      onSuccess?.();
    },
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
  const formInstance = useRef<any>(null);

  const leaveTypeOptions = useMemo(() => {
    if (!leaveAllocations?.data) return [];
    const uniqueTypes = Array.from(
      new Set(leaveAllocations.data.map((entry) => entry.leave_type))
    );
    return uniqueTypes.map((type) => ({ label: type, value: type }));
  }, [leaveAllocations]);

  const calculateLeaveDays = useCallback((data: FormSubmissionData) => {
    const { fromDate, toDate, halfDay } = data;
    if (!fromDate || !toDate) return setLeaveDays(null);

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from)
      return setLeaveDays(null);

    const diffMs = to.getTime() - from.getTime();
    const days = diffMs / (1000 * 60 * 60 * 24) + 1;
    setLeaveDays(halfDay ? days - 0.5 : days);
  }, []);

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
  }, [defaults, calculateLeaveDays, formData.halfDay]);

  const handleSubmit = useCallback(async () => {
    if (!currentEmployee?.name) {
      toast.error("Employee data not loaded.");
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
          half_day_date: submission.data.halfDay
            ? submission.data.fromDate?.split("T")[0]
            : undefined,
          half_day_session: submission.data.halfDay
            ? submission.data.halfDayOption
            : undefined,
          description: submission.data.description,
          attachment: submission.data.attachment?.[0]?.url,
        },
      });
    } catch (error) {
      console.error("Form submit error:", error);
      toast.error("Failed to submit leave request. Please try again.");
    }
  }, [currentEmployee, createLeaveMutation]);

  const leaveForm = useMemo(() => {
    const baseComponents = [
      {
        type: "select",
        key: "leaveType",
        label: "Leave Type",
        placeholder: "Select Leave Type",
        input: true,
        defaultValue: defaults?.leaveType ?? "",
        validate: { required: true },
        data: { values: leaveTypeOptions },
        customClass: "px-2 mb-4",
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
                label: "From Date",
                placeholder: "YYYY-MM-DD",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.fromDate
                  ? `${defaults.fromDate}T00:00:00`
                  : "",
                validate: { required: true },
                input: true,
                customClass: "mb-4",
                format: "yyyy-MM-dd",
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "toDate",
                label: "To Date",
                placeholder: "YYYY-MM-DD",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.toDate
                  ? `${defaults.toDate}T00:00:00`
                  : "",
                validate: { required: true },
                input: true,
                customClass: "mb-4",
                format: "yyyy-MM-dd",
              },
            ],
          },
        ],
      },
    ];

    const halfDayComponents = [
      {
        type: "checkbox",
        key: "halfDay",
        label: "Half-Day Leave",
        input: true,
        labelPosition: "bottom",
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
    ];

    const panelComponents = [
      ...baseComponents,
      ...(defaults?.hideHalfDayToggle ? [] : halfDayComponents),
      {
        type: "textarea",
        key: "description",
        label: "Reason",
        placeholder: "Enter the reason for leave",
        rows: 3,
        validate: { required: true, minLength: 3 },
        input: true,
        customClass: "px-2 mb-4",
      },
      {
        type: "file",
        key: "attachment",
        label: "Attachment (Optional)",
        input: true,
        storage: "base64",
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
  }, [leaveTypeOptions, defaults]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg">
      <div className="z-[60]">
        <HeaderBar title="Request Leave" onBack={onCancel} />
      </div>

      <div
        className="ml-6 mt-4 text-sm text-gray-700"
        style={{ visibility: leaveDays !== null ? "visible" : "hidden" }}
      >
        <strong>Applying for:</strong> {leaveDays}{" "}
        {leaveDays === 1 ? "Day" : "Days"}
      </div>

      <Form
        form={leaveForm}
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

      <div className="sticky bottom-0 bg-white py-4 px-4 z-50">
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Submit Request
        </button>
      </div>
    </div>
  );
};

export default RequestLeave;
