/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import costCenterFormSchema from "./costCenterFormSchema.json";
import "../../../formio.custom.css";
import Button from "../../shared/atoms/Button";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useCurrentEmployeeDetails, useUpdateEmployeeCostCentersMutation } from "../../../hooks/useEmployee";

interface AllocationRow {
  cost_center_id: string;
  percentage: number;
}

interface InitialCostCenterData {
  allocations: AllocationRow[];
  start_date: string;
  end_date?: string | null;
}

interface CostCenterFormProps {
  onCancel?: () => void;
  isEdit?: boolean;
  defaultStartDate?: string | null;
  initialEditData?: InitialCostCenterData;
}

const CostCenterForm = ({
  onCancel,
  isEdit = false,
  defaultStartDate,
  initialEditData,
}: CostCenterFormProps) => {
  const [instance, setInstance] = useState<any>(null);
  const initialDataApplied = useRef(false);
  const { isDesktop } = useScreenSize();

  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { mutateAsync: updateCostCenters, isPending } =
    useUpdateEmployeeCostCentersMutation();

  useEffect(() => {
    if (!instance || !currentEmployee?.company) return;
    const currentData = instance.submission?.data || {};
    if (currentData.company_filter === currentEmployee.company) return;
    instance.setSubmission(
      { data: { ...currentData, company_filter: currentEmployee.company } },
      { pristine: true },
    ).then(() => instance.redraw());
  }, [instance, currentEmployee?.company]);

  useEffect(() => {
    if (!instance || initialDataApplied.current) return;

    const currentData = instance.submission?.data || {};
    const newData = { ...currentData };
    let shouldUpdate = false;

    if (isEdit && initialEditData) {
      newData.allocations = initialEditData.allocations.map((a) => ({
        cost_center: a.cost_center_id,
        percentage: a.percentage,
        start_date: initialEditData.start_date,
        end_date: initialEditData.end_date || "",
      }));
      newData.show_end_date = !!initialEditData.end_date;
      shouldUpdate = true;
    } else if (!isEdit) {
      newData.allocations = [
        {
          cost_center: "",
          percentage: "",
          start_date: defaultStartDate || "",
          end_date: "",
        },
      ];
      newData.show_end_date = false;
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
          instance.redraw();
        });
    }
  }, [instance, isEdit, initialEditData, defaultStartDate]);

  const validateForm = (allocations: any[]): boolean => {
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
      if (!row.start_date) {
        toast.error(`Row ${i + 1}: Start Date is required.`);
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

      if (!validateForm(allocations)) return;

      await updateCostCenters({
        employee: currentEmployee?.employee,
        allocations: allocations.map((a: any) => ({
          cost_center: a.cost_center,
          percentage: Number(a.percentage),
          start_date: a.start_date,
          ...(a.end_date ? { end_date: a.end_date } : {}),
        })),
        mode: isEdit ? "update" : "new",
      });
      onCancel?.();
    } catch (err) {
      console.warn("Form submission error -", err);
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
            /* Hide add-row button */
            .cost-center-form .formio-button-add-row, .cost-center-form [ref="addRow"] { display: ${isEdit ? 'none' : 'block'} !important; };
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
            form={costCenterFormSchema}
            onFormReady={(form: any) => {
              setInstance(form);
              form.setPristine(true);
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
              {isPending ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostCenterForm;
