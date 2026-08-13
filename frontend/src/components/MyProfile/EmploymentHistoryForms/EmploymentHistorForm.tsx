/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import Button from "../../shared/atoms/Button";
import employmentHistoryFormSchema from "./employmentHistoryFormSchema.json";
import { withComponentDisabled } from "../../../utils/withComponentDisabled";
import { withDateBounds } from "../../../utils/withDateBounds";
import {
  useAddEmployeeHistoryMutation,
  useCurrentEmployeeDetails,
  useGetDesignationHierarchy,
  useGetEmpDesignationHierarchyCurrentDetails,
} from "../../../hooks/useEmployee";
import CircularLoader from "../../shared/atoms/CircularLoader";
import { useLoadingOverlay } from "../../../context/OverlayContext";

interface InitialEditData {
  company: string;
  department: string;
  designation: string;
  functional_area: string;
  start_date: string;
  end_date?: string | null;
  is_promotion: boolean;
  // Per-field history row names. Sent as ``record_names`` so the backend edits
  // each of the card's lines in place (incl. start_date) instead of appending
  // duplicates when the date changes.
  record_names?: Record<string, string | undefined>;
}

interface EmploymentHistoryProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
  isEdit?: boolean;
  defaultStartDate?: string | null;
  // When true (the very first slide for this section), the start date is locked
  // to the employee's joining date and shown read-only.
  lockStartDate?: boolean;
  // Date-picker bounds (YYYY-MM-DD) so the calendar disallows overlaps with the
  // neighbouring slides and any date before the joining date.
  startMinDate?: string;
  startMaxDate?: string;
  endMinDate?: string;
  endMaxDate?: string;
  // When the previous (older) slide is a locked previous-employee tile, the
  // start date can't move — render it read-only so only end date is editable.
  disableStartDate?: boolean;
  // While ADDING a slide the end date isn't editable: a new slide always becomes
  // the open ("Present") period, so the field is rendered read-only.
  disableEndDate?: boolean;
  initialEditData?: InitialEditData;
}

