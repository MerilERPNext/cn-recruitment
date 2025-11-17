import { useRef } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCreateNewLoanApplication } from "../../../../hooks/useLoan";
import toast from "react-hot-toast";
import { CustomError } from "../../../../types/attendance";
import DOMPurify from "dompurify";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";
import createLoanFormSchema from "./createLoanSchema.json";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Button from "../../../shared/atoms/Button";

interface CreateLoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLoanDialog({
  isOpen,
  onClose,
}: CreateLoanDialogProps) {
  const { setRefetchAttendance } = useGlobalStore();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || ""
  );
  const { isDesktop } = useScreenSize();
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
          <Button
            onClick={() => {
              handleSubmit();
            }}
            fullWidth
            size="lg"
            variant="contain"
            bgColor={isDesktop ? "blue-600" : "black"}
            textColor="white"
            className={`${
              isDesktop ? "hover:bg-blue-700" : "hover:bg-gray-800"
            } font-medium`}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
