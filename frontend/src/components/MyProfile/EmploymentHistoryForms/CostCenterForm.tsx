/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import costCenterFormSchema from "./costCenterFormSchema.json";
import { withComponentDisabled } from "../../../utils/withComponentDisabled";
import { withDateBounds } from "../../../utils/withDateBounds";
import "../../../formio.custom.css";
import Button from "../../shared/atoms/Button";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useCurrentEmployeeDetails, useUpdateEmployeeCostCentersMutation } from "../../../hooks/useEmployee";

const isUsable = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "" && v.trim().toLowerCase() !== "null";

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const costCenterItemTemplate = (data: any) => {
  const item = data?.item ?? {};
  const name = isUsable(item.cost_center_name) ? escapeHtml(item.cost_center_name) : "-";
  const id = isUsable(item.name) ? escapeHtml(item.name) : "-";
  return `<span>${name} (${id})</span>`;
};

const COST_CENTER_FIELDS = encodeURIComponent('["*"]');
// Search text is folded straight into the `filters` array (like ChangeHrbpForm)
// rather than sent as a separate query param, so it's the same request shape
// as every other filter.
const buildCostCenterUrl = (search?: string) => {
  const filters = search
    ? [["disabled", "=", 0], ["cost_center_name", "like", `%${search}%`]]
    : [["disabled", "=", 0]];
  return `/api/resource/Cost%20Center?fields=${COST_CENTER_FIELDS}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=20`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withCostCenterSearch = (schema: any): any => {
  const walk = (components: any[]): void => {
    for (const c of components) {
      if (c?.key === "cost_center") {
        c.data = { url: buildCostCenterUrl() };
        c.template = costCenterItemTemplate;
        c.selectValues = "data";
        c.valueProperty = "name";
        c.lazyLoad = true;
        c.searchEnabled = true;
      }
      if (Array.isArray(c?.components)) {
        walk(c.components);
      }
    }
  };
  if (Array.isArray(schema?.components)) {
    walk(schema.components);
  }
  return schema;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wireCostCenterSearchInputs = (instance: any) => {
  instance.everyComponent((component: any) => {
    if (component.key !== "cost_center" || component.__searchWired) {
      return;
    }
    const searchInput =
      component.element?.querySelector("input.choices__input--cloned") ??
      component.element?.querySelector("input.choices__input");
    if (!searchInput) {
      return;
    }
    component.__searchWired = true;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    searchInput.addEventListener("input", (e: Event) => {
      const search = (e.target as HTMLInputElement).value.trim();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        component.loadItems(buildCostCenterUrl(search || undefined), "");
      }, 300);
    });
  });
};

interface AllocationRow {
  cost_center_id: string;
  percentage: number;
  row_name?: string;
}

interface InitialCostCenterData {
  allocations: AllocationRow[];
  start_date: string;
  end_date?: string | null;
}

interface CostCenterFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  isEdit?: boolean;
  defaultStartDate?: string | null;
  // When true (the very first slide for this section), the start date is locked
  // to the employee's joining date and shown read-only.
  lockStartDate?: boolean;
  // Date-picker bounds (YYYY-MM-DD): disallow overlaps with neighbouring slides
  // and any date before the joining date.
  startMinDate?: string;
  startMaxDate?: string;
  endMinDate?: string;
  endMaxDate?: string;
  // Present for API symmetry with the other slide forms; cost-center periods are
  // never carried over on rehire, so this is effectively always false.
  disableStartDate?: boolean;
  // While ADDING a slide the end date isn't editable: a new slide always becomes
  // the open ("Present") period, so the field is rendered read-only.
  disableEndDate?: boolean;
  initialEditData?: InitialCostCenterData;
}

