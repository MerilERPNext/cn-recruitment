import React, { useCallback, useMemo, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { X } from "lucide-react";

interface AdvanceFormProps {
  user?: any;
  onClose?: () => void;
}

export const AdvanceForm: React.FC<AdvanceFormProps> = ({ user, onClose }) => {
  const formAdvanceInstance = useRef<any>(null);
  const { isDesktop } = useScreenSize();

  const advanceForm = useMemo(() => {
    return {
      type: "form",
      display: "form",
      components: [
        {
          type: "panel",
          key: "advancePanel",
          title: "Advance Request",
          hideLabel: true,
          customClass:
            "bg-white rounded-lg shadow-md mb-6 w-full max-w-3xl mx-auto p-4", // 🔑 reduced width
          components: [
            {
              type: "columns",
              key: "employeeRow",
              customClass: "mb-6",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "textfield",
                      key: "employee",
                      label: "Employee",
                      input: true,
                      validate: { required: true },
                      defaultValue: user?.employee || "",
                      placeholder: "Enter employee ID/name",
                      customClass: "mb-4",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "currency",
                      key: "advance_amount",
                      label: "Advance Amount",
                      input: true,
                      validate: { required: true },
                      placeholder: "0.00",
                      currency: "INR",
                      customClass: "mb-4",
                    },
                  ],
                },
              ],
            },
            {
              type: "columns",
              key: "advanceTypeRow",
              customClass: "mb-6",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "advance_type",
                      label: "Advance Type",
                      input: true,
                      validate: { required: true },
                      placeholder: "Select advance type",
                      data: {
                        values: [
                          { value: "salary", label: "Salary Advance" },
                          { value: "travel", label: "Travel Advance" },
                          { value: "medical", label: "Medical Advance" },
                          { value: "emergency", label: "Emergency Advance" },
                          { value: "other", label: "Other" },
                        ],
                      },
                      customClass: "mb-4",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "datetime",
                      key: "repayment_start_date",
                      label: "Repayment Start Date",
                      input: true,
                      validate: { required: true },
                      enableTime: false,
                      placeholder: "Select start date",
                      dateFormat: "dd-MM-yyyy",
                      customClass: "mb-4",
                    },
                  ],
                },
              ],
            },
            {
              type: "columns",
              key: "repaymentInfo1",
              customClass: "mb-6",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "repayment_type",
                      label: "Repayment Type",
                      input: true,
                      validate: { required: true },
                      placeholder: "Select repayment type",
                      data: {
                        values: [
                          { value: "one_time", label: "One Time" },
                          { value: "installment", label: "Installment" },
                        ],
                      },
                      customClass: "mb-4",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "datetime",
                      key: "repayment_end_date",
                      label: "Repayment End Date",
                      input: true,
                      enableTime: false,
                      placeholder: "Select end date",
                      dateFormat: "dd-MM-yyyy",
                      customClass: "mb-4",
                    },
                  ],
                },
              ],
            },
            {
              type: "columns",
              key: "repaymentInfo2",
              customClass: "mb-6",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "number",
                      key: "repayment_period_months",
                      label: "Repayment Period in Months",
                      input: true,
                      placeholder: "Number of months",
                      customClass: "mb-4",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "currency",
                      key: "monthly_repayment_amount",
                      label: "Monthly Repayment Amount",
                      input: true,
                      placeholder: "0.00",
                      currency: "INR",
                      customClass: "mb-4",
                    },
                  ],
                },
              ],
            },
            {
              type: "columns",
              key: "accountingInfo",
              customClass: "mb-6",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "textfield",
                      key: "advance_account",
                      label: "Advance Account",
                      input: true,
                      validate: { required: true },
                      defaultValue: "Cash - HybrowLabs Private Limited",
                      customClass: "mb-4",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "mode_of_payment",
                      label: "Mode of Payment",
                      input: true,
                      validate: { required: true },
                      placeholder: "Select payment mode",
                      data: {
                        values: [
                          { value: "cash", label: "Cash" },
                          { value: "cheque", label: "Cheque" },
                          { value: "bank_transfer", label: "Bank Transfer" },
                          { value: "upi", label: "UPI" },
                          { value: "card", label: "Card" },
                        ],
                      },
                      customClass: "mb-4",
                    },
                  ],
                },
              ],
            },

            // Row 6: Checkbox
            {
              type: "checkbox",
              key: "repay_unclaimed_amount_from_salary",
              label: "Repay Unclaimed Amount from Salary",
              input: true,
              defaultValue: false,
              customClass: "mt-4 mb-4",
            },

            // Row 7: Purpose
            {
              type: "textarea",
              key: "purpose",
              label: "Purpose",
              input: true,
              validate: { required: true },
              placeholder: "Describe the purpose of advance",
              rows: 4,
              customClass: "mb-4",
            },
          ],
        },
      ],
    };
  }, [user]);

  // mapping function
  function transformAdvanceFormData(formData: Record<string, any>) {
    return {
      employee: formData.employee,
      purpose: formData.purpose,
      custom_repayment_type: formData.repayment_type,
      custom_repayment_start_date: formData.repayment_start_date,
      advance_account: formData.advance_account,
      mode_of_payment: formData.mode_of_payment,
      custom_advance_type: formData.advance_type,
      advance_amount: formData.advance_amount,
      custom_repayment_period_in_months: formData.repayment_period_months,
      custom_monthly_repayment_amount: formData.monthly_repayment_amount,
      custom_repayment_end_date: formData.repayment_end_date,
      repay_unclaimed_amount_from_salary:
        formData.repay_unclaimed_amount_from_salary,
    };
  }

  const handleSubmit = useCallback(async () => {
    try {
      const submission = await formAdvanceInstance.current.submit();
      const formData = submission.data as Record<string, any>;
      const payload = transformAdvanceFormData(formData);
      console.log("Payload for API:", payload);
      alert("Advance request submitted successfully!");
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Error submitting advance request. Please try again.");
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (formAdvanceInstance.current) {
      formAdvanceInstance.current.resetValue();
    }
    if (onClose) onClose();
  }, [onClose]);

  return (
    <div className="advance-form-container h-full bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-2 sm:px-6 lg:px-8">
          {isDesktop ? (
            <div className="flex items-center justify-between h-16">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 truncate md:text-2xl">
                  Advance Request
                </h2>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                type="button"
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

      {/* Form Content */}
      <div className="max-w-3xl mx-auto">
        {" "}
        {/* 🔑 reduced width */}
        <Form
          key="advance-form"
          form={advanceForm}
          onFormReady={(instance: any) =>
            (formAdvanceInstance.current = instance)
          }
          options={{
            submitButton: false,
          }}
        />
        {/* Action Buttons */}
        <div className="mb-6 px-5">
          <div
            className="fixed bottom-0 left-0 w-full bg-white py-3 px-4 border-t 
                     md:relative md:w-auto md:p-0 md:border-t-0 md:bg-transparent"
          >
            <div className="flex space-x-3 md:space-x-4">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 px-6 rounded-lg font-medium transition-colors border border-gray-300 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 px-6 rounded-lg font-medium transition-colors bg-black text-white hover:bg-gray-800"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 md:hidden"></div>
    </div>
  );
};

export default AdvanceForm;
