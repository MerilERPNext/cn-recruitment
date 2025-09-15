/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../../hooks/useScreenSize";

interface AdvanceFormProps {
  user?: any; // Replace with your user type
  onClose?: () => void; // Add close handler prop
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
            // Row 1: Employee + Advance Amount
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

            // Row 2: Advance Type + Repayment End Date
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

            // Row 3: Repayment Type + Repayment Start Date
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

            // Row 4: Repayment Period + Monthly Repayment Amount
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

            // Row 5: Advance Account + Mode of Payment
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
                      defaultValue: "Cash - HybrowLabs Private Limited - HL",
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

  const handleSubmit = useCallback(async () => {
    try {
      const submission = await formAdvanceInstance.current.submit();
      const formData = submission.data as Record<string, any>;
      console.log("Advance Form Data:", formData);
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"> 
          <div className="flex items-center justify-between h-16">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate md:text-2xl">
                Advance Request
              </h2>
              <p className="text-sm text-gray-600 mt-1 hidden md:block">
                Submit your advance request with repayment details
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              type="button"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto p-4 md:p-8 pt-6"> {/* 🔑 reduced width */}
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
        <div className="mt-8 md:flex md:justify-end md:space-x-4">
          <div className="fixed bottom-0 left-0 w-full bg-white py-3 px-4 border-t md:relative md:w-auto md:p-0 md:border-t-0 md:bg-transparent">
            <div className="flex space-x-3 md:space-x-4">
              <button
                onClick={handleCancel}
                className="flex justify-center w-full py-3 px-6 rounded-lg font-medium transition-colors border border-gray-300 text-gray-700 hover:bg-gray-50 md:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex justify-center w-full py-3 px-6 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 md:w-auto"
              >
                Submit Request
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