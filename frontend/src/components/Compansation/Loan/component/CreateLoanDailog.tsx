/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import {
  useCreateNewLoanApplication,
  useGetLoanApplicationDoc,
  useLoanApplicationUpdate,
} from "../../../../hooks/useLoan";
import toast from "react-hot-toast";
import { CustomError } from "../../../../types/attendance";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";
import createLoanFormSchema from "./createLoanSchema.json";
import Button from "../../../shared/atoms/Button";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { useRequiredFields } from "../../../../hooks/useRequiredFields";
import {
  FormSchema,
  SchemaComponent,
} from "../../../Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useLoadingOverlay } from "../../../../context/OverlayContext";

interface CreateLoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  loanId?: string | null;
}

export default function CreateLoanDialog({
  loanId,
  isOpen,
  onClose,
}: CreateLoanDialogProps) {
  const { setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isDesktop } = useScreenSize();
  const mutation = useCreateNewLoanApplication();
  const formRef = useRef<any>(null);
  const { data: requiredFields } = useRequiredFields("Loan Application");
  const mutateLoan = useLoanApplicationUpdate();
  const { data: loan, isLoading: loanLoading } = useGetLoanApplicationDoc(
    loanId || "",
  );

  // Track if we've already set the initial submission
  const hasSetInitialData = useRef(false);

  // Map loan doc -> form submission data
  const mapLoanToFormData = (loanDoc: any) => {
    if (!loanDoc) return null;

    const formData: Record<string, any> = {
      loan_product: loanDoc.loan_product,
      loan_amount: loanDoc.loan_amount,
      repayment_method: loanDoc.repayment_method,
      repayment_amount: loanDoc.repayment_amount,
      repayment_periods: loanDoc.repayment_periods,
      description: loanDoc.description,
      // include any additional fields you expect the form to have:
    };

    const rawStart =
      loanDoc.custom_repayment_start_date ?? loanDoc.custom_repayment_start;
    if (rawStart) {
      try {
        formData.custom_repayment_start_date = new Date(rawStart)
          .toISOString()
          .split("T")[0];
      } catch (e) {
        console.log("Error auto filling form", e);
        formData.custom_repayment_start_date = rawStart;
      }
    }

    return formData;
  };

  // Reset the flag when loanId or dialog state changes
  useEffect(() => {
    hasSetInitialData.current = false;
  }, [loanId, isOpen]);

  const requiredFieldMap = useMemo(() => {
    if (!requiredFields?.fields) return {};
    const map: Record<string, boolean> = {};
    requiredFields.fields.forEach((f) => {
      if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    return map;
  }, [requiredFields]);

  const transformSchemaWithRequired = (
    baseSchema: FormSchema,
    requiredMap: Record<string, boolean>,
  ): FormSchema => {
    if (!baseSchema) return baseSchema;

    // deep clone
    const cloned = JSON.parse(JSON.stringify(baseSchema)) as FormSchema;

    const applyToComponents = (components?: SchemaComponent[]) => {
      if (!components) return;
      components.forEach((comp) => {
        const key = comp.key;
        if (key && requiredMap[key]) {
          if (!comp.validate) comp.validate = {};
          comp.validate.required = true;

          // Append red asterisk to label (avoid duplicating)
          if (typeof comp.label === "string") {
            const asteriskHtml = " *";
            if (!comp.label.includes(asteriskHtml)) {
              comp.label = `${comp.label} ${asteriskHtml}`;
            }
          }
        }

        // recurse into nested components (panels, columns, containers)
        if (comp.components && Array.isArray(comp.components)) {
          applyToComponents(comp.components);
        }
        if (comp.columns && Array.isArray(comp.columns)) {
          comp.columns.forEach((col: any) => applyToComponents(col.components));
        }
        if (comp.rows && Array.isArray(comp.rows)) {
          comp.rows.forEach((row: any[]) =>
            row.forEach((cell: any) => applyToComponents(cell.components)),
          );
        }
      });
    };

    applyToComponents(cloned.components);
    return cloned;
  };

  const transformedSchema = useMemo(() => {
    return transformSchemaWithRequired(
      createLoanFormSchema as FormSchema,
      requiredFieldMap,
    );
  }, [requiredFieldMap]);

  const loading = useLoadingOverlay();

  const handleSubmit = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data;

      const submissionData = {
        ...formData,
        company: currentEmployee?.company,
        applicant_type: "Employee",
        applicant: currentEmployee?.employee,
      };

      if (loan) {
        await loading?.wrap(async () => {
          await new Promise<void>((resolve, reject) => {
            mutateLoan.mutate(
              { docname: loanId || "", data: submissionData },
              {
                onSuccess: async () => {
                  toast.success("Loan Request updated successfully!");
                  onClose?.();
                  setTimeout(() => setRefetchAttendance(true), 2000);
                  resolve();
                },
                onError: (error: any) => {
                  const formatedError = errorResponseFormater(
                    error,
                    "Update failed. Please try again.",
                  );
                  toast.error(formatedError);
                  console.error(error);
                  reject(error);
                },
              },
            );
          });
        }, "Updating loan request…");

        return;
      }

      await loading?.wrap(async () => {
        await new Promise<void>((resolve, reject) => {
          mutation.mutate(submissionData as Record<string, any>, {
            onSuccess: () => {
              onClose();
              setTimeout(() => setRefetchAttendance(true), 2000);
              toast.success("Added Loan Request successfully!");
              resolve();
            },
            onError: (error: CustomError) => {
              const formatedError = errorResponseFormater(
                error,
                "Submission failed. Please try again.",
              );
              toast.error(formatedError);
              console.error(error);
              reject(error);
            },
          });
        });
      }, "Submitting loan request…");
    } catch (error) {
      console.error("Error submitting loan:", error);
    }
  };

  /**
   * attemptSetSubmission:
   * - tries until both form instance is available and (if applicable) component options are loaded.
   * - coerces mapped value types to match the first option where necessary.
   * - marks hasSetInitialData.current so it runs only once.
   */
  const attemptSetSubmission = (instanceParam?: any) => {
    if (hasSetInitialData.current) return;
    const instance = instanceParam ?? formRef.current;
    if (!loan || loanLoading) return;

    let attempts = 0;
    const maxAttempts = 20;
    const intervalMs = 200;

    const trySet = () => {
      attempts += 1;
      const inst = instance ?? formRef.current;

      if (!inst) {
        if (attempts < maxAttempts) {
          setTimeout(trySet, intervalMs);
        } else {
          console.warn("Form instance not found; aborting auto-fill attempt.");
        }
        return;
      }

      const mappedData = mapLoanToFormData(loan) || {};

      // Inspect loan_product component to see if options are present
      let comp: any = null;
      try {
        comp = inst.getComponent ? inst.getComponent("loan_product") : null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.log("error auto filling form", e);
        comp = null;
      }

      const staticValues =
        comp?.data?.values ||
        comp?.component?.data?.values ||
        (Array.isArray(comp?.selectOptions) && comp?.selectOptions) ||
        null;

      const isUrlSource =
        comp?.data?.dataSrc === "url" ||
        comp?.component?.data?.dataSrc === "url" ||
        comp?.dataSrc === "url";

      const hasOptions = !!staticValues || !isUrlSource;

      if (hasOptions) {
        // Coerce mapped loan_product to match option type if needed
        if (
          staticValues &&
          staticValues.length > 0 &&
          mappedData.loan_product != null
        ) {
          const firstVal = staticValues[0].value;
          const mappedVal = mappedData.loan_product;
          if (typeof firstVal === "number" && typeof mappedVal === "string") {
            const maybeNum = Number(mappedVal);
            if (!Number.isNaN(maybeNum)) mappedData.loan_product = maybeNum;
          } else if (
            typeof firstVal === "string" &&
            typeof mappedVal === "number"
          ) {
            mappedData.loan_product = String(mappedVal);
          }
        }

        // finally set submission
        try {
          inst.setSubmission({
            data: {
              company: currentEmployee?.company,
              ...mappedData,
            },
          });
          hasSetInitialData.current = true;
          console.debug("Auto-filled form with loan data", mappedData);
        } catch (err) {
          console.warn("setSubmission failed, retrying...", err);
          if (attempts < maxAttempts) setTimeout(trySet, intervalMs);
          else {
            // fallback
            try {
              inst.setSubmission({
                data: {
                  company: currentEmployee?.company,
                  ...mappedData,
                },
              });
              hasSetInitialData.current = true;
            } catch (err2) {
              console.error("Fallback setSubmission also failed:", err2);
            }
          }
        }
        return;
      }

      // if not ready, retry until maxAttempts then fallback
      if (attempts < maxAttempts) {
        setTimeout(trySet, intervalMs);
      } else {
        console.warn(
          "Options did not load in time — setting submission anyway (fallback).",
        );
        try {
          inst.setSubmission({
            data: {
              company: currentEmployee?.company,
              ...mappedData,
            },
          });
          hasSetInitialData.current = true;
        } catch (err) {
          console.error("Fallback setSubmission failed:", err);
        }
      }
    };

    trySet();
  };

  // When the form instance becomes ready
  const onFormReady = (instance: any) => {
    formRef.current = instance;
    // Try to set submission immediately (covers case when loan already arrived)
    attemptSetSubmission(instance);
  };

  // When loan data arrives or updates, try to apply it (covers case when form already ready)
  useEffect(() => {
    if (!loan || loanLoading) return;
    attemptSetSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan, loanLoading, currentEmployee?.company]);

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
        {isDesktop ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <h2 className=" base-title text-gray-900">Request Loan</h2>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <h2 className="text-lg font-semibold text-gray-800">
              Request Loan
            </h2>
          </div>
        )}

        {/* Dialog Content */}
        <div className="flex-1 min-h-0 bg-white overflow-y-auto pb-20">
          {currentEmployee?.company && (
            <Form form={transformedSchema} onFormReady={onFormReady} />
          )}
        </div>
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <div className=" mx-auto flex flex-row md:flex-row gap-3 md:gap-4 md:justify-end">
            {!isDesktop && (
              <Button onClick={onClose} fullWidth size="md" variant="outline">
                Cancel
              </Button>
            )}
            <Button
              onClick={() => {
                handleSubmit();
              }}
              fullWidth
              size="md"
              variant="contain"
              className="w-full md:w-auto min-w-[150px]"
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
