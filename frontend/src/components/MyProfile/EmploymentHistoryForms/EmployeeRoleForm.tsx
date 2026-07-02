/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../shared/atoms/Button";
import employeeRoleFormSchema from "./employeeRoleFormSchema.json";
import {
  useCurrentEmployeeDetails,
  useUpdateEmploymentDetailsMutation,
} from "../../../hooks/useEmployee";
import { useLoadingOverlay } from "../../../context/OverlayContext";

interface InitialEmployeeRoleData {
  employee_role: string;
  start_date: string;
  end_date?: string | null;
  // History row name of the existing line being edited. Sent as record_name so
  // the backend moves/edits that line in place instead of appending a new one.
  employee_role_row_name?: string;
}

interface EmployeeRoleFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  isEdit?: boolean;
  defaultStartDate?: string | null;
  initialEditData?: InitialEmployeeRoleData;
}

const EmployeeRoleForm = ({
  onCancel,
  onSuccess,
  isEdit = false,
  defaultStartDate,
  initialEditData,
}: EmployeeRoleFormProps) => {
  const [instance, setInstance] = useState<any>(null);
  const initialDataApplied = useRef(false);

  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { mutateAsync: updateEmploymentDetails, isPending } =
    useUpdateEmploymentDetailsMutation();
  const { wrap } = useLoadingOverlay();

  useEffect(() => {
    if (!instance || initialDataApplied.current) return;

    const currentData = instance.submission?.data || {};
    const newData = { ...currentData };
    let shouldUpdate = false;

    if (isEdit && initialEditData) {
      newData.employee_role = initialEditData.employee_role;
      newData.startDate = initialEditData.start_date;
      newData.endDate = initialEditData.end_date || "";
      shouldUpdate = true;
    } else if (!isEdit) {
      newData.employee_role = "";
      if (defaultStartDate) {
        newData.startDate = defaultStartDate;
      }
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

  const validateForm = (data: any) => {
    if (!instance) return false;

    const requiredFields = [
      { key: "employee_role", label: "Employee Role" },
      { key: "startDate", label: "Start Date" },
    ];

    let isValid = true;
    requiredFields.forEach((field) => {
      const component = instance.getComponent(field.key);
      if (component && component.visible) {
        if (!data[field.key]) {
          isValid = false;
          component.setCustomValidity(`${field.label} is required`);
        } else {
          component.setCustomValidity("");
        }
      } else if (component) {
        component.setCustomValidity("");
      }
    });

    if (!isValid) {
      instance.redraw();
    }
    return isValid;
  };

  const handleSubmit = async () => {
    if (!instance) return;

    try {
      const submission = await instance.submit();
      const data = submission?.data || {};

      const isValid = validateForm(data);
      if (!isValid) {
        toast.error("Please fill in all required fields.");
        return;
      }

      await wrap(
        () => updateEmploymentDetails({
          employee: currentEmployee?.employee,
          fields: [{
            field: "employee_role",
            value: data.employee_role,
            // On edit, identify the existing row so the backend updates it in
            // place (incl. start_date) rather than creating a duplicate.
            ...(isEdit && initialEditData?.employee_role_row_name
              ? { record_name: initialEditData.employee_role_row_name }
              : {}),
          }],
          start_date: data.startDate,
          ...(data.endDate ? { to_date: data.endDate } : {}),
          mode: isEdit ? "update" : "new",
        }),
        isEdit ? "Updating Employee Role..." : "Adding Employee Role...",
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      onSuccess ? onSuccess() : onCancel?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
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
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">Employee Role</h2>
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

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-12 relative">
          <Form
            form={employeeRoleFormSchema}
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

export default EmployeeRoleForm;
