/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useMemo, useRef } from "react";
import toast from "react-hot-toast";
import reportingDetailsFomSchema from "./reportingDetailsFormSchemaV2.json";
import {
    useCurrentEmployeeDetails,
    useUpdateEmpReportingDetailsRecordMutation,
} from "../../../hooks/useEmployee";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import Button from "../../shared/atoms/Button";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface InitialEditData {
    name?: string;
    reports_to?: string;
    reports_to_name?: string;
    department_name?: string;
    branch_name?: string;
    start_date?: string | null;
    end_date?: string | null;
}

interface ReportingDetailsProps {
    onSuccess?: (data?: any) => void;
    onCancel?: () => void;
    isEdit?: boolean;
    category?: string;
    categoryField?: string;
    // When true (the very first slide for this category), the start date is
    // locked to the employee's joining date and shown read-only.
    defaultStartDate?: string | null;
    lockStartDate?: boolean;
    // Date-picker bounds (YYYY-MM-DD): disallow overlaps with neighbouring
    // reporting slides and any date before the joining date.
    startMinDate?: string;
    startMaxDate?: string;
    endMinDate?: string;
    endMaxDate?: string;
    // When the previous (older) slide is a locked previous-employee tile, freeze
    // the start date (read-only) so only end date is editable.
    disableStartDate?: boolean;
    // While ADDING a slide the end date isn't editable: a new slide always
    // becomes the open ("Present") period, so the field is rendered read-only.
    disableEndDate?: boolean;
    initialEditData?: InitialEditData;
}

// Inject flatpickr min/max onto a Form.io datetime component. Done inline (not
// via the JSON-cloning `withDateBounds`) because this schema carries a function
// `template` that JSON serialisation would drop.
const applyDateBounds = (c: any, minDate?: string, maxDate?: string) => ({
    ...c,
    datePicker: { ...(c.datePicker || {}), minDate: minDate ?? null, maxDate: maxDate ?? null },
    widget: { ...(c.widget || { type: "calendar" }), minDate: minDate ?? null, maxDate: maxDate ?? null },
});

const isUsableLocationValue = (value: unknown): value is string =>
    typeof value === "string" && value.trim() !== "" && value.trim().toLowerCase() !== "unknown";

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    }[char] as string));

// formio's select item template is always rendered through Evaluator.interpolate
// with noeval forced on (see formiojs ListComponent#getOptionTemplate), which only
// supports plain "{{ a || b }}" path fallbacks - no ternaries, no method calls.
// Evaluator.interpolate has a separate branch though: if the template is a real
// function (not a string), it calls it directly, bypassing noeval entirely. So we
// set component.template to a function below instead of relying on the JSON string.
const buildReportsToItemTemplate = (data: any) => {
    const item = data?.item || {};
    const name = isUsableLocationValue(item.employee_name) ? item.employee_name : "-";
    const id = isUsableLocationValue(item.employee_id) ? item.employee_id : "-";
    const department = isUsableLocationValue(item.department_display)
        ? item.department_display
        : isUsableLocationValue(item.department) ? item.department : "";
    const branch = isUsableLocationValue(item.branch_display)
        ? item.branch_display
        : isUsableLocationValue(item.branch) ? item.branch : "";
    const location = [department, branch].filter(Boolean).join(", ");
    return `<span><div>${escapeHtml(name)} (${escapeHtml(id)})</div><div style="font-size:0.85em;color:#6b7280;">${escapeHtml(location)}</div></span>`;
};

