import { useQueryClient } from "@tanstack/react-query";
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import {
  useGetBenefitDoc,
  useUpdateBenefitDoc,
} from "../../../hooks/useBenefit";
import { useNewBenifitRequest } from "../../../hooks/useBenifits";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useRequiredFields } from "../../../hooks/useRequiredFields";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CustomError } from "../../../types/attendance";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import {
  FormSchema,
  SchemaComponent,
} from "../../Attendance/AttendanceRequest/AttendanceRequestFormV2";
import Button from "../../shared/atoms/Button";
import CircularLoader from "../../shared/atoms/CircularLoader";
import benefitRequestFormSchema from "./benefitRequestFormSchema.json";

interface BenefitRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  docname?: string | null;
}

export default function BenefitRequestForm({
  isOpen,
  onClose,
  onSuccess,
  docname,
}: BenefitRequestFormProps) {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || "",
  );
  const { data: benefitClaim, isLoading: benefitClaimLoading } =
    useGetBenefitDoc(docname || "");

  // map incoming benefit (server) -> form field keys

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedFormData = (benefit: any) => {
    if (!benefit) return null;
    return {
      earning_component: benefit.earning_component,
      claimed_amount: benefit.claimed_amount,
      custom_note_by_employee: benefit.custom_note_by_employee,
      // add more mapped fields here if benefit has other values
    };
  };

  const [attachments, setAttachments] = useState<File[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);

  const { uploadFiles, loading: fileUploadLoading } = useFileUploader();
  const mutation = useNewBenifitRequest();
  const mutateUpdate = useUpdateBenefitDoc();
  const queryClient = useQueryClient();

  // Determine if we have all data needed to render the form
  const isEditing = !!docname;
  const isFormDataReady = isEditing
    ? !!currentEmployee?.employee && !benefitClaimLoading
    : !!currentEmployee?.employee;

  // Build the initial submission with ALL data upfront so Form.io gets it on mount
  const initialSubmission = useMemo(() => {
    const baseData: Record<string, unknown> = {
      currentEmployeeId: currentEmployee?.employee || "",
      claimDate: formatToIndianDate(new Date()),
    };

    // When editing, merge in saved benefit claim data
    const mappedData = mappedFormData(benefitClaim);
    if (mappedData) {
      Object.assign(baseData, mappedData);
    }

    return { data: baseData };
  }, [currentEmployee, benefitClaim]);

  const { data: requiredFields } = useRequiredFields("Employee Benefit Claim");
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
    const cloned = JSON.parse(JSON.stringify(baseSchema)) as FormSchema;

    const applyToComponents = (components?: SchemaComponent[]) => {
      if (!components) return;
      components.forEach((comp) => {
        const key = comp.key;
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
        if (comp.components && Array.isArray(comp.components)) {
          applyToComponents(comp.components);
        }
        if (comp.columns && Array.isArray(comp.columns)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          comp.columns.forEach((col: any) => applyToComponents(col.components));
        }
        if (comp.rows && Array.isArray(comp.rows)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          comp.rows.forEach((row: any[]) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      benefitRequestFormSchema as FormSchema,
      requiredFieldMap,
    );
  }, [requiredFieldMap]);

  const loading = useLoadingOverlay();

  // Form submission handler
  const handleSubmit = async () => {
    try {
      const submission = await formRef.current?.submit();
      if (!submission?.data) {
        toast.error("Failed to submit form. Please try again.");
        return;
      }

      const submissionData = {
        employee: currentEmployee?.employee,
        claim_date: new Date().toISOString().split("T")[0],
        earning_component: submission.data.earning_component,
        custom_note_by_employee: submission.data.custom_note_by_employee,
        claimed_amount: submission.data.claimed_amount,
        custom_max_amount: submission.data.custom_max_amount,
        custom_payroll_period: submission?.data?.custom_payroll_period,
      };

      if (isEditing && docname) {
        // Update existing benefit claim
        loading?.show("Updating Benefit Request");
        mutateUpdate.mutate(
          { docname, data: submissionData as Record<string, unknown> },
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSuccess: async (data: any) => {
              if (attachments.length > 0) {
                await uploadFiles(
                  attachments,
                  data.doctype ?? "Employee Benefit Claim",
                  data.name ?? docname,
                );
              }
              onClose();
              onSuccess();
              queryClient.invalidateQueries({
                queryKey: ["mybenefit-request"],
              });
              toast.success("Benefit Request updated successfully!");
            },
            onError: (error: CustomError) => {
              const message = errorResponseFormater(
                error,
                "Something went wrong!!",
              );
              toast.error(message);
              console.error(error);
            },
            onSettled: () => {
              loading?.hide();
            },
          },
        );
      } else {
        // Create new benefit claim
        loading?.show("Submitting Benefit Request");
        mutation.mutate(submissionData as Record<string, unknown>, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSuccess: async (data: any) => {
            if (attachments.length > 0) {
              await uploadFiles(attachments, data.doctype, data.name);
            }
            onClose();
            onSuccess();
            queryClient.invalidateQueries({ queryKey: ["mybenefit-request"] });
            toast.success("Added Benefit Request successfully!");
          },
          onError: (error: CustomError) => {
            const message = errorResponseFormater(
              error,
              "Something went wrong!!",
            );
            toast.error(message);
            console.error(error);
          },
          onSettled: () => {
            loading?.hide();
          },
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Something went wrong while submitting the form.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
        <h2 className="text-lg font-semibold text-gray-800">
          {isEditing ? "Edit Benefit Claim" : "Request Benefit Claim"}
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

      {/* Form Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0 px-6">
        {isFormDataReady ? (
          <Form
            form={transformedSchema}
            submission={initialSubmission}
            options={{
              submitButton: false,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formRef.current = instance;
              // Reinforce submission with the complete initial data
              instance.setSubmission(initialSubmission);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(submission: any) => {
              // attachments component key may vary; adjust if your form uses different key
              if (submission.changed?.component?.key === "attachments") {
                setAttachments(submission?.data?.attachments || []);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center py-10">
            <CircularLoader />
          </div>
        )}
      </div>

      {/* Bottom Button Bar */}
      <div className="border-gray-200 border-t py-3 px-2 flex flex-row gap-3 md:justify-end">
        {!isDesktop && (
          <Button
            onClick={onClose}
            size="md"
            variant="outline"
            className="w-full md:w-auto min-w-[150px] md:px-4 md:py-2.5 rounded-md font-brand"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          size="md"
          variant="contain"
          bgColor="primary"
          className="w-full md:w-auto min-w-[150px] md:px-4 md:py-2.5 rounded-md font-brand"
        >
          {fileUploadLoading || mutation.isPending || mutateUpdate.isPending
            ? "Processing..."
            : isEditing
              ? "Update Request"
              : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}
