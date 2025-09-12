/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef } from "react";
import "../../../formio.custom.css";
import { useCreatePlannedOvertimeRequest } from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { format, isValid, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";

const overtimeForm = {
  display: "form",
  components: [
    {
      type: "datagrid",
      key: "overtime_details",
      label: "Overtime Requests",
      addAnother: "New Row",
      customClass: "border-0",

      components: [
        {
          type: "datetime",
          key: "shift_date",
          label: "Shift Date",
          format: "dd-MM-yyyy",
          enableTime: false,
          input: true,
          validate: { required: true },
        },
        {
          type: "datetime",
          key: "start_date",
          label: "Start Date",
          format: "dd-MM-yyyy",
          enableTime: false,
          validate: { required: true },

          input: true,
        },
        {
          type: "time",
          key: "start_time",
          label: "Start Time",
          validate: { required: true },

          input: true,
        },
        {
          type: "datetime",
          key: "end_date",
          label: "End Date",
          format: "dd-MM-yyyy",
          enableTime: false,
          validate: { required: true },

          input: true,
        },
        {
          type: "time",
          key: "end_time",
          label: "End Time",
          validate: { required: true },

          input: true,
        },
        {
          type: "textfield",
          key: "message",
          label: "Message",
          validate: { required: true },
          input: true,
        },
      ],
    },
    {
      type: "file",
      key: "attachment",
      label: "Attachment",
      storage: "customBase64",
      input: true,
    },
  ],
};

interface RequestOvertimeProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
}

const CreateOvertimeRequest = ({ onCancel }: RequestOvertimeProps) => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const mutation = useCreatePlannedOvertimeRequest();
  const formInstance = useRef<any>(null);
  const { setRefetchAttendance } = useGlobalStore();

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();
      const data = submission?.data;

      const formattedOvertimeDetails = data?.overtime_details?.map(
        (entry: any) => ({
          ...entry,
          shift_date: isValidDate(entry.shift_date)
            ? formatDate(entry.shift_date)
            : entry.shift_date,
          start_date: isValidDate(entry.start_date)
            ? formatDate(entry.start_date)
            : entry.start_date,
          end_date: isValidDate(entry.end_date)
            ? formatDate(entry.end_date)
            : entry.end_date,
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
            if (onCancel) {
              onCancel();
            }
          },
          onError: (e: CustomError) => {
            const errorMessage =
              e?.response?.data?.exception?.split(":")[1] ||
              e?.response?.data?.message?.error ||
              "Request Failed.";
            console.error(e);
            toast.error(errorMessage);
          },
        }
      );
    } catch (err) {
      // If form is invalid, prevent API call
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error:", err);
    }
  };

  // Utility to check and format ISO dates
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={() => {
        if (onCancel) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Planned Overtime Request
          </h2>
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

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <Form
            form={overtimeForm}
            onFormReady={(instance: any) => {
              formInstance.current = instance;
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
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
          <button
            onClick={() => {
              handleSubmit();
            }}
            disabled={mutation?.isPending}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            {mutation?.isPending ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Submit Request"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOvertimeRequest;
