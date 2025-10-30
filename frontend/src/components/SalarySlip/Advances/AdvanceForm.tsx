/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { X } from "lucide-react";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import {
  useAdvancesType,
  useCreateNewAdvance,
  useEmployeeAdvancesAmount,
} from "../../../hooks/useEmployeeAdvances";

// ✅ Import JSON schema
import advanceFormJson from "../Advances/AdvanceFormio.json";

interface AdvanceFormProps {
  user?: any;
  onClose?: () => void;
}

const AdvanceForm: React.FC<AdvanceFormProps> = ({ user, onClose }) => {
  const formAdvanceInstance = useRef<any>(null);
  const { isDesktop } = useScreenSize();
  const { setRefetchAttendance } = useGlobalStore();
  const { data: advanceType } = useAdvancesType();

  const [selectedAdvanceType, setSelectedAdvanceType] = useState<string>();
  const [postingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
 console.log("advanceType", advanceType);
  const { data: advanceAmountData } = useEmployeeAdvancesAmount(
    user?.employee,
    selectedAdvanceType,
    postingDate,
    user?.company
  );

  const mutation = useCreateNewAdvance();

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

      mutation.mutate(submissionData, {
        onSuccess: () => {
          toast.success("Advance Request submitted successfully!");
          onClose?.();
          setTimeout(() => setRefetchAttendance(true), 2000);
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.exception
              ?.split(":")
              .slice(1)
              .join(":")
              .trim() || "Something went wrong!";
          toast.error(
            <span
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(errorMessage),
              }}
            />
          );
        },
      });
    } catch (err) {
      console.error("❌ Form submission error", err);
      toast.error("Form submission failed!");
    }
  };

  /** ✅ Cancel Handler */
  const handleCancel = useCallback(() => {
    if (formAdvanceInstance.current) {
      formAdvanceInstance.current.resetValue();
    }
    setSelectedAdvanceType(undefined);
    onClose?.();
  }, [onClose]);

  return (
    <div className="advance-form-container flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          {isDesktop ? (
            <div className="flex items-center justify-between h-16">
              <h2 className="text-xl font-semibold text-gray-900">
                Advance Request
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
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
            form={advanceFormJson}
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
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3">
        <div className="max-w-3xl mx-auto flex space-x-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-6 rounded-lg border border-gray-300 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-6 rounded-lg bg-black text-white hover:bg-gray-800"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvanceForm;
