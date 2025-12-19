/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCreateNewLoanApplication } from "../../../../hooks/useLoan";
import toast from "react-hot-toast";
import { CustomError } from "../../../../types/attendance";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";
import createLoanFormSchema from "./createLoanSchema.json";
import Button from "../../../shared/atoms/Button";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { useRequiredFields } from "../../../../hooks/useRequiredFields";
import { FormSchema, SchemaComponent } from "../../../Attendance/AttendanceRequest/AttendanceRequestFormV2";

interface CreateLoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLoanDialog({
  isOpen,
  onClose,
}: CreateLoanDialogProps) {
  const { setRefetchAttendance } = useGlobalStore();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || ""
  );
  const mutation = useCreateNewLoanApplication();
  const formRef = useRef<any>(null);

  const { data: requiredFields } = useRequiredFields("Loan Application");
    const requiredFieldMap = useMemo(() => {
      if (!requiredFields?.fields) return {};
      const map: Record<string, boolean> = {};
      requiredFields.fields.forEach((f) => {
        if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
      });
      return map;
    }, [requiredFields]);
  
    console.log("requiredFieldMap", requiredFieldMap);

    const transformSchemaWithRequired = (
        baseSchema: FormSchema,
        requiredMap: Record<string, boolean>
      ): FormSchema => {
        if (!baseSchema) return baseSchema;
        // deep clone
        const cloned = JSON.parse(JSON.stringify(baseSchema)) as FormSchema;
    
        const applyToComponents = (components?: SchemaComponent[]) => {
          if (!components) return;
          components.forEach((comp) => {
            const key = comp.key;
            if (key && requiredMap[key]) {
              // ensure validate exists
              if (!comp.validate) comp.validate = {};
              // set required flag
              comp.validate.required = true;
    
              // Append red asterisk to label (avoid duplicating)
              if (typeof comp.label === "string") {
                const asteriskHtml = "<span style='color:red;margin-left:3px;'> *</span>";
                if (!comp.label.includes(asteriskHtml)) {
                  // Some labels may include HTML already; we append the asterisk HTML
                  comp.label = `${comp.label} ${asteriskHtml}`;
                }
              }
            }
            // recurse into nested components (like panels, columns, containers)
            if (comp.components && Array.isArray(comp.components)) {
              applyToComponents(comp.components);
            }
            // some schema use nested components in 'columns' or 'rows' etc - handle common cases
            if (comp.columns && Array.isArray(comp.columns)) {
              comp.columns.forEach((col: any) => applyToComponents(col.components));
            }
            if (comp.rows && Array.isArray(comp.rows)) {
              comp.rows.forEach((row: any[]) =>
                row.forEach((cell: any) => applyToComponents(cell.components))
              );
            }
          });
        };
    
        applyToComponents(cloned.components);
        return cloned;
      };
    
    const transformedSchema = useMemo(() => {
      return transformSchemaWithRequired(createLoanFormSchema as FormSchema, requiredFieldMap);
    }, [requiredFieldMap]);

  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();
    const formData = submission?.data;
    const submissionData = {
      ...formData,
      company: currentEmployee?.company,
      applicant_type: "Employee",
      applicant: currentEmployee?.employee,
    };
    mutation.mutate(submissionData as Record<string, unknown>, {
      onSuccess: () => {
        onClose();
        setTimeout(() => {
          setRefetchAttendance(true);
        }, 2000);

        toast.success("Added Loan Request successfully!");
      },
      onError: (error: CustomError) => {
         const formatedError = errorResponseFormater(error, "Submission failed. Please try again.");
          toast.error(formatedError);
          console.error(error);
      },
    });

    // Call API here
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={() => {
        if (onClose) {
          onClose();
        }
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className=" base-title text-gray-900">
            Create New Loan
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <Form
            form={transformedSchema}
            options={{
              submitButton: false,
            }}
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
          />
        </div>
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <Button
            onClick={() => {
              handleSubmit();
            }}
            fullWidth
            size="lg"
            variant="contain"
            bgColor={"blue-600"}
            textColor="white"
            className={"hover:bg-blue-700 font-medium"}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
