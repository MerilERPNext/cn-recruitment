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
import HeaderBar from "../../HeaderBar";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import {
  useCreateNewAdvance,
  useEmployeeAdvancesAmount,
} from "../../../hooks/useEmployeeAdvances";

// ✅ Import JSON schema
import advanceFormJson from "./AdvanceFormio.json";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useRequiredFields } from "../../../hooks/useRequiredFields";
import {
  FormSchema,
  SchemaComponent,
} from "../../Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { Typography } from "../../shared/atoms/Typography";
import { useLoadingOverlay } from "../../../context/OverlayContext";

interface AdvanceFormProps {
  user?: any;
  onClose?: () => void;
}

const AdvanceForm: React.FC<AdvanceFormProps> = ({ user, onClose }) => {
  const formAdvanceInstance = useRef<any>(null);
  const { isDesktop } = useScreenSize();
  const { setRefetchAttendance } = useGlobalStore();
  const [attachments, setAttachments] = useState<File[]>([]);
  const { uploadFiles } = useFileUploader();
  const [selectedAdvanceType, setSelectedAdvanceType] = useState<string>();
  const [postingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const { data: advanceAmountData } = useEmployeeAdvancesAmount(
    user?.employee,
    selectedAdvanceType,
    postingDate,
    user?.company
  );

  const mutation = useCreateNewAdvance();

  const { data: requiredFields } = useRequiredFields("Employee Advance");
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
            row.forEach((cell: any) => applyToComponents(cell.components))
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
      requiredFieldMap
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
        formData.custom_repayment_start_date
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
      employee: user?.employee,
      advance_account: advanceAmountData?.advance_account,
      exchange_rate: 1.0,
      custom_repayment_methods: formData.repayment_method || "",
      custom_repayment_period_in_months: formData.repayment_periods || 0,
      custom_monthly_repayment_amount: formData.repayment_amount || 0,
    };

    // ✅ Wrap only the mutation + file upload
    await loading?.wrap(async () => {
       await new Promise<void>((resolve, reject) => {
      mutation.mutate(submissionData, {
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
      })});
    }, "Submitting advance request…");
  } catch (err) {
    console.error("❌ Form submission error", err);
    const formatedError = errorResponseFormater(
        err,
        "Submission failed. Please try again."
      );
      toast.error(formatedError);
  }
};


  const handleCancel = useCallback(() => {
    if (formAdvanceInstance.current) {
      formAdvanceInstance.current.resetValue();
    }
    setAttachments([]);
    setSelectedAdvanceType(undefined);
    onClose?.();
  }, [onClose]);

  return (
    <div className="advance-form-container flex flex-col h-full bg-app">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          {isDesktop ? (
            <div className="flex items-center mt-0.5 justify-between h-16">
              <Typography variant="subheading" color="body1">
                Advance Request
              </Typography>
              <Button variant="soft" onClick={onClose}>
                <X className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <HeaderBar
              title="Advance Request"
              showBackButton={true}
              onBack={onClose}
            />
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
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3">
        <div className="max-w-3xl mx-auto flex space-x-3">
          <Button
            onClick={handleCancel}
            size="md"
            variant="outline"
            bgColor="gray-300"
            className="flex-1 border text-gray-700 py-3"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            size="md"
            className={"flex-1 hover:bg-primary-600 py-3"}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvanceForm;
