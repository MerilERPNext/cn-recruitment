/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useMemo, useRef } from "react";
import toast from "react-hot-toast";
import Button from "../shared/atoms/Button";
import reportingDetailsFomSchema from "./reportingDetailsFomSchema.json";
import {
  useAddEmployeeReportingDetailsMutation,
  useCurrentEmployeeAllDetails,
  useGetEmployeeReportingDetails,
} from "../../hooks/useEmployee";
import CircularLoader from "../shared/atoms/CircularLoader";
import useCurrentUser from "../../hooks/useCurrentUser";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

interface ReportingDetailsProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
  isEdit?: boolean;
  defaultStartDate?: string | null;
}

const ReportingDetailsForm = ({
  onCancel,
  isEdit = false,
  defaultStartDate,
}: ReportingDetailsProps) => {
  const formInstance = useRef<any>(null);
  const initialSubmissionSet = useRef(false);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    user_id: currentUser?.name || "",
    fields: ["employee"],
  });
  const { mutateAsync: addEmployeeReportingDetails } =
    useAddEmployeeReportingDetailsMutation();

  const { data: reportingData, isLoading: employeeReportingDetailsPending } =
    useGetEmployeeReportingDetails(currentEmployee?.employee || "");

  const initialSubmissionData = useMemo(() => {
    if (isEdit) {
      return {
        data: {
          defaultReportsTo: reportingData?.data?.reports_to_name || "",
          defaultDottedLineManager:
            reportingData?.data?.custom_dotted_line_manager_name || "",
          defaultHOD: reportingData?.data?.custom_hod_name || "",
          defaultCXO: reportingData?.data?.custom_cxo_name || "",
          defaultHRBP: reportingData?.data?.custom_hrbp_name || "",
          start_date: reportingData?.data?.start_date || "",
        },
      };
    }

    return {
      data: {
        ...(defaultStartDate && {
          start_date: defaultStartDate,
        }),
      },
    };
  }, [isEdit, reportingData, defaultStartDate]);

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit(); // returns all form data
      const data = submission?.data;

      await addEmployeeReportingDetails({
        employee: currentEmployee?.employee || "",
        reports_to: String(data?.reports_to ?? ""),
        custom_dotted_line_manager: String(
          data?.custom_dotted_line_manager ?? "",
        ),
        custom_hrbp: String(data?.custom_hrbp ?? ""),
        custom_hod: String(data?.custom_hod ?? ""),
        custom_cxo: String(data?.custom_cxo ?? ""),
        start_date: String(data?.start_date ?? ""),
      });
      onCancel?.();
    } catch (err) {
      const formatedError = errorResponseFormater(
        err,
        "Submission failed. Please try again.",
      );
      toast.error(formatedError);
      console.error(err);
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
            {isEdit ? "Edit Reporting Details" : "Reporting Details"}
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
        {employeeReportingDetailsPending ? (
          <div className="flex justify-center items-center h-full w-full p-10">
            <CircularLoader />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-12">
            <Form
              form={reportingDetailsFomSchema}
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
        )}
        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            variant="contain"
            bgColor="primary"
          >
            {employeeReportingDetailsPending ? (
              <CircularLoader />
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportingDetailsForm;
