import React, { useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../hooks/useScreenSize";
import HeaderBar from "../HeaderBar";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useCreateNewAdvance } from "../../hooks/useEmployeeAdvances";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";

interface ExpenseAdvanceFormProps {
  onClose: () => void;
}

const ExpenseAdvanceForm: React.FC<ExpenseAdvanceFormProps> = ({ onClose }) => {
  const { isDesktop } = useScreenSize();
  const formRef = useRef<any>(null);
  const navigate = useNavigate();

  const { data: currentEmployee } = useCurrentEmployee();

  const postingDate = new Date().toISOString().split("T")[0];
  const advanceType = "Reimbursement / Expense Advance";

  const mutation = useCreateNewAdvance();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data;

      if (!formData || !formData.purpose || !formData.advance_amount) {
        toast.error("Please fill all required fields.");
        return;
      }

      const payload = {
        doctype: "Employee Advance",
        custom_type: advanceType,
        employee: currentEmployee?.name,
        company: currentEmployee?.company,
        posting_date: formData.postingDate,
        purpose: formData.purpose,
        advance_amount: formData.advance_amount,
      };

      console.log("🚀 Final Submitted Payload:", payload);

      setSubmitting(true);
      mutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Expense Advance submitted successfully!");
          isDesktop ? onClose() : navigate("/webapp/expenses-app/advance-expense-list");
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.exception
              ?.split(":")
              .slice(1)
              .join(":")
              .trim() || "Something went wrong!!";

          const cleanString = DOMPurify.sanitize(errorMessage || "");
          toast.error(
            <span dangerouslySetInnerHTML={{ __html: cleanString }} />
          );
        },
        onSettled: () => setSubmitting(false),
      });
    } catch (err) {
      console.error("❌ Submission error:", err);
      toast.error("Form submission failed!");
      setSubmitting(false);
    }
  };

  const expenseAdvanceSchema = {
    type: "form",
    display: "form",
    components: [
      {
        components: [
          {
            type: "columns",
            key: "row1",
            columns: [
              {
                width: 6,
                components: [
                  {
                    type: "textfield",
                    key: "custom_type",
                    label: "Advance Type",
                    input: true,
                    defaultValue: advanceType,
                    disabled: true,
                  },
                ],
              },
              {
                width: 6,
                components: [
                  {
                    type: "datetime",
                    key: "posting_date",
                    label: "Posting Date",
                    input: true,
                    enableTime: false,
                    format: "dd-MM-yyyy",
                    defaultValue: postingDate,
                    disabled: true,
                  },
                ],
              },
            ],
          },
          {
            type: "columns",
            key: "row2",
            columns: [
              {
                width: 6,
                components: [
                  {
                    type: "textfield",
                    key: "employee",
                    label: "Employee ID",
                    input: true,
                    defaultValue: currentEmployee?.name || "",
                    disabled: true,
                  },
                ],
              },
              {
                width: 6,
                components: [
                  {
                    type: "textfield",
                    key: "company",
                    label: "Company",
                    input: true,
                    defaultValue: currentEmployee?.company || "",
                    disabled: true,
                  },
                ],
              },
            ],
          },
          {
            type: "textarea",
            key: "purpose",
            label: "Purpose",
            input: true,
            placeholder: "Describe the purpose of advance",
            validate: { required: true },
            rows: 3,
          },
          {
            type: "number",
            key: "advance_amount",
            label: "Advance Amount (INR)",
            input: true,
            placeholder: "Enter amount",
            validate: { required: true, min: 1 },
          },
        ],
      },
    ],
  };

  return (
    <div
      className={`flex flex-col ${
        isDesktop ? "h-full bg-gray-50" : "h-screen bg-white"
      }`}
    >
      {!isDesktop && <HeaderBar title="New Expense Advance" onBack={() => navigate("/webapp/expenses-app/advance-expense-list")} />}

      <div className="flex-1 overflow-y-auto p-4">
        <Form
          form={expenseAdvanceSchema}
          onFormReady={(instance: any) => (formRef.current = instance)}
          options={{ submitButton: false, noAlerts: true }}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex space-x-3">
        <button
          onClick={isDesktop ? onClose : () => navigate("/webapp/expenses-app/advance-expense-list")}
          className="flex-1 py-3 px-6 rounded-lg font-medium border border-gray-300 text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3 px-6 rounded-lg font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default ExpenseAdvanceForm;