const CostCenterForm = ({
  onCancel,
  onSuccess,
  isEdit = false,
  defaultStartDate,
  lockStartDate = false,
  startMinDate,
  startMaxDate,
  endMinDate,
  endMaxDate,
  disableStartDate = false,
  disableEndDate = false,
  initialEditData,
}: CostCenterFormProps) => {
  const [instance, setInstance] = useState<any>(null);
  const initialDataApplied = useRef(false);
  const initialAllocationsRef = useRef<AllocationRow[]>(initialEditData?.allocations || []);
  const { isDesktop } = useScreenSize();

  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { mutateAsync: updateCostCenters, isPending } =
    useUpdateEmployeeCostCentersMutation();
  const { wrap } = useLoadingOverlay();

  useEffect(() => {
    if (!instance || initialDataApplied.current) return;

    const currentData = instance.submission?.data || {};
    const newData = { ...currentData };
    let shouldUpdate = false;

    if (isEdit && initialEditData) {
      newData.allocations = initialEditData.allocations.map((a) => ({
        cost_center: a.cost_center_id,
        percentage: a.percentage,
      }));
      newData.start_date = initialEditData.start_date;
      newData.end_date = initialEditData.end_date;
      shouldUpdate = true;
    } else if (!isEdit) {
      // Don't touch `allocations` here: the datagrid already auto-provisions
      // a single empty row, so reassigning it would rebuild that row (and
      // refetch its Cost Center options) a second time.
      newData.start_date = defaultStartDate || "";
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      initialDataApplied.current = true;
      instance
        .setSubmission({ data: newData }, { pristine: true })
        .then(() => {
          instance.setPristine(true);
          instance.clearErrors();
          instance.checkConditions();
          // Edit mode can populate multiple allocation rows at once; wire up
          // debounced search on any rows that weren't present at mount.
          setTimeout(() => wireCostCenterSearchInputs(instance), 0);
        });
    }
  }, [instance, isEdit, initialEditData, defaultStartDate]);

  // First slide for this section: render the start date read-only, locked to
  // the joining date. Baked into the schema (reliable for datetime widgets).
  //
  // Computed once via a lazy useState initializer (NOT useMemo) and never
  // recomputed: the date-bound props come from data that can still be
  // loading on first render (e.g. joining date), so if this were a useMemo
  // keyed on those props, the schema object would change identity once that
  // data arrives. Formio treats a new schema reference as a brand new form
  // and rebuilds every component — including re-running the Cost Center
  // select's `dataSrc: url` fetch a second time. Freezing the schema at
  // mount guarantees Formio only ever loads it once per modal open.
  const [formSchema] = useState(() => {
    let s = withComponentDisabled(
      costCenterFormSchema,
      "start_date",
      (!!lockStartDate && !isEdit) || !!disableStartDate,
    );
    s = withDateBounds(s, "start_date", { minDate: startMinDate, maxDate: startMaxDate });
    s = withDateBounds(s, "end_date", { minDate: endMinDate, maxDate: endMaxDate });
    s = withComponentDisabled(s, "end_date", !!disableEndDate);
    s = withCostCenterSearch(s);
    return s;
  });

  const validateForm = (allocations: any[], startDate: string): boolean => {
    if (!startDate) {
      toast.error("Start Date is required.");
      return false;
    }

    if (!allocations || allocations.length === 0) {
      toast.error("Please add at least one allocation.");
      return false;
    }

    for (let i = 0; i < allocations.length; i++) {
      const row = allocations[i];
      if (!row.cost_center) {
        toast.error(`Row ${i + 1}: Cost Center is required.`);
        return false;
      }
      if (!row.percentage || Number(row.percentage) <= 0) {
        toast.error(`Row ${i + 1}: Percentage must be greater than 0.`);
        return false;
      }
    }

    const total = allocations.reduce(
      (sum, row) => sum + Number(row.percentage || 0),
      0,
    );
    if (total !== 100) {
      toast.error(`Total allocation must equal 100%. Currently: ${total}%.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!instance) return;
    if (!currentEmployee?.employee) {
      toast.error("Employee details are not loaded yet.");
      return;
    }
    try {
      const submission = await instance.submit();
      const data = submission?.data || {};
      const allocations: any[] = data.allocations || [];
      const startDate: string = data.start_date || "";
      const endDate: string = data.end_date || "";

      if (!validateForm(allocations, startDate)) return;

      await wrap(
        () => updateCostCenters({
          employee: currentEmployee?.employee,
          allocations: allocations.map((a: any, idx: number) => ({
            cost_center: a.cost_center,
            percentage: Number(a.percentage),
            start_date: startDate,
            to_date: endDate,
            record_name: initialAllocationsRef.current[idx]?.row_name,
          })),
          mode: isEdit ? "update" : "new",
        }),
        isEdit ? "Updating Cost Center..." : "Adding Cost Center...",
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      onSuccess ? onSuccess() : onCancel?.();
    } catch (err) {
      toast.error(errorResponseFormater(err, "Something went wrong. Please try again."));
      instance.redraw();
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
      <div className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[85vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">Cost Center</h2>
          {isDesktop && (
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
          )}
        </div>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 md:px-6 md:py-4 pb-20 relative cost-center-form">
          {/* Hide the datagrid "Add Row" button while keeping per-row delete */}
          <style>{`
            /* Strip all default table borders */
            .formio-component-allocations table {
              border: none !important;
              border-collapse: separate !important;
              border-spacing: 0 10px !important;
            }
            .formio-component-allocations table thead th {
              border: none !important;
              background: transparent !important;
              color: #6b7280 !important;
              font-size: 0.75rem !important;
              font-weight: 600 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              padding: 0 10px 4px !important;
            }
            .formio-component-allocations table tbody tr {
              background: #f9fafb !important;
              border-radius: 10px !important;
              box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
            }
            .formio-component-allocations table tbody td {
              border: none !important;
              padding: 10px !important;
              background: transparent !important;
            }
            .formio-component-allocations table tbody td:first-child {
              border-radius: 10px 0 0 10px !important;
            }
            .formio-component-allocations table tbody td:last-child {
              border-radius: 0 10px 10px 0 !important;
              vertical-align: middle !important;
            }
            /* Style the delete button */
            .formio-component-allocations .btn-danger {
              background: transparent !important;
              border: none !important;
              color: #ef4444 !important;
              padding: 4px 8px !important;
              border-radius: 6px !important;
            }
            .formio-component-allocations .btn-danger:hover {
              background: #fee2e2 !important;
            }

          `}</style>
          <Form
            form={formSchema}
            onFormReady={(form: any) => {
              setInstance(form);
              form.setPristine(true);
              // Wait one tick for choices.js to finish rendering its input.
              setTimeout(() => wireCostCenterSearchInputs(form), 0);
              const allocations = form.getComponent("allocations");
              allocations?.on("dataGridAddRow", () => {
                setTimeout(() => wireCostCenterSearchInputs(form), 0);
              });
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              clearOnSubmit: false,
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <div className="flex flex-row gap-3 md:justify-end">
            {!isDesktop && (
              <Button
                onClick={() => onCancel?.()}
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
              disabled={isPending}
              size="md"
              variant="contain"
              bgColor="primary"
              className="w-full md:w-auto min-w-[150px]"
            >
              Submit Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostCenterForm;
