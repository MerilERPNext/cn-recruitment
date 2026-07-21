/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { toast } from "react-hot-toast";
import {
  useCreateShiftRequest,
  useUpdateShiftRequest,
  useShiftsForEmployees,
} from "../../hooks/useShift";
import { useAttendanceRequestAttachments } from "../../hooks/useAttendance";
import {
  useCurrentEmployeeDetails,
  useGetEmployeeDetailsByEmpId,
} from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import defaultFormSchema from "./ShiftRequestFormSchema.json";
import Button from "../shared/atoms/Button";
import { format } from "date-fns";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import { SchemaComponent } from "../Attendance/AttendanceRequest/AttendanceRequestFormV2";

import type {
  ShiftRequestFormData,
  FormioSubmission,
  ShiftRequest,
  ShiftTypeTuple,
} from "../../types/shift";
import { Formio } from "formiojs";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { useScreenSize } from "../../hooks/useScreenSize";
import { X } from "lucide-react";
import { useTargetUser } from "../../context/ViewedUserContext";

interface ShiftRequestFormModalProps {
  onClose: () => void;
  schema?: FormSchema;
  defaultShiftRequestData?: ShiftRequest;
  forActionType?: "create" | "edit";
  className?: string;
  isOpen?: boolean;
}

type FormSchema = typeof defaultFormSchema;

const ShiftRequestFormModal: React.FC<ShiftRequestFormModalProps> = ({
  className = "",
  onClose,
  isOpen = false,
  defaultShiftRequestData,
  schema: propSchema,
  forActionType,
}) => {
  const formRef = useRef<any>(null);
  const { setRefetchAttendance } = useGlobalStore();
  const [formSchema, setFormSchema] = useState<FormSchema>(
    (propSchema || defaultFormSchema) as FormSchema,
  );
  const { isDesktop } = useScreenSize();

  const { mutate: createShiftRequest } = useCreateShiftRequest();
  const { mutate: updateShiftRequest } = useUpdateShiftRequest();

  const {
    data: employeeDetails,
    isLoading: employeeLoading,
    error: employeeError,
  } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const loading = useLoadingOverlay(); // ✅ overlay hook
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee, isLoading: targetEmployeeLoading } =
    useGetEmployeeDetailsByEmpId(targetEmployeeId || "");
  const activeEmployee = isViewingOtherUser ? targetEmployee : employeeDetails;

  const { data: shiftTypesData, isLoading: shiftTypesLoading } =
    useShiftsForEmployees(activeEmployee?.name || "");
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

    if (!activeEmployee) {
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
      employee: activeEmployee.name,
      shift_request_approver: (activeEmployee as any)?.shift_request_approver,
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
                  errorResponseFormater(error, "Error updating shift request"),
                );
                reject(error);
              },
            },
          ),
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
                errorResponseFormater(error, "Error creating shift request"),
              );
              reject(error);
            },
          }),
        );
      }
    }, "Submitting shift request…"); // overlay message
  };

  const { data: requiredFields, isLoading: requiredFieldsLoading } = useRequiredFields("Shift Request");

  const attachmentQueryDate = useMemo(
    () => format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    [],
  );

  const { data: attachmentValidation } = useAttendanceRequestAttachments(
    activeEmployee?.name || "",
    attachmentQueryDate,
    "Shift Change Request",
  );

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
    requiredMap: Record<string, boolean>,
    validation?: any,
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

        // Add date validation limits
        if (comp.key === "fromDate" || comp.key === "toDate") {
          if (!comp.datePicker) comp.datePicker = {};
          if (validation?.allowed_from_date) {
            comp.datePicker.minDate = validation.allowed_from_date;
          }
          if (validation?.allowed_to_date) {
            comp.datePicker.maxDate = validation.allowed_to_date;
          }
          if (comp.key === "toDate" && validation?.to_date_read_only) {
            comp.disabled = true;
          }
        }

        if (comp.components) applyToComponents(comp.components);
        if (comp.columns) {
          comp.columns.forEach((col: any) => applyToComponents(col.components));
        }
        if (comp.rows) {
          comp.rows.forEach((row: any[]) =>
            row.forEach((cell: any) => applyToComponents(cell.components)),
          );
        }
      });
    };

    applyToComponents(cloned.components);
    return cloned;
  };

  useEffect(() => {
    if (propSchema) {
      setFormSchema(propSchema || defaultFormSchema);
    }
  }, [propSchema]);

  // Build static shift type options from the fetched list
  const shiftTypeValues = useMemo(() => {
    if (!shiftTypesData?.message) return [];

    return shiftTypesData.message.map((st: ShiftTypeTuple) => {
      const id = st[0];
      const name = st[1];
      const label = name && id ? `${name} (${id})` : (name || id || "");

      const fmtTime = (t: string) => {
        const parts = t?.split(":");
        return parts?.length >= 3 ? `${parts[0]}:${parts[1]}:${parts[2]}` : (t ?? "");
      };

      const start = fmtTime(st[4]);
      const end = fmtTime(st[5]);
      const timeStr = start && end ? `${start} - ${end}` : "";

      return {
        label: label,
        value: id,
        displayName: label,
        time: timeStr,
      };
    });
  }, [shiftTypesData]);

  // Inject static shift type values + custom template into the schema
  const schemaWithShiftTypes = useMemo(() => {
    const cloned = JSON.parse(JSON.stringify(formSchema));
    const shiftTypeComp = cloned.components?.find(
      (c: { key: string }) => c.key === "shiftType",
    );
    if (shiftTypeComp) {
      shiftTypeComp.data = { values: shiftTypeValues };
      shiftTypeComp.template =
        `<div><div>{{ item.displayName || item.label }}</div><div style="font-size:0.85em;color:#6b7280;margin-top:2px;">{{ item.time }}</div></div>`;
    }
    return cloned;
  }, [formSchema, shiftTypeValues]);

  const validatedSchema = useMemo(() => {
    return transformSchemaWithRequired(
      schemaWithShiftTypes,
      requiredFieldMap,
      attachmentValidation,
    );
  }, [schemaWithShiftTypes, requiredFieldMap, attachmentValidation]);
  if (!isOpen) return null;

  if (employeeLoading || targetEmployeeLoading || shiftTypesLoading || requiredFieldsLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="w-8 h-8 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-[100vw] h-[100vh] md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Request Shift Change
          </h2>
          {isDesktop && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto px-4 py-6 ${className}`}
        >
          <Form
            form={validatedSchema}
            onFormReady={(instance: Formio) => {
              formRef.current = instance;
            }}
            {...(defaultShiftRequestData
              ? {
                submission: {
                  data: {
                    fromDate: defaultShiftRequestData.from_date || new Date().toISOString(),
                    toDate: defaultShiftRequestData.to_date || new Date().toISOString(),
                    shiftType: defaultShiftRequestData.shift_type || "",
                  },
                },
              }
              : {})}
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

        {/* Footer */}
        <div className="sticky bottom-0 border-t shadow-lg py-4 px-4 w-full bg-white z-20">
          <div className="max-w-4xl mx-auto flex space-x-4 md:justify-end">
            {!isDesktop && (
              <Button
                onClick={onClose}
                size="md"
                variant="outline"
                className="w-full md:w-auto min-w-[150px]"
              >
                Cancel
              </Button>
            )}
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
    </div>
  );
};

export default ShiftRequestFormModal;
