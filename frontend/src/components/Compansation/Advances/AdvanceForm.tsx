/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import {
  useCreateNewAdvance,
  useEmployeeAdvancesAmount,
  useEmployeeAdvanceUpdate,
  useGetEmployeeAdvanceDoc,
} from "../../../hooks/useEmployeeAdvances";

// ✅ Import JSON schema
import advanceFormJson from "./AdvanceFormio.json";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useRequiredFields } from "../../../hooks/useRequiredFields";
import { AttachmentPreviewVanillaV2 } from "../../Expenses-App/ExpenseClaim/AttachmentPreview";
import {
  FormSchema,
  SchemaComponent,
} from "../../Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { Typography } from "../../shared/atoms/Typography";
import { useLoadingOverlay } from "../../../context/OverlayContext";

interface AdvanceFormProps {
  docname?: string | null;
  user?: any;
  onClose?: () => void;
}

const AdvanceForm: React.FC<AdvanceFormProps> = ({
  docname,
  user,
  onClose,
}) => {
  const formAdvanceInstance = useRef<any>(null);
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is acting on another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || user?.employee;
  const { setRefetchAttendance } = useGlobalStore();
  const [attachments, setAttachments] = useState<File[]>([]);
  const { uploadFiles } = useFileUploader();
  const [selectedAdvanceType, setSelectedAdvanceType] = useState<string>();
  const [postingDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const { data: advanceAmountData } = useEmployeeAdvancesAmount(
    effectiveEmployee,
    selectedAdvanceType,
    postingDate,
    user?.company,
  );
  const mutateUpdate = useEmployeeAdvanceUpdate();
  const mutateCreate = useCreateNewAdvance();
  const mappedFormData = (advance: any) => {
    if (!advance) return null;

    const formData: Record<string, any> = {
      custom_advance_type: advance.custom_advance_type,
      advance_amount: advance.advance_amount,
      custom_repayment_type: advance.custom_repayment_type,
      repayment_method: advance.custom_repayment_methods,
      custom_repayment_start_date: advance.custom_repayment_start_date,
      repayment_periods: advance.custom_repayment_period_in_months,
      repayment_amount: advance.custom_monthly_repayment_amount,
      purpose: advance.purpose,
    };

    if (formData.custom_repayment_start_date) {
      formData.custom_repayment_start_date = new Date(
        formData.custom_repayment_start_date,
      )
        .toISOString()
        .split("T")[0];
    }

    return formData;
  };

  const { data: advance, isLoading: advanceLoading } = useGetEmployeeAdvanceDoc(
    docname ?? "",
  );
  useEffect(() => {
    const instance = formAdvanceInstance.current;

    if (!instance) return;
    if (advanceLoading) return;
    if (!advance) return;

    const mappedData = mappedFormData(advance);
    if (!mappedData) return;

    instance.setSubmission({
      data: mappedData,
    });

    // keep state in sync
    if (mappedData.custom_advance_type) {
      setSelectedAdvanceType(mappedData.custom_advance_type);
    }
  }, [advanceLoading, advance]);

  const { data: requiredFields } = useRequiredFields("Employee Advance");
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
          // ensure validate exists
          if (!comp.validate) comp.validate = {};
          // set required flag
          comp.validate.required = true;

          // Append red asterisk to label (avoid duplicating)
          if (typeof comp.label === "string") {
            const asteriskHtml =
              "<span style='color:red;margin-left:3px;'> *</span>";
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
            row.forEach((cell: any) => applyToComponents(cell.components)),
          );
        }
      });
    };

    applyToComponents(cloned.components);
    return cloned;
  };

  const trasnsformedSchema = useMemo(() => {
    return transformSchemaWithRequired(
      advanceFormJson as FormSchema,
      requiredFieldMap,
    );
  }, [requiredFieldMap]);

  /** ✅ Auto update Advance Amount when fetched */
  useEffect(() => {
    if (
      advanceAmountData &&
      formAdvanceInstance.current &&
      advanceAmountData?.amount &&
      selectedAdvanceType
    ) {
      const advanceAmountComponent =
        formAdvanceInstance.current.getComponent("advance_amount");
      if (advanceAmountComponent) {
        advanceAmountComponent.setValue(advanceAmountData.amount);
      }
    }
  }, [advanceAmountData, selectedAdvanceType]);

  const loading = useLoadingOverlay();
  /** ✅ Handle Submit */
  const handleSubmit = async () => {
    try {
      const submission = await formAdvanceInstance.current?.submit();
      const formData = submission?.data;

      if (!formData) {
        toast.error("Please fill all required fields.");
        return;
      }

      if (formData.custom_repayment_start_date) {
        formData.custom_repayment_start_date = new Date(
          formData.custom_repayment_start_date,
        )
          .toISOString()
          .split("T")[0];
      }

      const submissionData = {
        ...formData,
        custom_advance_type:
          selectedAdvanceType || formData.custom_advance_type,
        applicant_type: "Employee",
        company: user?.company,
        employee: effectiveEmployee,
        advance_account: advanceAmountData?.advance_account,
        exchange_rate: 1.0,
        custom_repayment_methods: formData.repayment_method || "",
        custom_repayment_period_in_months: formData.repayment_periods || 0,
        custom_monthly_repayment_amount: formData.repayment_amount || 0,
      };

      // ✅ Wrap only the mutate + file upload

      if (docname) {
        await loading?.wrap(async () => {
          await new Promise<void>((resolve, reject) => {
            mutateUpdate.mutate(
              { docname, data: submissionData },
              {
                onSuccess: async (data: any) => {
                  if (attachments?.length > 0) {
                    await uploadFiles(attachments, data.doctype, data.name);
                  }
                  toast.success("Advance Request updated successfully!");
                  onClose?.();
                  setTimeout(() => setRefetchAttendance(true), 2000);
                  resolve();
                },
                onError: (error: any) => {
                  console.error(error);
                  reject(error);
                },
              },
            );
          });
        }, "Submitting advance request…");

        return;
      }

      await loading?.wrap(async () => {
        await new Promise<void>((resolve, reject) => {
          mutateCreate.mutate(submissionData, {
            onSuccess: async (data: any) => {
              if (attachments?.length > 0) {
                await uploadFiles(attachments, data.doctype, data.name);
              }
              toast.success("Advance Request submitted successfully!");
              onClose?.();
              setTimeout(() => setRefetchAttendance(true), 2000);
              resolve();
            },
            onError: (error: any) => {
              console.error(error);
              reject(error);
            },
          });
        });
      }, "Submitting advance request…");
    } catch (err) {
      console.error("❌ Form submission error", err);
      const formatedError = errorResponseFormater(
        err,
        "Submission failed. Please try again.",
      );
      toast.error(formatedError);
    }
  };

  /**
   * Removing a file: click Form.io's own native remove control for that row
   * first (so its internal component state/validation stay in sync exactly
   * as if the user had used the native UI), then mirror the same removal
   * into local `attachments` state, which is what actually gets uploaded on
   * submit.
   */
  const removeAttachment = useCallback((index: number) => {
    const container = document.querySelector(".formio-component-attachments");
    if (container) {
      const removeButtons = container.querySelectorAll(
        'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times',
      );
      const target = removeButtons[index];
      if (target) (target as HTMLElement).click();
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCancel = useCallback(() => {
    if (formAdvanceInstance.current) {
      formAdvanceInstance.current.resetValue();
    }
    setAttachments([]);
    setSelectedAdvanceType(undefined);
    onClose?.();
  }, [onClose]);

  return (
    <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    onMouseDown={() => onClose?.()}
  >
        <div
      className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          {isDesktop ? (
            <div className="flex items-center mt-0.5 justify-between h-16">
              <Typography variant="subheading" color="body1">
                Request Advance
              </Typography>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2 py-4   bg-white sticky top-0 z-20">
              <h2 className="text-lg font-semibold text-gray-800">
                Request Advance
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Form
            key="advance-form"
            form={trasnsformedSchema}
            onFormReady={(instance: any) => {
              formAdvanceInstance.current = instance;

              // if advance already loaded before form was ready
              if (advance && !advanceLoading) {
                const mappedData = mappedFormData(advance);
                instance.setSubmission({ data: mappedData });

                if (mappedData?.custom_advance_type) {
                  setSelectedAdvanceType(mappedData.custom_advance_type);
                }
              }
            }}
            options={{ submitButton: false, noAlerts: true }}
            onChange={(submission: any) => {
              if (
                submission.data.custom_advance_type &&
                submission.data.custom_advance_type !== selectedAdvanceType
              ) {
                setSelectedAdvanceType(submission.data.custom_advance_type);
              }
              if (submission?.changed?.component?.key === "attachments")
                setAttachments((submission?.data?.attachments as any) || []);
            }}
          />

          {/* Lets an uploaded file be opened/previewed without submitting the
              form — same reusable panel the Expense Request form uses,
              injected right under Form.io's own "attachments" file widget. */}
          <AttachmentPreviewVanillaV2
            currentAttachments={attachments}
            onRemove={removeAttachment}
            compKey="attachments"
            heading="Attachments Preview"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-2.5">
        <div className=" flex flex-row md:flex-row gap-3 md:gap-4 md:justify-end">
          {!isDesktop && (
            <Button
              onClick={handleCancel}
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
            variant="contain"
            className="w-full md:w-auto min-w-[150px]"
          >
            {docname ? "Update" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdvanceForm;