const ReportingDetailsFormV2 = ({
    onCancel,
    onSuccess,
    isEdit = false,
    category = "Reports To",
    categoryField = "reports_to",
    defaultStartDate,
    lockStartDate = false,
    startMinDate,
    startMaxDate,
    endMinDate,
    endMaxDate,
    disableStartDate = false,
    disableEndDate = false,
    initialEditData,
}: ReportingDetailsProps) => {
    const formInstance = useRef<any>(null);
    const initialSubmissionSet = useRef(false);
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const { mutateAsync: updateEmpReportingDetailsRecord, isPending } = useUpdateEmpReportingDetailsRecordMutation();
    const { wrap } = useLoadingOverlay();

    // First slide for this category: bake `disabled` onto the start_date field
    // so it renders read-only (reliable for the datetime widget). Set in the
    // schema rather than toggled at runtime, which the flatpickr widget ignores.
    const lockStart = lockStartDate && !isEdit;
    const formSchema = useMemo(() => ({
        ...reportingDetailsFomSchema,
        components: [{
            ...reportingDetailsFomSchema.components[0],
            components: [
                {
                    ...reportingDetailsFomSchema.components[0].components[0],
                    label: category,
                    errorLabel: category,
                    template: buildReportsToItemTemplate,
                },
                ...reportingDetailsFomSchema.components[0].components.slice(1).map((c: any) => {
                    if (c.key === "start_date") {
                        return applyDateBounds(
                            { ...c, disabled: lockStart || disableStartDate },
                            startMinDate,
                            startMaxDate,
                        );
                    }
                    if (c.key === "end_date") {
                        return applyDateBounds(
                            { ...c, disabled: disableEndDate },
                            endMinDate,
                            endMaxDate,
                        );
                    }
                    return c;
                }),
            ],
        }],
    }), [category, lockStart, disableStartDate, disableEndDate, startMinDate, startMaxDate, endMinDate, endMaxDate]);

    const initialSubmissionData = useMemo(() => {
        if (isEdit && initialEditData) {
            const reportsToValue = initialEditData.reports_to || "";
            const reportsToItem = reportsToValue ? {
                employee_id: reportsToValue,
                employee_name: initialEditData.reports_to_name || "",
                department_display: initialEditData.department_name || "",
                branch_display: initialEditData.branch_name || "",
            } : undefined;
            return {
                data: {
                    // Store full object so the function template can render the
                    // rich chip immediately (no valueProperty → Formio keeps the object).
                    reports_to: reportsToItem,
                    start_date: initialEditData.start_date || "",
                    end_date: initialEditData.end_date || "",
                },
                // Keep selectData as fallback: Formio uses it when the choice
                // isn't in the loaded list (search-driven API returns nothing on open).
                ...(reportsToItem ? {
                    metadata: {
                        selectData: {
                            reports_to: reportsToItem,
                        },
                    },
                } : {}),
            };
        }
        // Add mode: seed the start date (the joining date for a first slide).
        return { data: { start_date: defaultStartDate || "" } };
    }, [isEdit, initialEditData, defaultStartDate]);

    const handleSubmit = async () => {
        try {
            const submission = await formInstance.current?.submit();
            const data = submission?.data;

            await wrap(
                () => updateEmpReportingDetailsRecord({
                    employee: currentEmployee?.employee || "",
                    field: categoryField,
                    value: typeof data?.reports_to === 'object' && data.reports_to !== null
                        ? String((data.reports_to as any)?.employee_id ?? "")
                        : String(data?.reports_to ?? ""),
                    start_date: data?.start_date ? formatToIndianDate(data.start_date) : "",
                    end_date: data?.end_date ? formatToIndianDate(data.end_date) : undefined,
                    mode: isEdit ? "update" : "new",
                    // On edit, pass the row name so the backend updates that same
                    // line (incl. start_date) instead of appending a new one.
                    ...(isEdit && initialEditData?.name ? { record_name: initialEditData.name } : {}),
                }),
                isEdit ? `Updating ${category}...` : `Adding ${category}...`,
            );
            if (onSuccess) {
                onSuccess();
            } else {
                onCancel?.();
            }
        } catch (err) {
            const formatedError = errorResponseFormater(
                err,
                "Submission failed. Please try again.",
            );
            toast.error(formatedError);
            console.error(err);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onCancel?.();
                }
            }}
        >
            <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-card text-text-body1 border border-border flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-20">
                    <h2 className="text-lg font-semibold text-text-title">
                        {isEdit ? `Edit ${category}` : `Add ${category}`}
                    </h2>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel?.();
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {/* Form.io Form */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-12">
                    <Form
                        form={formSchema}
                        onFormReady={(instance: any) => {
                            formInstance.current = instance;

                            const reportsToComponent = instance?.getComponent?.("reports_to");
                            if (reportsToComponent?.component) {
                                reportsToComponent.component.template = buildReportsToItemTemplate;
                            }

                            if (!initialSubmissionSet.current) {
                                instance?.setSubmission?.(initialSubmissionData).then(() => {
                                    instance?.checkConditions?.();
                                    instance?.redraw?.();
                                });
                                initialSubmissionSet.current = true;
                            }
                        }}
                        options={{
                            builder: { styles: false },
                            submitButton: false,
                            alerts: false,
                            disableOnSubmit: true,
                            clearOnSubmit: false,
                            formClass: "space-y-6",
                            rowClass: "flex flex-col md:flex-row md:space-x-4",
                            labelClass: "mb-1 font-medium text-text-title text-sm",
                            inputClass:
                                "border border-border rounded-lg bg-card text-text-title focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 py-2 text-sm transition-all",
                            validateOnInit: true,
                            validateOnBlur: true,
                            validateOnChange: false,
                        }}
                    />
                </div>
                {/* Footer */}
                <div className="fixed md:static bottom-0 right-0 w-full bg-card py-4 px-4 z-50 border-t border-border">
                    <Button
                        onClick={handleSubmit}
                        fullWidth
                        size="lg"
                        variant="contain"
                        bgColor="primary"
                        disabled={isPending}
                    >
                        Submit Request
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReportingDetailsFormV2;
