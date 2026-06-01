import React from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { useResetOtpResendLimitMutation } from "../../../../hooks/useEmployee";
import Button from "../../../shared/atoms/Button";
import { useLoadingOverlay } from "../../../../context/OverlayContext";

interface ResetOtpLimitProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const ResetOtpLimit: React.FC<ResetOtpLimitProps> = ({ isOpen, onClose, userId }) => {
    const { mutate: resetOtpMutation, isPending } = useResetOtpResendLimitMutation();
    const loading = useLoadingOverlay();

    const handleConfirm = async () => {
        await loading?.wrap(async () => {
            await new Promise<void>((resolve, reject) => {
                resetOtpMutation(userId, {
                    onSuccess: () => {
                        onClose();
                        resolve();
                    },
                    onError: (e: any) => {
                        reject(e);
                        onClose();
                    },
                });
            });
        }, "Resetting OTP Limit...");
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
                        Reset OTP Limit
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
                        Are you sure you want to reset the OTP authentication limit for user <strong>{userId}</strong>
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
                        Reset OTP
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ResetOtpLimit;
