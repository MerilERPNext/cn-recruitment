import { useState, useRef, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { X, Eye, EyeOff } from "lucide-react";
import { useResetPasswordMutation } from "../../../../hooks/useEmployee";
import schema from "./ResetPasswordForm.json";
import Button from "../../../shared/atoms/Button";
import CircularLoader from "../../../shared/atoms/CircularLoader";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { CustomError } from "../../../../types/attendance";

interface ResetPasswordProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ isOpen, onClose, employeeId }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formInstance = useRef<any>(null);
    const formContainerRef = useRef<HTMLDivElement>(null);

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [newPassContainer, setNewPassContainer] = useState<Element | null>(null);
    const [confirmPassContainer, setConfirmPassContainer] = useState<Element | null>(null);

    const { mutate: resetPasswordMutation, isPending: isResetPasswordPending } = useResetPasswordMutation();
    const loading = useLoadingOverlay();

    useEffect(() => {
        if (!isOpen) {
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setNewPassContainer(null);
            setConfirmPassContainer(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const input = formContainerRef.current?.querySelector<HTMLInputElement>(".formio-component-new_password input");
        if (input) input.type = showNewPassword ? "text" : "password";
    }, [showNewPassword]);

    useEffect(() => {
        const input = formContainerRef.current?.querySelector<HTMLInputElement>(".formio-component-confirm_password input");
        if (input) input.type = showConfirmPassword ? "text" : "password";
    }, [showConfirmPassword]);

    const syncContainers = () => {
        const newParent = formContainerRef.current?.querySelector(".formio-component-new_password input")?.parentElement;
        const confirmParent = formContainerRef.current?.querySelector(".formio-component-confirm_password input")?.parentElement;

        newParent?.classList.add("relative");
        confirmParent?.classList.add("relative");

        setNewPassContainer(newParent || null);
        setConfirmPassContainer(confirmParent || null);
    };

    const handleSubmit = async () => {
        await loading?.wrap(async () => {
            try {
                if (formInstance.current) {
                    const submission = await formInstance.current.submit();
                    await new Promise<void>((resolve, reject) => {
                        resetPasswordMutation(
                            {
                                employee: employeeId,
                                new_password: submission.data.confirm_password,
                                send_mail: submission.data.send_email
                            },
                            {
                                onSuccess: () => {
                                    toast.success("Password reset successfully.");
                                    onClose();
                                    resolve();
                                },
                                onError: (e: CustomError) => {
                                    const formattedError = errorResponseFormater(e, "Reset Failed");
                                    toast.error(formattedError);
                                    reject(e);
                                    onClose();
                                },
                            }
                        );
                    });
                }
            } catch (error) {
                console.error("Form submission error:", error);
                toast.error("Please correct the errors in the form.");
                throw error;
            }
        }, "Resetting password...");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center md:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">
                        Reset Password
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
                <div ref={formContainerRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                    <Form
                        key={"ResetPassword"}
                        className="profile-form w-full"
                        form={schema}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onFormReady={(instance: any) => {
                            formInstance.current = instance;
                            syncContainers();
                            instance.on("render", syncContainers);
                        }}
                        options={{
                            builder: { styles: false },
                            submitButton: false,
                            alerts: false,
                            disableOnSubmit: true,
                            rowClass: "flex flex-col space-y-4",
                            labelClass: "mb-1.5 text-sm font-semibold text-gray-700",
                            inputClass: "w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all px-3 py-2 pr-10 text-sm",
                            validateOnInit: true,
                            validateOnBlur: true,
                            validateOnChange: false,
                        }}
                    />

                    {newPassContainer && createPortal(
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>,
                        newPassContainer
                    )}

                    {confirmPassContainer && createPortal(
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>,
                        confirmPassContainer
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Button
                        onClick={handleSubmit}
                        size="md"
                        fullWidth
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 py-2.5 rounded-lg font-bold"
                    >
                        {isResetPasswordPending ? <CircularLoader size="sm" color="white" /> : "Apply Updates"}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ResetPassword;