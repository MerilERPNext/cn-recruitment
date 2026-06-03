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
import CircularLoader from "../../shared/atoms/CircularLoader";

interface InitialEmployeeRoleData {
  employee_role: string;
  start_date: string;
}

interface EmployeeRoleFormProps {
  onCancel?: () => void;
  isEdit?: boolean;
  defaultStartDate?: string | null;
  initialEditData?: InitialEmployeeRoleData;
}

const EmployeeRoleForm = ({
  onCancel,
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

  useEffect(() => {
    if (!instance || initialDataApplied.current) return;

    const currentData = instance.submission?.data || {};
    const newData = { ...currentData };
    let shouldUpdate = false;

    if (isEdit && initialEditData) {
      newData.employee_role = initialEditData.employee_role;
      newData.startDate = initialEditData.start_date;
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

      await updateEmploymentDetails({
        employee: currentEmployee?.employee,
        fields: [{ field: "employee_role", value: data.employee_role }],
        start_date: data.startDate,
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
          >
            {isPending ? <CircularLoader /> : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeRoleForm;
