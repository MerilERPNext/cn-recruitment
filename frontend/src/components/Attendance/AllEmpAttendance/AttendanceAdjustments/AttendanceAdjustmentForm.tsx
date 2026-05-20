/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef, useMemo, useCallback } from "react";
import "../../../../formio.custom.css";
import {
    useCreateNewAttendanceRequestBatch,
    useGetEmployeeShift,
} from "../../../../hooks/useAttendance";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { format, isValid, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";
import baseSchema from "./AttendanceAdjustmentFormSchema.json";
import Button from "../../../shared/atoms/Button";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { Typography } from "../../../shared/atoms/Typography";
import { AttendanceRecord } from "../../../../types/attendance";

/* ---- local types ---- */
type AttendanceStatus =
    | "present" | "absent" | "on-leave" | "half-day"
    | "half-day-first-half" | "half-day-second-half"
    | "work-from-home" | "default" | "holiday" | "unpaid" | "week-off";

interface AttendanceStatusInfo {
    status: AttendanceStatus;
    firstHalf?: string;
    secondHalf?: string;
    events: AttendanceRecord[];
    record?: AttendanceRecord;
}

export interface SelectedRow {
    date: Date;
    statusInfo: AttendanceStatusInfo;
}

interface AttendanceAdjustmentFormProps {
    selectedRows?: SelectedRow[];
    onCancel?: () => void;
    onSuccess?: () => void;
}

/* ---- schema: lock datagrid rows, hide "Add Another" / remove ---- */
const lockedSchema = (() => {
    const cloned = JSON.parse(JSON.stringify(baseSchema));
    const datagrid = cloned.components?.find(
        (c: any) => c.key === "attendance_adjustment_details",
    );
    if (datagrid) {
        datagrid.disableAddingRows = true;
        datagrid.disableRemovingRows = true;
        datagrid.reorder = false;
    }
    return cloned;
})();

/* ---- stacked mobile CSS + hide add/remove row controls ---- */
const STACK_CSS = `
  .attendance-adjustment-form .formio-button-add-row,
  .attendance-adjustment-form [ref="addRow"],
  .attendance-adjustment-form .datagrid-add {
    display: none !important;
  }

@media (max-width: 767px) {
  .formio-component-attendance_adjustment_details table.table,
  .formio-component-attendance_adjustment_details table.table thead,
  .formio-component-attendance_adjustment_details table.table tbody,
  .formio-component-attendance_adjustment_details table.table tr,
  .formio-component-attendance_adjustment_details table.table td {
    display: block !important;
    width: 100% !important;
  }
  .formio-component-attendance_adjustment_details table.table thead {
    display: none !important;
  }
  .formio-component-attendance_adjustment_details table.table tr {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 8px;
    background: #fff;
  }
  .formio-component-attendance_adjustment_details table.table td {
    border: none !important;
    padding: 4px 2px !important;
  }
}
`;

/* ---- helpers ---- */

/** Combines a date string ("yyyy-MM-dd") with a time string ("HH:mm:ss") → ISO string */
const buildDateTimeISO = (dateStr: string, timeStr: string): string => {
    try {
        const base = parseISO(dateStr);
        const [h, m, s] = timeStr.split(":").map(Number);
        base.setHours(h, m, isNaN(s) ? 0 : s, 0);
        return isValid(base) ? base.toISOString() : "";
    } catch {
        return "";
    }
};

/** Returns current local time as ISO string anchored to a given date */
const nowOnDate = (dateStr: string): string => {
    try {
        const now = new Date();
        const base = parseISO(dateStr);
        base.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
        return isValid(base) ? base.toISOString() : new Date().toISOString();
    } catch {
        return new Date().toISOString();
    }
};

export const AttendanceAdjustmentForm = ({
    selectedRows = [],
    onCancel,
    onSuccess,
}: AttendanceAdjustmentFormProps) => {
    const formInstance = useRef<any>(null);
    const initialSubmissionSet = useRef(false);
    const { setRefetchAttendance } = useGlobalStore();
    const { isDesktop } = useScreenSize();
    const loading = useLoadingOverlay();

    const { data: currentEmployee } = useCurrentEmployeeDetails({
        logged_in_employee_details: true,
    });

    const createMutation = useCreateNewAttendanceRequestBatch();

    /* Fetch shift using the first selected row's date as reference */
    const shiftFilterDate = useMemo(() => {
        const first = selectedRows[0];
        if (!first) return format(new Date(), "yyyy-MM-dd");
        return first.statusInfo.record?.start ?? format(first.date, "yyyy-MM-dd");
    }, [selectedRows]);

    const { data: shiftData } = useGetEmployeeShift(
        currentEmployee?.user_id || currentEmployee?.employee || "",
        useMemo(() => ({ date: shiftFilterDate }), [shiftFilterDate]),
    );

    /** Pre-fill one datagrid row per selected date */
    const initialSubmissionData = useMemo(() => {
        const rows = selectedRows.map(({ date, statusInfo }) => {
            const record = statusInfo.record;
            const dateStr = record?.start ?? format(date, "yyyy-MM-dd");
            const endDateStr = record?.end ?? dateStr;

            /* check_in: record in_time → shift start_time → current time */
            const checkIn = record?.in_time
                ? buildDateTimeISO(dateStr, record.in_time)
                : shiftData?.start_time
                    ? buildDateTimeISO(dateStr, shiftData.start_time)
                    : nowOnDate(dateStr);

            /* check_out: record out_time → shift end_time → current time */
            const checkOut = record?.out_time
                ? buildDateTimeISO(endDateStr, record.out_time)
                : shiftData?.end_time
                    ? buildDateTimeISO(endDateStr, shiftData.end_time)
                    : nowOnDate(endDateStr);

            return {
                start_date: parseISO(dateStr).toISOString(),
                end_date: parseISO(endDateStr).toISOString(),
                check_in: checkIn,
                check_out: checkOut,
                custom__request_reason: "",
                custom_location: "",
                message: "",
            };
        });
        return { data: { attendance_adjustment_details: rows } };
    }, [selectedRows, shiftData]);

    const formatTimeFromISO = (isoString: string): string => {
        if (!isoString) return "";
        try {
            const d = new Date(isoString);
            if (!isValid(d)) return "";
            return format(d, "HH:mm:ss");
        } catch {
            return "";
        }
    };

    const handleSubmit = async () => {
        await loading?.wrap(async () => {
            try {
                const submission = await formInstance.current?.submit();
                const rows: any[] = submission?.data?.attendance_adjustment_details ?? [];

                if (rows.length === 0) {
                    toast.error("No rows to submit.");
                    return;
                }

                const employee = currentEmployee?.employee ?? "";
                const applications = rows.map((row) => {
                    return {
                        custom_request_type: "Attendance Adjustment",
                        company: currentEmployee?.company,
                        employee,
                        explanation: row.message ?? "",
                        from_date: format(new Date(row.start_date), "yyyy-MM-dd"),
                        to_date: format(new Date(row.end_date), "yyyy-MM-dd"),
                        custom_from_time: formatTimeFromISO(row.check_in),
                        custom_to_time: formatTimeFromISO(row.check_out),
                        custom__request_reason: row.custom__request_reason ?? "",
                        custom_location: row.custom_location ?? "",
                    }
                })
                await createMutation.mutateAsync({
                    applications: applications
                }, {
                    onSuccess: () => {
                        toast.success(
                            `${rows.length} attendance adjustment request${rows.length > 1 ? "s" : ""} submitted successfully.`,
                        );
                        onSuccess?.();
                    },
                    onError: (error) => {
                        toast.error(errorResponseFormater(error as any, "Submission failed"));
                    },
                })

                onSuccess?.();
                onCancel?.();
                setTimeout(() => setRefetchAttendance(true), 1000);
            } catch (err) {
                toast.error(errorResponseFormater(err as any, "Submission failed"));
                console.warn("Attendance adjustment submission error -", err);
                throw err;
            }
        }, "Submitting attendance adjustments…");
    };

    /* Re-apply prefill whenever shiftData resolves after form is ready */
    const onFormReady = useCallback(
        (instance: any) => {
            formInstance.current = instance;
            if (!initialSubmissionSet.current) {
                instance?.setSubmission?.(initialSubmissionData);
                initialSubmissionSet.current = true;
            }
        },
        // intentionally empty — we only want to set once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel?.();
            }}
        >
            <div className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[85vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Attendance Adjustment
                        </h2>
                        <Typography variant="bodySmall" className="text-gray-500">
                            {selectedRows.length} date{selectedRows.length > 1 ? "s" : ""}{" "}
                            selected
                        </Typography>
                    </div>
                    {isDesktop && (
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5 text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Form */}
                <div className="attendance-adjustment-form flex-1 min-h-0 p-2 md:px-6 md:py-4 overflow-y-auto pb-20">
                    <style>{STACK_CSS}</style>
                    <Form
                        form={lockedSchema}
                        onChange={useCallback(() => { }, [])}
                        onFormReady={onFormReady}
                        options={{
                            builder: { styles: false },
                            submitButton: false,
                            alerts: false,
                            disableOnSubmit: true,
                            clearOnSubmit: false,
                            validateOnBlur: true,
                            validateOnChange: false,
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
                    <div className="max-w-4xl mx-auto flex flex-row gap-3 md:gap-4 md:justify-end">
                        {!isDesktop && (
                            <Button
                                onClick={onCancel}
                                size="md"
                                variant="outline"
                                bgColor="primary"
                                className="w-full md:w-auto min-w-[150px]"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending}
                            size="md"
                            variant="contain"
                            bgColor="primary"
                            className="w-full md:w-auto min-w-[150px]"
                        >
                            {createMutation.isPending ? (
                                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceAdjustmentForm;
