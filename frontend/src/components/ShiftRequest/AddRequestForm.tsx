/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";

import { useShiftTypes, useCreateShiftRequest } from "../../hooks/useShift";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import HeaderBar from "../HeaderBar";

import type { ShiftRequestFormData, FormioSubmission } from "../../types/shift";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import Button from "../shared/atoms/Button";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import defaultFormSchema from "./ShiftRequestFormSchema.json";
import { FormSchema, SchemaComponent } from "../Attendance/AttendanceRequest/AttendanceRequestFormV2";

interface ShiftRequestFormModalProps {
  onClose?: () => void;
}

const ShiftChangeForm: React.FC<ShiftRequestFormModalProps> = ({ onClose }) => {
  const { setRefetchAttendance } = useGlobalStore();

  const navigate = useNavigate();
  const formRef = useRef<any>(null);

  const { data: shiftTypes, isLoading, error } = useShiftTypes();
  const { mutate: createShiftRequest } = useCreateShiftRequest();
  const { data: employeeDetails } = useCurrentEmployee();

  const handleBack = () => navigate(-1);

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
            const asteriskHtml = "<span style='color:red;margin-left:3px;'> *</span>";
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


    const validatedFormSchema = useMemo(()=>transformSchemaWithRequired(
      defaultFormSchema,
      requiredFieldMap
    ),[requiredFieldMap]);

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

      createShiftRequest(payload, {
        onSuccess: () => {
          onClose?.();
          setTimeout(() => {
            setRefetchAttendance(true);
          }, 1000);
          navigate("/webapp/shift-request/shift-list");
        },
        onError: (error) => {
           const formatedError = errorResponseFormater(error, "Failed to submit Shift Request.");
            toast.error(formatedError);
            console.error(error);
        },
      });
    } catch (error: any) {
      console.error("Form submission failed:", error);

      if (error?.details) {
        console.error("Please fill all required fields.");
      } else {
        console.error("Something went wrong.");
      }
    }
  };

  if (isLoading) return <div>Loading shifts…</div>;
  if (error)
    return (
      <div className="text-red-600">Error loading shifts: {error.message}</div>
    );


  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <HeaderBar title="Shift Request Form" onBack={handleBack} />

      <div className="flex-1 p-4 overflow-y-auto">
        <Form
          form={validatedFormSchema}
          options={{ submitButton: false }}
          onFormReady={(instance: any) => {
            formRef.current = instance;
          }}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 z-50">
        <Button
          fullWidth
          onClick={handleSubmit}
          size="lg"
          bgColor="blue-600"
          className="hover:bg-blue-700"
        >
          Submit Request
        </Button>
      </div>
    </div>
  );
};

export default ShiftChangeForm;
