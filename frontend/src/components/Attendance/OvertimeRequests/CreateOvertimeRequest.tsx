/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef, useMemo } from "react";
import "../../../formio.custom.css";
import {
  useCreatePlannedOvertimeRequest,
  usePlannedOvertimeRequestAttachments,
} from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { format, isValid, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import overtimeRequestSchema from "./overtimeRequestSchema.json";
import DOMPurify from "dompurify";
import Button from "../../shared/atoms/Button";

interface RequestOvertimeProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
}

const CreateOvertimeRequest = ({ onCancel }: RequestOvertimeProps) => {
  const formInstance = useRef<any>(null);
  const initialSubmissionSet = useRef(false);

  const { setRefetchAttendance } = useGlobalStore();

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  const mutation = useCreatePlannedOvertimeRequest();
  const { data: plannedOvertimeRequestAttachments } =
    usePlannedOvertimeRequestAttachments(currentEmployee?.employee || "");

  /** Memoized initial value to avoid rerender resets */
  const initialSubmissionData = useMemo(
    () => ({
      data: {
        show_attachment: !!plannedOvertimeRequestAttachments,
      },
    }),
    [plannedOvertimeRequestAttachments]
  );

  const isValidDate = (dateString: string) => {
    try {
      const parsed = parseISO(dateString);
      return isValid(parsed);
    } catch {
      return false;
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "yyyy-MM-dd");
  };

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit(); // returns all form data
      const data = submission?.data;

      const formattedOvertimeDetails = data?.overtime_details?.map(
        (entry: any) => ({
          shift_date: isValidDate(entry.start_date)
            ? formatDate(entry.start_date)
            : entry.start_date,
          start_date: isValidDate(entry.start_date)
            ? formatDate(entry.start_date)
            : entry.start_date,
          end_date: isValidDate(entry.end_date)
            ? formatDate(entry.end_date)
            : entry.end_date,
          start_time: format(new Date(entry?.start_time), "HH:mm:ss"),
          end_time: format(new Date(entry?.end_time), "HH:mm:ss"),
          message: entry?.message,
        })
      );

      mutation.mutate(
        {
          employee: currentEmployee?.employee || "",
          overtime_details: formattedOvertimeDetails || [],
          attachment:
            data?.attachment && data?.attachment?.length > 0
              ? data?.attachment?.[0].url
              : "",
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 1000);
            toast.success("Request submitted successfully.");
            onCancel?.();
          },
          onError: (e: CustomError) => {
            const errorMessage =
              e?.response?.data?.exception?.split(":")[1] ||
              e?.response?.data?.message?.error ||
              "Request Failed.";
            const cleanString = DOMPurify.sanitize(errorMessage || "");
            toast.error(
              <span dangerouslySetInnerHTML={{ __html: cleanString }} />
            );
            console.error(e);
          },
        }
      );
    } catch (err) {
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error -", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Planned Overtime Request
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <Form
            form={overtimeRequestSchema}
            /** CRITICAL FIX: Do NOT pass submission prop */
            onFormReady={(instance: any) => {
              formInstance.current = instance;
              if (!initialSubmissionSet.current) {
                instance?.setSubmission?.(initialSubmissionData);
                initialSubmissionSet.current = true;
              }
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              clearOnSubmit: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col md:flex-row md:space-x-4",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
              validateOnInit: true,
              validateOnBlur: true,
              validateOnChange: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <Button
            onClick={handleSubmit}
            disabled={mutation?.isPending}
            fullWidth
            size="lg"
            variant="contain"
            bgColor={"blue-600"}
            textColor="white"
            className="hover:bg-blue-700 font-medium"
          >
            {mutation?.isPending ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateOvertimeRequest;
