import React from "react";
import { createPortal } from "react-dom";
import { X, Trash2 } from "lucide-react";
import { useDeleteEmployeeAndUserMutation } from "../../../../hooks/useEmployee";
import Button from "../../../shared/atoms/Button";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { CustomError } from "../../../../types/attendance";

interface DeleteEmployeeProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

const DeleteEmployee: React.FC<DeleteEmployeeProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}) => {
  const { mutateAsync: deleteEmployee, isPending } =
    useDeleteEmployeeAndUserMutation();
  const loading = useLoadingOverlay();

  const handleConfirm = async () => {
    await loading?.wrap(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await deleteEmployee(employeeId);
        if (response?.success === false) {
          const errorMsg =
            response?.message || "Failed to delete employee";
          toast.error(errorMsg);
        } else {
          toast.success(`${employeeName} deleted successfully.`);
        }
        onClose();
      } catch (e) {
        toast.error(
          errorResponseFormater(e as CustomError, "Delete Failed"),
        );
        onClose();
        throw e;
      }
    }, "Deleting employee...");
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Delete Employee
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg mb-4">
            <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-relaxed">
              <span className="font-semibold">This action is irreversible.</span>{" "}
              Deleting <strong>{employeeName}</strong> will permanently remove
              the employee record and their associated user account from the
              system.
            </p>
          </div>
          <p className="text-gray-600 text-sm">
            Are you sure you want to proceed?
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            variant="soft"
            onClick={onClose}
            disabled={isPending}
            className="px-6 py-2"
          >
            Cancel
          </Button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors
              ${isPending ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DeleteEmployee;
