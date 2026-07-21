import React from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { useReactivateEmployeeMutation } from "../../../../hooks/useEmployee";
import Button from "../../../shared/atoms/Button";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { CustomError } from "../../../../types/attendance";

interface ActivateEmployeeProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName: string;
}

const ActivateEmployee: React.FC<ActivateEmployeeProps> = ({ isOpen, onClose, employeeId, employeeName }) => {
    const { mutateAsync: reactivateEmployee, isPending } = useReactivateEmployeeMutation();
    const loading = useLoadingOverlay();

    const handleConfirm = async () => {
        await loading?.wrap(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const response: any = await reactivateEmployee({ employees: [employeeId], comment: "" });
                if (response?.success === false) {
                    const errorMsg = response?.results?.[0]?.message || response?.message || "Activation failed";
                    toast.error(errorMsg);
                } else {
                    toast.success(`${employeeName} activated successfully.`);
                }
                onClose();
            } catch (e) {
                toast.error(errorResponseFormater(e as CustomError, "Activation Failed"));
                onClose();
                throw e;
            }
        }, "Activating employee...");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                        Activate Employee
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
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Are you sure you want to activate employee <strong>{employeeName}</strong>?
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
                    <Button
                        onClick={handleConfirm}
                        disabled={isPending}
                        loading={isPending}
                        className="px-6 py-2"
                    >
                        Activate
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ActivateEmployee;
