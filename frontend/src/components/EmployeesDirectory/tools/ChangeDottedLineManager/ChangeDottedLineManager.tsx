import { useRef, useMemo } from "react";
import { Form } from "@tsed/react-formio";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUpdateDottedLineManagerMutation } from "../../../../hooks/useEmployee";
import baseSchema from "./ChangeDottedLineManagerForm.json";
import Button from "../../../shared/atoms/Button";
import CircularLoader from "../../../shared/atoms/CircularLoader";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { CustomError } from "../../../../types/attendance";

const isUsable = (v: unknown): v is string =>
    typeof v === "string" && v.trim() !== "" && v.trim().toLowerCase() !== "null";

const escapeHtml = (v: string) =>
    v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const managerItemTemplate = (data: any) => {
    const item = data?.item ?? {};
    const name = isUsable(item.employee_name) ? escapeHtml(item.employee_name) : "-";
    const id = isUsable(item.name) ? escapeHtml(item.name) : "-";
    const department = isUsable(item.department) ? escapeHtml(item.department) : "";
    const branch = isUsable(item.branch) ? escapeHtml(item.branch) : "";
    const location = [department, branch].filter(Boolean).join(", ");
    return `<span><div>${name} (${id})</div><div style="font-size:0.85em;color:#6b7280;">${location}</div></span>`;
};

const EMP_FIELDS = encodeURIComponent('["name","employee_name","department","branch"]');
const buildEmpUrl = (search?: string) => {
    const filters = search
        ? [["status", "=", "Active"], ["employee_name", "like", `%${search}%`]]
        : [["status", "=", "Active"]];
    return `/api/resource/Employee?fields=${EMP_FIELDS}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=20`;
};

interface ChangeDottedLineManagerProps {
    isOpen: boolean;
    onClose: () => void;
    employees: string[];
}

const ChangeDottedLineManager: React.FC<ChangeDottedLineManagerProps> = ({ isOpen, onClose, employees }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formInstance = useRef<any>(null);

    const schema = useMemo(() => ({
        ...baseSchema,
        components: [
            {
                ...baseSchema.components[0],
                template: managerItemTemplate,
                data: { url: buildEmpUrl() },
                selectValues: "data",
                valueProperty: "name",
                lazyLoad: true,
                searchEnabled: true,
            },
            ...baseSchema.components.slice(1),
        ],
    }), []);

    const { mutate: updateDottedLineManager, isPending: isUpdateDottedLineManagerLoading } = useUpdateDottedLineManagerMutation()
    const loading = useLoadingOverlay();

    const handleSubmit = async () => {
        await loading?.wrap(async () => {
            try {
                if (formInstance.current) {
                    const submission = await formInstance.current.submit();
                    await new Promise<void>((resolve, reject) => {
                        updateDottedLineManager(
                            {
                                employees: employees,
                                dotted_line_manager: submission.data.dotted_line_manager,
                                effective_date: submission.data.effective_from
                            },
                            {
                                onSuccess: () => {
                                    toast.success("Dotted Line Manager updated successfully");
                                    onClose();
                                    resolve();
                                },
                                onError: (e: CustomError) => {
                                    const formattedError = errorResponseFormater(e, "Update Failed");
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
        }, "Updating Dotted Line Manager...");
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center md:p-4 ">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onClose() }} />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">
                        Update Dotted Line Manager
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
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                    <Form
                        key={"DottedLineManager"}
                        className="profile-form w-full"
                        form={schema}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onFormReady={(instance: any) => {
                            formInstance.current = instance;
                            // Wait one tick for choices.js to finish rendering its input
                            setTimeout(() => {
                                const managerComp = instance.getComponent('dotted_line_manager');
                                if (!managerComp) return;
                                const searchInput =
                                    managerComp.element?.querySelector('input.choices__input--cloned') ??
                                    managerComp.element?.querySelector('input.choices__input');
                                if (!searchInput) return;
                                let debounceTimer: ReturnType<typeof setTimeout> | null = null;
                                searchInput.addEventListener('input', (e: Event) => {
                                    const search = (e.target as HTMLInputElement).value.trim();
                                    if (debounceTimer) clearTimeout(debounceTimer);
                                    debounceTimer = setTimeout(() => {
                                        managerComp.loadItems(buildEmpUrl(search || undefined), '');
                                    }, 300);
                                });
                            }, 0);
                        }}
                        options={{
                            builder: { styles: false },
                            submitButton: false,
                            alerts: false,
                            disableOnSubmit: true,
                            rowClass: "flex flex-col space-y-4",
                            labelClass: "mb-1.5 text-sm font-semibold text-gray-700",
                            inputClass: "w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all px-3 py-2 text-sm",
                            validateOnInit: true,
                            validateOnBlur: true,
                            validateOnChange: false,
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Button
                        onClick={handleSubmit}
                        size="md"
                        fullWidth
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 py-2.5 rounded-lg font-bold"
                    >
                        {isUpdateDottedLineManagerLoading ? <CircularLoader size="sm" color="white" /> : "Apply Updates"}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ChangeDottedLineManager;
