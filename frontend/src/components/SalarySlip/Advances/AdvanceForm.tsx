/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { X } from "lucide-react";
import DOMPurify from "dompurify";
import {
  useAdvancesType,
  useCreateNewAdvance,
  useEmployeeAdvancesAmount,
} from "../../../hooks/useEmployeeAdvances";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";

interface AdvanceFormProps {
  user?: any;
  onClose?: () => void;
}

export const AdvanceForm: React.FC<AdvanceFormProps> = ({ user, onClose }) => {
  const formAdvanceInstance = useRef<any>(null);
  const { isDesktop } = useScreenSize();
  const { data: advanceType } = useAdvancesType();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    user?.employee as string
  );

  const [selectedAdvanceType, setSelectedAdvanceType] = useState<string>();
  const [postingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  ); // today date only

  const { data: advanceAmountData } = useEmployeeAdvancesAmount(
    user?.employee,
    selectedAdvanceType,
    postingDate
  );

  const mutation = useCreateNewAdvance();

  /** ✅ Auto update Advance Amount when fetched */
  useEffect(() => {
    if (
      advanceAmountData &&
      formAdvanceInstance.current &&
      advanceAmountData[0]?.amount
    ) {
      formAdvanceInstance.current.setComponentValue(
        "advance_amount",
        advanceAmountData[0].amount
      );
    }
  }, [advanceAmountData]);

  /** ✅ Handle Submit */
  const handleSubmit = async () => {
    try {
      const submission = await formAdvanceInstance.current?.submit();
      const formData = submission?.data;

      if (!formData) {
        toast.error("Please fill the required fields.");
        return;
      }

      // ✅ ensure only date part is sent (yyyy-MM-dd)
      if (formData.custom_repayment_start_date) {
        formData.custom_repayment_start_date = new Date(
          formData.custom_repayment_start_date
        )
          .toISOString()
          .split("T")[0];
      }

      const submissionData = {
        ...formData,
        custom_advance_type: selectedAdvanceType,
        advance_amount: formData.advance_amount,
        company: currentEmployee?.company,
        applicant_type: "Employee",
        applicant: currentEmployee?.employee,
        exchange_rate: 1.0,
      };

      console.log("✅ Final Submitted Payload:", submissionData);

      mutation.mutate(submissionData as Record<string, unknown>, {
        onSuccess: () => {
          onClose?.();
          toast.success("Advance Request submitted successfully!");
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.exception?.split(":").slice(1).join(":").trim() ||
            "Something went wrong!!";

          const cleanString = DOMPurify.sanitize(errorMessage || "");
          toast.error(<span dangerouslySetInnerHTML={{ __html: cleanString }} />);
        },
      });
    } catch (err) {
      console.error("❌ Form submission error", err);
      toast.error("Form submission failed!");
    }
  };

  /** ✅ Form Schema with Validations */
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
            "bg-white rounded-lg shadow-md mb-6 w-full max-w-3xl mx-auto p-4",
          components: [
            // Row 1
            {
              type: "columns",
              key: "employeeRow",
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
                      placeholder: "0.00",
                      defaultValue: advanceAmountData,
                      validate: { required: true, min: 1 },
                      currency: "INR",
                      exchange_rate: 1.0,
                    },
                  ],
                },
              ],
            },

            // Row 2 - Advance Type & Repayment Type
            {
              type: "columns",
              key: "advanceTypeRow",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "custom_advance_type",
                      label: "Advance Type",
                      input: true,
                      validate: { required: true },
                      placeholder: "Select advance type",
                      data: {
                        values:
                          advanceType?.data?.map((item: { name: string }) => ({
                            label: item?.name,
                            value: item?.name,
                          })) || [],
                      },
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "custom_repayment_type",
                      label: "Repayment Type",
                      input: true,
                      validate: { required: true },
                      placeholder: "Select repayment type",
                      data: {
                        values: [
                          { value: "One Time", label: "One Time" },
                          { value: "Recurring", label: "Recurring" },
                        ],
                      },
                    },
                  ],
                },
              ],
            },

            // Row 3 - Repayment Method + Start Date
            {
              type: "columns",
              key: "repaymentMethodRow",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "repayment_method",
                      label: "Repayment Method",
                      input: true,
                      customConditional:
                        "show = data.custom_repayment_type === 'Recurring';",
                      data: {
                        values: [
                          {
                            label: "Repay Over Number of Periods",
                            value: "Repay Over Number of Periods",
                          },
                          {
                            label: "Repay Fixed Amount per Period",
                            value: "Repay Fixed Amount per Period",
                          },
                        ],
                      },
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "datetime",
                      key: "custom_repayment_start_date",
                      label: "Repayment Start Date",
                      input: true,
                      placeholder: "Select start date",
                      enableTime: false, // ✅ only date
                      format: "yyyy-MM-dd", // ✅ force only date format
                      displayInTimezone: "utc",
                      useLocaleSettings: false,
                      customConditional: `
                        show = (
                          data.custom_repayment_type === 'One Time' ||
                          data.custom_repayment_type === 'Recurring'
                        );
                      `,
                      validate: { required: true },
                    },
                  ],
                },
              ],
            },

            // Row 4 - Repayment Period or Amount
            {
              type: "columns",
              key: "repaymentDetails",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "number",
                      key: "repayment_periods",
                      label: "Repayment Period in Months",
                      input: true,
                      placeholder: "Number of months",
                      customConditional: `
                        show = (
                          data.custom_repayment_type === 'Recurring' && 
                          data.repayment_method === 'Repay Over Number of Periods'
                        );
                      `,
                      validate: { required: true, min: 1, max: 36 },
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "number",
                      key: "repayment_amount",
                      label: "Monthly Repayment Amount",
                      input: true,
                      placeholder: "0.00",
                      customConditional:
                        "show = data.custom_repayment_type === 'Recurring' && data.repayment_method === 'Repay Fixed Amount per Period';",
                      validate: { required: true, min: 1 },
                    },
                  ],
                },
              ],
            },

            // Purpose
            {
              type: "textarea",
              key: "purpose",
              label: "Purpose",
              input: true,
              validate: { required: true },
              placeholder: "Describe the purpose of advance",
              rows: 4,
            },
          ],
        },
      ],
    };
  }, [user, advanceType, advanceAmountData]);

  /** Cancel Handler */
  const handleCancel = useCallback(() => {
    if (formAdvanceInstance.current) {
      formAdvanceInstance.current.resetValue();
    }
    if (onClose) onClose();
  }, [onClose]);

  return (
    <div className="advance-form-container flex flex-col h-full bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-2 sm:px-6 lg:px-8">
          {isDesktop ? (
            <div className="flex items-center justify-between h-16">
              <h2 className="text-xl font-semibold text-gray-900 truncate md:text-2xl">
                Advance Request
              </h2>
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

      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Form
            key="advance-form"
            form={advanceForm}
            onFormReady={(instance: any) =>
              (formAdvanceInstance.current = instance)
            }
            options={{
              submitButton: false,
            }}
            onChange={(submission: any) => {
              if (submission.data.custom_advance_type) {
                setSelectedAdvanceType(submission.data.custom_advance_type);
              }
            }}
          />
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3">
        <div className="max-w-3xl mx-auto flex space-x-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-6 rounded-lg font-medium border border-gray-300 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-6 rounded-lg font-medium bg-black text-white hover:bg-gray-800"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvanceForm;
