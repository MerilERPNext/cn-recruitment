import { Form } from "@tsed/react-formio";
import { X, AlertCircle } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import { useReactivateEmployeeMutation } from "../../../../hooks/useEmployee";
import { CustomError } from "../../../../types/attendance";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import Button from "../../../shared/atoms/Button";
import CircularLoader from "../../../shared/atoms/CircularLoader";
import schema from "./UndoDeactivationForm.json";

interface UndoDeactivationProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

const UndoDeactivation: React.FC<UndoDeactivationProps> = ({
  isOpen,
  onClose,
  employeeId,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);

  const { mutate: reactivateEmployeeMutation, isPending: isReactivatePending } =
    useReactivateEmployeeMutation();
  const loading = useLoadingOverlay();

  const handleSubmit = async () => {
    await loading?.wrap(async () => {
      let submission;
      try {
        if (formInstance.current) {
          submission = await formInstance.current.submit();
        }
      } catch (error) {
        console.error("Form submission error:", error);
        toast.error("Please correct the errors in the form.");
        return;
      }

      if (submission) {
        await new Promise<void>((resolve) => {
          reactivateEmployeeMutation(
            {
              employees: [employeeId],
              comment: submission.data.comment,
            },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onSuccess: (response: any) => {
                if (response?.success === false) {
                  const errorMsg =
                    response?.results?.[0]?.message ||
                    response?.message ||
                    "Reactivation failed";
                  toast.error(errorMsg);
                } else {
                  toast.success("Employee reactivated successfully.");
                }
                onClose();
                resolve();
              },
              onError: (e: CustomError) => {
                const formattedError = errorResponseFormater(
                  e,
                  "Reactivation Failed",
                );
                toast.error(formattedError);
                onClose();
                resolve();
              },
            },
          );
        });
      }
    }, "Reactivating employee...");
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            Undo Deactivation
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <div className="text-sm text-gray-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <p className="font-semibold text-gray-900 mb-3">
              You are about to Undo deactivation for this Member. Please note the below changes -
            </p>
            <ul className="space-y-2 mb-4 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-medium shrink-0">a.</span>
                <span>Member will be active immediately after the action.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium shrink-0">b.</span>
                <span>He/she will continue with same attributes as before. Employment Details will not show any break because of the deactivation done earlier.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium shrink-0">c.</span>
                <span>Tasks which have been archived due to deactivation will not be recreated and will have to be closed either by retriggering or by admin intervention</span>
              </li>
            </ul>
            <p className="font-medium text-gray-900">
              Once confirmed, Member will be directly moved to active status with same login credentials as before.
            </p>
          </div>

          <Form
            key={"UndoDeactivation"}
            className="profile-form w-full"
            form={schema}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formInstance.current = instance;
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              rowClass: "flex flex-col space-y-4",
              labelClass: "mb-1.5 text-sm font-semibold text-gray-700",
              inputClass:
                "w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all px-3 py-2 text-sm",
              validateOnInit: true,
              validateOnBlur: true,
              validateOnChange: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            variant="soft"
            onClick={onClose}
            disabled={isReactivatePending}
            className="px-6 py-2 font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isReactivatePending}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-6 py-2 rounded-lg font-medium"
          >
            {isReactivatePending ? (
              <CircularLoader size="sm" color="white" />
            ) : (
              "Undo Deactivation"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default UndoDeactivation;
