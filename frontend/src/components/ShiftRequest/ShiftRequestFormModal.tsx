/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { toast } from "react-hot-toast";
import {
  useCreateShiftRequest,
  useUpdateShiftRequest,
} from "../../hooks/useShift";
import { useCurrentEmployee } from "../../hooks/useEmployee";

import type {
  ShiftRequestFormData,
  FormioSubmission,
  ShiftRequest,
} from "../../types/shift";
import { Formio } from "formiojs";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import defaultFormSchema from "./ShiftRequestFormSchema.json";
import Button from "../shared/atoms/Button";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import { SchemaComponent } from "../Attendance/AttendanceRequest/AttendanceRequestFormV2";

interface ShiftRequestFormModalProps {
  onClose?: () => void;
  schema?: FormSchema;
  defaultShiftRequestData?: ShiftRequest;
  forActionType?: "create" | "edit";
}

type FormSchema = typeof defaultFormSchema;

const ShiftRequestFormModal: React.FC<ShiftRequestFormModalProps> = ({
  onClose,
  defaultShiftRequestData,
  schema: propSchema,
  forActionType,
}) => {
  const formRef = useRef<any>(null);
  const { setRefetchAttendance } = useGlobalStore();
  const [formSchema, setFormSchema] = useState<FormSchema>(
    (propSchema || defaultFormSchema) as FormSchema
  );

  const { mutate: createShiftRequest } = useCreateShiftRequest();
  const { mutate: updateShiftRequest } = useUpdateShiftRequest();
  const {
    data: employeeDetails,
    isLoading: employeeLoading,
    error: employeeError,
  } = useCurrentEmployee();

  const isLoading = employeeLoading;
  const error = employeeError;
  const handleSubmitonSuccess = () => {
    onClose?.();
    setTimeout(() => {
      setRefetchAttendance(true);
    }, 1000);
  };

  const handleSubmitionError = (message: string, error: any) => {
    console.error(message, error);
  };

  const handleSubmit = async () => {
    if (!formRef.current) {
      toast.error("Form not ready yet.");
      return;
    }

    try {
      const submission: FormioSubmission<ShiftRequestFormData> =
        await formRef.current.submit();

      const { shiftType, fromDate, toDate, reason } = submission.data;

      if (!employeeDetails) {
        toast.error("Employee details not loaded. Try again.");
        console.log(error, "Employee details not fetched.");
        return;
      }

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const payload = {
        shift_type: shiftType,
        from_date: formatDate(fromDate),
        to_date: formatDate(toDate),
        reason: reason,
        status: "Draft",
        employee: employeeDetails.name,
        shift_request_approver: employeeDetails.shift_request_approver,
      };

      if (forActionType === "edit" && defaultShiftRequestData?.name) {
        updateShiftRequest(
          {
            doctype: defaultShiftRequestData.doctype,
            name: defaultShiftRequestData.name,
            data: payload,
          },
          {
            onSuccess: handleSubmitonSuccess,
            onError: (error: any) => {
              handleSubmitionError("Error updating shift request:", error);
              const formatedError = errorResponseFormater(
                error,
                "Error updating shift request"
              );
              toast.error(formatedError);
            },
          }
        );
      } else {
        createShiftRequest(payload, {
          onSuccess: handleSubmitonSuccess,
          onError: (error: any) => {
            handleSubmitionError("Error creating shift request:", error);
            const formatedError = errorResponseFormater(
              error,
              "Error creating shift request"
            );
            toast.error(formatedError);
          },
        });
      }
    } catch (formError) {
      console.error("Form submission error:", formError);
      toast.error("Please check your form inputs and try again.");
    }
  };

  const { data: requiredFields } = useRequiredFields("Shift Request");
  const requiredFieldMap = useMemo(() => {
    if (!requiredFields?.fields) return {};
    const map: Record<string, boolean> = {};
    requiredFields.fields.forEach((f) => {
      if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    return map;
  }, [requiredFields]);

  console.log("requiredFieldMap", requiredFieldMap);

  /**
   * Helper: deep clone schema and apply required flags + label postfix for required fields
   */
  const toSnakeCase = (str: string) =>
    str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/\s+/g, "_")
      .toLowerCase();

  const transformSchemaWithRequired = (
    baseSchema: FormSchema,
    requiredMap: Record<string, boolean>
  ): FormSchema => {
    if (!baseSchema) return baseSchema;

    const cloned = JSON.parse(JSON.stringify(baseSchema)) as FormSchema;

    // Detect if this form is shiftType (adjust according to your schema)
    const applyToComponents = (components?: SchemaComponent[]) => {
      if (!components) return;

      components.forEach((comp) => {
        if (!comp) return;

        let key = comp.key;
        if (typeof key === "string") {
          key = toSnakeCase(key);
        }

        if (key && requiredMap[key]) {
          if (!comp.validate) comp.validate = {};
          comp.validate.required = true;

          if (typeof comp.label === "string") {
            const asteriskHtml =
              "<span style='color:red;margin-left:3px;'> *</span>";
            if (!comp.label.includes(asteriskHtml)) {
              comp.label = `${comp.label} ${asteriskHtml}`;
            }
          }
        }

        // Recurse inside nested components
        if (comp.components) applyToComponents(comp.components);
        if (comp.columns) {
          comp.columns.forEach((col: any) => applyToComponents(col.components));
        }
        if (comp.rows) {
          comp.rows.forEach((row: any[]) =>
            row.forEach((cell: any) => applyToComponents(cell.components))
          );
        }
      });
    };

    applyToComponents(cloned.components);
    return cloned;
  };

  // Update schema when propSchema changes
  useEffect(() => {
    if (propSchema) {
      setFormSchema(propSchema);
    }
  }, [propSchema]);

  const validatedSchema = useMemo(() => {
    return transformSchemaWithRequired(formSchema, requiredFieldMap);
  }, [formSchema, requiredFieldMap]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 flex flex-col font-sans">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button
              disabled
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-400 font-medium cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              disabled
              className="flex-1 py-3 rounded-lg bg-gray-400 text-white font-medium cursor-not-allowed"
            >
              Loading...
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col font-sans">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <Form
            form={validatedSchema}
            onFormReady={(instance: Formio) => {
              formRef.current = instance;
            }}
            submission={{
              data: {
                fromDate:
                  defaultShiftRequestData?.from_date ||
                  new Date().toISOString(),
                toDate:
                  defaultShiftRequestData?.to_date || new Date().toISOString(),
                shiftType: defaultShiftRequestData?.shift_type || "",
              },
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
            className="space-y-6"
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <Button
            onClick={onClose}
            size="md"
            variant="outline"
            bgColor="gray-300"
            className="flex-1 border text-gray-700 hover:bg-gray-50 font-medium py-3"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            size="md"
            variant="contain"
            bgColor={"blue-600"}
            textColor="white"
            className={"hover:bg-blue-700 flex-1 font-medium"}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShiftRequestFormModal;
