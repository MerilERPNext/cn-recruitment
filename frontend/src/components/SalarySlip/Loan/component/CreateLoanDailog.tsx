import { useRef } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import {
  useCreateNewLoanApplication,
  useLoanProducts,
} from "../../../../hooks/useLoan";
import toast from "react-hot-toast";
import { CustomError } from "../../../../types/attendance";
import DOMPurify from "dompurify";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";

interface CreateLoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLoanDialog({
  isOpen,
  onClose,
}: CreateLoanDialogProps) {
  const { isDesktop } = useScreenSize();
    const { setRefetchAttendance } = useGlobalStore();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || ""
  );
  const { data: loanProducts } = useLoanProducts();
  const mutation = useCreateNewLoanApplication();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);
  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();
    const formData = submission?.data;
    const submissionData = {
      ...formData,
      company: currentEmployee?.company,
      applicant_type: "Employee",
      applicant: currentEmployee?.employee,
    };
    console.log("Submitted Loan Form Data", submissionData);

    mutation.mutate(submissionData as Record<string, unknown>, {
      onSuccess: () => {
        onClose();
        setTimeout(() => {
          setRefetchAttendance(true);
        }, 2000);

        toast.success("Added Loan Request successfully!");
      },
      onError: (error: CustomError) => {
        const errorMessage =
          error?.response?.data?.exception
            ?.split(":")
            .slice(1)
            .join(":")
            .trim() || "Something went wrong!!";
        const cleanString = DOMPurify.sanitize(errorMessage || "");
        toast.error(<span dangerouslySetInnerHTML={{ __html: cleanString }} />);
        console.error(error);
      },
    });

    // Call API here
  };

  const createLoanFormSchema = {
    type: "form",
    display: "form",
    components: [
      {
        key: "loanPanel",
        customClass: "py-4 px-6",
        components: [
          {
            type: "select",
            key: "loan_product",
            label: "Loan Product",
            placeholder: "Select Applicant Type",
            validate: { required: true },
            input: true,
            data: {
              values:
                loanProducts?.data?.map((item: { name: string }) => ({
                  label: item?.name,
                  value: item?.name,
                })) || [],
            },
            customClass: "w-full",
          },

          {
            type: "number",
            key: "loan_amount",
            label: "Loan Amount (INR)",
            validate: { required: true, min: 1 },
            input: true,
          },

          {
            type: "columns",
            key: "repayment_columns",
            customClass: isDesktop ? "mb-4" : "mb-4 gap-4", // Tailwind to reduce spacing
            columns: [
              {
                width: 6,
                components: [
                  {
                    type: "select",
                    key: "repayment_method",
                    label: "Repayment Method",
                    input: true,
                    defaultValue: "Repay Over Number of Periods",
                    validate: { required: true },
                    data: {
                      values: [
                        {
                          label: "Repay Over Number of Periods",
                          value: "Repay Over Number of Periods",
                        },
                        {
                          label: "Repay Fixed Amount per Period",
                          value: "Repay Fixed Amount per Period",
                        },
                      ],
                    },
                    customClass: "w-full",
                  },
                ],
              },
              {
                width: 6,
                components: [
                  {
                    type: "number",
                    key: "repayment_amount",
                    label: "Monthly Repayment Amount",
                    input: true,
                    customConditional:
                      "show = ['Repay Fixed Amount per Period'].includes(data.repayment_method || '');",
                    validate: { required: true },
                    customClass: "w-full",
                  },
                  {
                    type: "number",
                    key: "repayment_periods",
                    label: "Repayment Period in Months",
                    input: true,
                    customConditional:
                      "show = ['Repay Over Number of Periods'].includes(data.repayment_method || '');",
                    validate: { required: true, min: 1, max: 12 },
                    customClass: "w-full",
                  },
                ],
              },
            ],
          },
          {
            type: "textarea",
            key: "description",
            label: "Reason",
            validate: { required: true },
            input: true,
            placeholder: "Enter reason",
          },
  
        ],
      },
    ],
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={() => {
        if (onClose) {
          onClose();
        }
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Loan
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <Form
            form={createLoanFormSchema}
            options={{
              submitButton: false,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
          />
        </div>
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <button
            onClick={() => {
              handleSubmit();
            }}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
