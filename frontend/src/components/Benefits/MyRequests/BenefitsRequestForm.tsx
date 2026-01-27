import { useRef, useState, useMemo } from "react";
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

interface BenefitRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BenefitRequestForm({
  isOpen,
  onClose,
  onSuccess,
}: BenefitRequestFormProps) {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || "",
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const formRef = useRef<any>(null);

  const { uploadFiles, loading: fileUploadLoading } = useFileUploader();
  const mutation = useNewBenifitRequest();

  // Memoize the initial submission so Form.io does NOT reset on rerender
  const initialSubmission = useMemo(() => {
    return {
      data: {
        currentEmployeeId: currentEmployee?.employee || "",
        claimDate: formatToIndianDate(new Date()),
      },
    };
  }, [currentEmployee]);

  const { data: requiredFields } = useRequiredFields("Employee Benefit Claim");
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

  const transformedSchema = useMemo(() => {
    return transformSchemaWithRequired(
      benefitRequestFormSchema as FormSchema,
      requiredFieldMap,
    );
  }, [requiredFieldMap]);


  const loading = useLoadingOverlay();
  // Form submission handler
  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();

    if (!submission?.data) {
      toast.error("Failed to submit form. Please try again.");
      return;
    }

    const submissionData = {
      employee: currentEmployee?.employee,
      claim_date: formatToIndianDate(new Date()),
      earning_component: submission.data.earning_component,
      custom_note_by_employee: submission.data.custom_note_by_employee,
      claimed_amount: submission.data.claimed_amount,
      custom_max_amount: submission.data.custom_max_amount,
      custom_payroll_period: submission?.data?.custom_payroll_period,
    };
    loading?.show("Submitting Benefit Request");
    mutation.mutate(submissionData as Record<string, unknown>, {
      onSuccess: async (data: any) => {
        // upload any attachments *without* causing rerender
        if (attachments.length > 0) {
          await uploadFiles(attachments, data.doctype, data.name);
        }
        
        onClose();
        onSuccess();
        toast.success("Added Benefit Request successfully!");
      },
      onError: (error: CustomError) => {
        const message = errorResponseFormater(error, "Something went wrong!!");
        toast.error(message);
        console.error(error);
      },
      onSettled: () => {
        loading?.hide();
      }
    });
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
        {/* Header */}
        {isDesktop ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
            <h2 className="text-xl font-semibold">Request Benefit Claim</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X />
            </button>
          </div>
        ) : (
          <HeaderBar title="Request Benefit Claim" onBack={onClose} />
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-20 px-6">
          <Form
            form={transformedSchema}
            submission={initialSubmission}
            options={{
              submitButton: false,
            }}
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
            // IMPORTANT: Handle attachments without causing rerender
            onChange={(submission: any) => {
              if (submission.changed?.component?.key === "attachments") {
                setAttachments(submission?.data?.attachments || []);
              }
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 border-t">
          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            variant="contain"
            bgColor="primary"
          >
            {fileUploadLoading || mutation.isPending ? (
              <CircularLoader />
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
