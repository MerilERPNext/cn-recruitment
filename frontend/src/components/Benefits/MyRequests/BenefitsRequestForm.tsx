import { useRef, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useNewBenifitRequest } from "../../../hooks/useBenifits";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import benefitRequestFormSchema from "./benefitRequestFormSchema.json";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useFileUploader } from "../../../hooks/useFileUploader";
import CircularLoader from "../../shared/atoms/CircularLoader";
import {
  FormSchema,
  SchemaComponent,
} from "../../Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { useRequiredFields } from "../../../hooks/useRequiredFields";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useGetBenefitDoc, useUpdateBenefitDoc } from "../../../hooks/useBenefit";

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
  const mapedFormData = (benefit: any) => {
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
    const mappedData = mapedFormData(benefitClaim);
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

  // Utility: normalize attachments returned by form to File[] where possible.
  // Form.io file component often returns objects (with url/name), not File instances.
  const normalizeAttachmentsFromSubmission = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maybeAttachments: any,
  ): File[] => {
    if (!maybeAttachments) return [];
    // if already File[] (browser File objects), return them
    if (
      Array.isArray(maybeAttachments) &&
      maybeAttachments.every((a) => a instanceof File)
    ) {
      return maybeAttachments;
    }
    // if objects from form.io (with url/name), we can't turn them into File without download.
    // So return an empty array or keep the original objects (adjust to your uploader).
    // For now we keep an empty array so submit doesn't break; update uploader if you expect server-file references.
    return [];
  };

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
                await uploadFiles(attachments, data.doctype ?? "Employee Benefit Claim", data.name ?? docname);
              }
              onClose();
              onSuccess();
              queryClient.invalidateQueries({ queryKey: ["mybenefit-request"] });
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isDesktop ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
            <h2 className="text-xl font-semibold">{isEditing ? "Edit Benefit Claim" : "Request Benefit Claim"}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X />
            </button>
          </div>
        ) : (
          <HeaderBar title={isEditing ? "Edit Benefit Claim" : "Request Benefit Claim"} onBack={onClose} />
        )}

        <div className="flex-1 overflow-y-auto pb-20 px-6">
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
                  const norm = normalizeAttachmentsFromSubmission(
                    submission?.data?.attachments,
                  );
                  setAttachments(norm);
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center py-10">
              <CircularLoader />
            </div>
          )}
        </div>

        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 border-t">
          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            variant="contain"
            bgColor="primary"
          >
            {fileUploadLoading || mutation.isPending || mutateUpdate.isPending ? (
              <CircularLoader />
            ) : isEditing ? (
              "Update Request"
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
