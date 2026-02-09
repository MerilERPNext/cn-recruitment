/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { toast } from "react-hot-toast";
import {
  useCreateShiftRequest,
  useUpdateShiftRequest,
} from "../../hooks/useShift";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import defaultFormSchema from "./ShiftRequestFormSchema.json";
import Button from "../shared/atoms/Button";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import { SchemaComponent } from "../Attendance/AttendanceRequest/AttendanceRequestFormV2";


import type {
  ShiftRequestFormData,
  FormioSubmission,
  ShiftRequest,
} from "../../types/shift";
import { Formio } from "formiojs";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { useScreenSize } from "../../hooks/useScreenSize";

interface ShiftRequestFormModalProps {
  onClose?: () => void;
  schema?: FormSchema;
  defaultShiftRequestData?: ShiftRequest;
  forActionType?: "create" | "edit";
  className?: string;
}

type FormSchema = typeof defaultFormSchema;

const ShiftRequestFormModal: React.FC<ShiftRequestFormModalProps> = ({
  className = "",
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
    const { isDesktop } = useScreenSize();

  const { mutate: createShiftRequest } = useCreateShiftRequest();
  const { mutate: updateShiftRequest } = useUpdateShiftRequest();
  const {
    data: employeeDetails,
    isLoading: employeeLoading,
    error: employeeError,
  } = useCurrentEmployee();

  const loading = useLoadingOverlay(); // ✅ overlay hook

  const handleSubmitonSuccess = () => {
    onClose?.();
    setTimeout(() => {
      setRefetchAttendance(true);
    }, 1000);
  };

  const handleSubmitionError = (message: string, error: any) => {
    console.error(message, error);
  };

  // ✅ handleSubmit wrapped in LoadingOverlay
  const handleSubmit = async () => {
    if (!formRef.current) {
      toast.error("Form not ready yet.");
      return;
    }

    // 1️⃣ Submit the form normally
    let submission: FormioSubmission<ShiftRequestFormData>;
    try {
      submission = await formRef.current.submit();
    } catch (formError) {
      console.error("Form submission error:", formError);
      toast.error("Please check your form inputs and try again.");
      return;
    }

    const { shiftType, fromDate, toDate, reason } = submission.data;

    if (!employeeDetails) {
      toast.error("Employee details not loaded. Try again.");
      console.log(employeeError, "Employee details not fetched.");
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
      reason,
      status: "Draft",
      employee: employeeDetails.name,
      shift_request_approver: employeeDetails.shift_request_approver,
    };

    // 2️⃣ Wrap only the network mutation inside the overlay
    await loading?.wrap(async () => {
      if (forActionType === "edit" && defaultShiftRequestData?.name) {
        await new Promise<void>((resolve, reject) =>
          updateShiftRequest(
            {
              doctype: defaultShiftRequestData.doctype,
              name: defaultShiftRequestData.name,
              data: payload,
            },
            {
              onSuccess: () => {
                handleSubmitonSuccess();
                resolve();
              },
              onError: (error: any) => {
                handleSubmitionError("Error updating shift request:", error);
                toast.error(
                  errorResponseFormater(error, "Error updating shift request")
                );
                reject(error);
              },
            }
          )
        );
      } else {
        await new Promise<void>((resolve, reject) =>
          createShiftRequest(payload, {
            onSuccess: () => {
              handleSubmitonSuccess();
              resolve();
            },
            onError: (error: any) => {
              handleSubmitionError("Error creating shift request:", error);
              toast.error(
                errorResponseFormater(error, "Error creating shift request")
              );
              reject(error);
            },
          })
        );
      }
    }, "Submitting shift request…"); // overlay message
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

  useEffect(() => {
    if (propSchema) {
      setFormSchema(propSchema);
    }
  }, [propSchema]);

  const validatedSchema = useMemo(() => {
    return transformSchemaWithRequired(formSchema, requiredFieldMap);
  }, [formSchema, requiredFieldMap]);

  if (employeeLoading) {
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
      </div>
    );
  }

  return (
    <div className={`bg-white flex flex-col font-sans  ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6  flex-grow w-full">
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

      <div className="sticky bottom-0  border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4 md:justify-end">
         {!isDesktop && ( <Button
            onClick={onClose}
            size="md"
            variant="outline"
            className="w-full md:w-auto min-w-[150px]"
          >
            Cancel
          </Button>)}
          <Button
            onClick={handleSubmit}
            size="md"
            className="w-full md:w-auto min-w-[150px]"
          >
            Submit 
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShiftRequestFormModal;