const EmploymentHistoryForm = ({
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
}: EmploymentHistoryProps) => {
  const [instance, setInstance] = useState<any>(null);
  const initialDataApplied = useRef(false);
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const [formValues, setFormValues] = useState({
    company: initialEditData?.company || "",
    department: initialEditData?.department || "",
    designation: initialEditData?.designation || "",
  });

  const { data: designationHierarchy, isLoading: designationHierarchyLoading } =
    useGetDesignationHierarchy(
      formValues.company || (isEdit ? "" : ""), // Initial fetch for companies
      formValues.department,
      formValues.designation,
    );
  const {
    mutateAsync: addEmployeeHistory,
    isPending: addEmployeeHistoryPending,
  } = useAddEmployeeHistoryMutation();
  const { wrap } = useLoadingOverlay();
  const {
    data: empDesignationHierarchyCurrentDetails,
    isLoading: empDesignationHierarchyCurrentDetailsPending,
  } = useGetEmpDesignationHierarchyCurrentDetails(
    currentEmployee?.employee || "",
    isEdit && !initialEditData,
  );

  // Update form options and initial values when data arrives
  useEffect(() => {
    if (!instance) return;

    const currentSubmission = instance.submission || { data: {} };
    const currentData = currentSubmission.data || {};
    let shouldUpdate = false;
    const newData = { ...currentData };

    // Handle hierarchy options
    if (designationHierarchy?.data) {
      const hierarchyData = designationHierarchy.data;
      if (
        JSON.stringify(hierarchyData.companies) !==
        JSON.stringify(currentData.companies) ||
        JSON.stringify(hierarchyData.departments) !==
        JSON.stringify(currentData.departments) ||
        JSON.stringify(hierarchyData.designations) !==
        JSON.stringify(currentData.designations) ||
        JSON.stringify(hierarchyData.functional_areas) !==
        JSON.stringify(currentData.functional_areas)
      ) {
        newData.companies = hierarchyData.companies || currentData.companies;
        newData.departments =
          hierarchyData.departments || currentData.departments;
        newData.designations =
          hierarchyData.designations || currentData.designations;
        newData.functional_areas =
          hierarchyData.functional_areas || currentData.functional_areas;
        shouldUpdate = true;
      }
    }

    // Handle initial edit data (only once) — wait for hierarchy options so
    // Form.io can resolve IDs to labels immediately
    if (isEdit && initialEditData && !initialDataApplied.current && designationHierarchy?.data) {
      newData.company = initialEditData.company;
      newData.department = initialEditData.department;
      newData.designation = initialEditData.designation;
      newData.functional_area = initialEditData.functional_area;
      newData.startDate = initialEditData.start_date;
      newData.endDate = initialEditData.end_date;
      newData.is_promotion = initialEditData.is_promotion;

      initialDataApplied.current = true;
      shouldUpdate = true;
    } else if (
      isEdit &&
      !initialEditData &&
      empDesignationHierarchyCurrentDetails?.data &&
      !initialDataApplied.current
    ) {
      const editData = empDesignationHierarchyCurrentDetails.data;
      newData.company = editData.company;
      newData.department = editData.department;
      newData.designation = editData.designation;
      newData.functional_area = editData.functional_area;
      newData.startDate = editData.start_date;

      setFormValues({
        company: editData.company,
        department: editData.department,
        designation: editData.designation,
      });

      initialDataApplied.current = true;
      shouldUpdate = true;
    } else if (!isEdit && !initialDataApplied.current) {
      // Initial empty values for new entry
      newData.company = "";
      newData.department = "";
      newData.designation = "";
      newData.functional_area = "";
      if (defaultStartDate) {
        newData.startDate = defaultStartDate;
      }
      initialDataApplied.current = true;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      // Use pristine: true option to prevent setSubmission from triggering validation
      instance.setSubmission({ data: newData }, { pristine: true }).then(() => {
        instance.setPristine(true);
        instance.clearErrors(); // Explicitly clear any existing errors
        instance.checkConditions();
        instance.redraw();
      });
    }
  }, [
    designationHierarchy,
    empDesignationHierarchyCurrentDetails,
    instance,
    isEdit,
    initialEditData,
  ]);

  // First slide for this section: render the start date read-only, locked to
  // the joining date. Baked into the schema (reliable for datetime widgets).
  const formSchema = useMemo(() => {
    let s = withComponentDisabled(
      employmentHistoryFormSchema,
      "startDate",
      (!!lockStartDate && !isEdit) || !!disableStartDate,
    );
    s = withDateBounds(s, "startDate", { minDate: startMinDate, maxDate: startMaxDate });
    s = withDateBounds(s, "endDate", { minDate: endMinDate, maxDate: endMaxDate });
    s = withComponentDisabled(s, "endDate", !!disableEndDate);
    return s;
  }, [lockStartDate, isEdit, disableStartDate, disableEndDate, startMinDate, startMaxDate, endMinDate, endMaxDate]);

  const validateForm = (data: any) => {
    if (!instance) return false;

    const requiredFields = [
      { key: "company", label: "Company" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "functional_area", label: "Functional Area" },
      { key: "startDate", label: "Start Date" },
    ];

    let isValid = true;
    requiredFields.forEach((field) => {
      const component = instance.getComponent(field.key);
      // Only validate if component exists and is visible
      if (component && component.visible) {
        if (!data[field.key]) {
          isValid = false;
          component.setCustomValidity(`${field.label} is required`);
        } else {
          component.setCustomValidity("");
        }
      } else if (component) {
        // Clear validity for hidden fields
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
      const submission = await instance.submit(); // Get raw data
      const data = submission?.data || {};

      // Perform manual validation
      const isValid = validateForm(data);

      if (!isValid) {
        toast.error("Please fill in all required fields.");
        return;
      }

      await wrap(
        () => addEmployeeHistory({
          company: data.company,
          department: data.department,
          designation: data.designation,
          start_date: data.startDate,
          to_date: data.endDate,
          functional_area: data.functional_area,
          is_promotion: data.is_promotion,
          mode: isEdit ? "update" : "new",
          // On edit, identify each field's existing row so the backend moves the
          // whole card in place (incl. start_date) rather than creating duplicates.
          ...(isEdit && initialEditData?.record_names
            ? { record_names: initialEditData.record_names }
            : {}),
        }),
        isEdit ? "Updating Employment History..." : "Adding Employment History...",
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
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Employment History
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
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-12 relative">
          {empDesignationHierarchyCurrentDetailsPending && !initialEditData && (
            <div className="absolute inset-0 z-30 flex justify-center items-center bg-white bg-opacity-70">
              <CircularLoader />
            </div>
          )}
          {designationHierarchyLoading &&
            instance &&
            initialDataApplied.current && (
              <div className="absolute top-2 right-6 z-40">
                <CircularLoader size="sm" color="blue-500" />
              </div>
            )}
          <Form
            form={formSchema}
            /** CRITICAL FIX: Do NOT pass submission prop */
            onFormReady={(form: any) => {
              setInstance(form);
              form.setPristine(true);

              form.on("change", (event: any) => {
                if (event.changed) {
                  const { company, department, designation } = event.data;
                  const changedKey = event.changed.component.key;

                  if (changedKey === "company") {
                    form
                      .getComponent("department")
                      ?.setValue("", { noValidate: true });
                    form
                      .getComponent("designation")
                      ?.setValue("", { noValidate: true });
                    form
                      .getComponent("functional_area")
                      ?.setValue("", { noValidate: true });
                    form.getComponent("department")?.setPristine(true);
                    form.getComponent("designation")?.setPristine(true);
                    form.getComponent("functional_area")?.setPristine(true);
                  } else if (changedKey === "department") {
                    form
                      .getComponent("designation")
                      ?.setValue("", { noValidate: true });
                    form
                      .getComponent("functional_area")
                      ?.setValue("", { noValidate: true });
                    form.getComponent("designation")?.setPristine(true);
                    form.getComponent("functional_area")?.setPristine(true);
                  } else if (changedKey === "designation") {
                    form
                      .getComponent("functional_area")
                      ?.setValue("", { noValidate: true });
                    form.getComponent("functional_area")?.setPristine(true);
                  }

                  setFormValues((prev) => {
                    if (
                      prev.company !== company ||
                      prev.department !== department ||
                      prev.designation !== designation
                    ) {
                      return { company, department, designation };
                    }
                    return prev;
                  });
                }
              });
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              clearOnSubmit: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col md:flex-row md:space-x-4",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
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
            disabled={addEmployeeHistoryPending}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmploymentHistoryForm;
