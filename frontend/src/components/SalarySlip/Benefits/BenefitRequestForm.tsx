import { useRef, useState, useMemo } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useNewBenifitRequest } from "../../../hooks/useBenifits";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import benefitRequestFormSchema from "./benefitRequestFormSchema.json";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useFileUploader } from "../../../hooks/useFileUploader";
import CircularLoader from "../../shared/atoms/CircularLoader";

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
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || ""
  );
const [attachments,setAttachments] = useState<File[]>([])
  const formRef = useRef<any>(null);

  const { uploadFiles,loading:fileUploadLoading } = useFileUploader();
  const mutation = useNewBenifitRequest();

  // Memoize the initial submission so Form.io does NOT reset on rerender
  const initialSubmission = useMemo(() => {
    return {
      data: {
        currentEmployeeId: currentEmployee?.employee || "",
        claimDate: format(new Date(), "yyyy-MM-dd"),
      },
    };
  }, [currentEmployee]);

  // Form submission handler
  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();

    if (!submission?.data) {
      toast.error("Failed to submit form. Please try again.");
      return;
    }

    const submissionData = {
      employee: currentEmployee?.employee,
      claim_date: format(new Date(), "yyyy-MM-dd"),
      earning_component: submission.data.earning_component,
      custom_note_by_employee: submission.data.custom_note_by_employee,
      claimed_amount: submission.data.claimed_amount,
    };

    mutation.mutate(submissionData as Record<string, unknown>, {
      onSuccess: async (data: any) => {
        // upload any attachments *without* causing rerender
        if (attachments.length > 0) {
          await uploadFiles(attachments, data.doctype, data.name);
        }

        onClose();
        onSuccess();
        toast.success("Added Benefit Request successfully!");
      },
      onError: (error: CustomError) => {
        const message = errorResponseFormater(
          error,
          "Something went wrong!!"
        );
        toast.error(message);
        console.error(error);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
          <h2 className="text-xl font-semibold">Create Employee Benefit Claim</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-20 px-6">
          <Form
            form={benefitRequestFormSchema}
            submission={initialSubmission}
            options={{
              submitButton: false,
            }}
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
            // IMPORTANT: Handle attachments without causing rerender
            onChange={(submission: any) => {
              if (submission.changed?.component?.key === "attachments") {
                 setAttachments([
                  ...attachments,
                  ...(submission?.data?.attachments || []),
                ]);
              }
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 border-t">
          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            variant="contain"
            bgColor="blue-600"
            textColor="white"
            className="hover:bg-blue-700 font-medium"
          >
            {fileUploadLoading || mutation.isPending?<CircularLoader/>: "Submit Request" }
          </Button>
        </div>
      </div>
    </div>
  );
}
