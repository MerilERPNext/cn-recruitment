import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import {
  useGetClaimBenefitFor,
  useGetClaimBenifitMaxAmount,
  useNewBenifitRequest,
} from "../../../hooks/useBenifits";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import DOMPurify from "dompurify";

interface BenefitRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BenefitRequestForm({
  isOpen,
  onClose,
  onSuccess,
}: BenefitRequestFormProps) {
  const [claimBenifitFor, setClaimBenifitFor] = useState("");
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || ""
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);
  const { data: claimBenifitForData } = useGetClaimBenefitFor(
    currentEmployee?.employee,
    format(new Date(), "yyyy-MM-dd")
  );
  const { data: claimBenifitForMaxAmount } = useGetClaimBenifitMaxAmount(
    currentEmployee?.employee,
    claimBenifitFor
  );
  const mutation = useNewBenifitRequest();

  const handleClaimBenifitChange = (event: {
    data: { earning_component: string };
  }) => {
    const claimBenefit = event?.data?.earning_component || "";
    setClaimBenifitFor(claimBenefit);
  };
  const createLoanFormSchema = {
    type: "form",
    display: "form",
    components: [
      {
        type: "select",
        key: "earning_component",
        label: "Claim Benifit For",
        placeholder: "Claim Benifit For",
        validate: { required: true },
        input: true,
        onChange: handleClaimBenifitChange,
        data: {
          values: claimBenifitForData?.component_array,
        },
        customClass: "w-full",
      },
      {
        type: "number",
        key: "claimed_amount",
        label: "Claimed Amount",
        input: true,
        validate: {
          required: true,
          customMessage:
            "Claimed amount cannot be greater than Max amount eligible",
          custom:
            "valid = Number(data.custom_max_amount) < input ? false : true;",
        },
      },
      {
        type: "number",
        disabled: true,
        key: "custom_max_amount",
        label: "Max Amount Eligible",
        placeholder: "0.00",
        defaultValue: claimBenifitForMaxAmount,
        validate: { required: true },
        input: true,
      },
      {
        type: "textarea",
        key: "custom_note_by_employee",
        label: "Note by employee",
        input: true,
        placeholder: "Add a note...",
      },

      {
        label: "Attachments",
        fileTypes: [
          { label: "Documents", value: ".pdf" },
          { label: "Images", value: ".jpg,.jpeg,.png" },
        ],
        storage: "customBase64",
        key: "attachments",
        type: "file",
        input: true,
        multiple: false,

        tooltip: "Upload receipts or supporting documents.",
      },
    ],
  };
  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();

    if (!submission?.data) {
      toast.error("Failed to submit form. Please try again.");
      return;
    }
    const submissionData = {
      employee: currentEmployee?.employee,
      claim_date: format(new Date(), "yyyy-MM-dd"),
      earning_component: submission?.data?.earning_component,
      custom_note_by_employee: submission?.data?.custom_note_by_employee,
      claimed_amount: submission?.data?.claimed_amount,
      attachments: submission?.data?.attachments?.[0]?.url,
    };
    mutation.mutate(submissionData as Record<string, unknown>, {
      onSuccess: () => {
        onClose();
        onSuccess();
        toast.success("Added Benifit Request successfully!");
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
            Create Employee Benifit Claim
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
        <div className="flex-1 min-h-0 overflow-y-auto pb-20 px-6">
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
