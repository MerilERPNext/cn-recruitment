import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import "./RequestLeaveModal.css";
import {
  useCreateFrappeDocument,
  useFrappeDocuments,
} from "../../hooks/useFrappeQuery";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import { toast } from "react-hot-toast";
import { useScreenSize } from "../../hooks/useScreenSize";

interface FormSubmissionData {
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  halfDay?: boolean;
  halfDayOption?: "First Half" | "Second Half";
  description?: string;
  attachment?: { url: string }[];
}

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RequestLeaveModal: React.FC<RequestLeaveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isDesktop } = useScreenSize();
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
      onClose();
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
    if (!leaveAllocations?.data) return [];

    const leaveTypes = leaveAllocations.data
      .map((entry) => entry.leave_type)
      .filter((type): type is string => Boolean(type));

    const uniqueTypes = Array.from(new Set(leaveTypes));

    const filteredTypes = uniqueTypes.filter((type) =>
      type.toLowerCase() !== "optional holiday"
    );

    return filteredTypes.map((type) => ({
      label: type,
      value: type
    }));
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
        customClass: "mb-4",
        disabled: Boolean(defaults?.leaveType),
      },
      {
        type: "columns",
        key: "dateColumns",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "fromDate",
                label: "From Date",
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
                label: "To Date",
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
                disabled: Boolean(defaults?.toDate),
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
          "custom-halfday-toggle my-3 border rounded-lg shadow-sm bg-white p-3",
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
        customClass: "mb-4 ml-4",
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
        customClass: "mb-4",
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
        customClass: "mb-6",
      },
    ];

    return {
      components: panelComponents,
    };
  }, [leaveTypeOptions, defaults]);

  if (!isOpen) return null;

  if (!isDesktop) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="formio-modal relative bg-white rounded-lg shadow-xl w-[70%] max-w-6xl max-h-[90vh] flex flex-col z-10">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Request Leave</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Leave Days Display */}
        {leaveDays !== null && (
          <div className="flex-shrink-0 px-6 py-3 text-sm bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Applying for:</span>
              <span className="font-semibold text-blue-600">
                {leaveDays} {leaveDays === 1 ? "Day" : "Days"}
              </span>
            </div>
          </div>
        )}

        <div className="flex-grow overflow-y-auto ">
          <div className="p-6">
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
                labelClass: "mb-2 font-medium text-gray-700",
                inputClass:
                  "border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
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
        </div>

        {/* Form Actions */}
        <div className="flex-shrink-0 bg-white border-t shadow-lg py-4 px-6">
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createLeaveMutation.isPending}
              className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              {createLeaveMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RequestLeaveModal;