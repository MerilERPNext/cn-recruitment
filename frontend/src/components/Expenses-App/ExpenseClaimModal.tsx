import React, { useState, useMemo } from "react";
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface ExpenseClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: any) => void;
}

const ExpenseClaimModal: React.FC<ExpenseClaimModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [formKey, setFormKey] = useState(0);
  const [formData, setFormData] = useState<any>({});

  const getBaseUrl = () =>
    // @ts-ignore
    window.__FORMIO_BASE_URL__ ||
    window.location?.origin ||
    "http://localhost:8000";

  // CORRECT: Your mapping function was already fixed, ensure it stays this way
  const mapFieldsToFormio = (fields: any[]) =>
    fields
      .map((field) => {
        switch (field.fieldtype) {
          case "Date":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              enableTime: false,
              format: "yyyy-MM-dd",
              validate: { required: !!field.required },
              input: true,
            };
          case "Currency":
          case "Float":
            return {
              type: "number",
              key: field.fieldname,
              label: field.label,
              input: true,
              validate: { required: !!field.required },
            };
          case "Data":
            return {
              type: "textfield",
              key: field.fieldname,
              label: field.label,
              input: true,
              validate: { required: !!field.required },
            };
          case "Text":
            return {
              type: "textarea",
              key: field.fieldname,
              label: field.label,
              input: true,
              validate: { required: !!field.required },
            };
          case "Attach":
            return {
              type: "file",
              key: field.fieldname,
              label: field.label,
              storage: "customBase64",
              input: true,
              fileTypes: [
                { label: "Documents", value: ".pdf,.doc,.docx" },
                { label: "Images", value: ".jpg,.jpeg,.png" },
              ],
              filePattern: "*/*",
              validate: { required: !!field.required },
            };
          default:
            return null;
        }
      })
      .filter(Boolean);

  const initialSchema = useMemo(
    () => ({
      display: "form",
      components: [
        {
          type: "select",
          key: "expense_type",
          label: "Expense Claim Type",
          placeholder: "Select Expense Claim Type",
          dataSrc: "url",
          data: {
            url: `${getBaseUrl()}/api/resource/Expense%20Claim%20Type?fields=["name"]&limit_page_length=100`,
            headers: [{ key: "Accept", value: "application/json" }],
          },
          selectValues: "data",
          valueProperty: "name",
          template: "<span>{{ item.name }}</span>",
          validate: { required: true },
          input: true,
        },
      ],
    }),
    []
  );

  const [formSchema, setFormSchema] = useState<any>(initialSchema);

  const fetchExpenseTypeFields = async (expenseType: string) => {
    if (!expenseType) {
      setFormSchema(initialSchema);
      return;
    }
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_expense_type_fields?expense_type=${encodeURIComponent(
          expenseType
        )}`
      );
      const data = await res.json();
      const fields = data.message?.fields || [];
      const dynamicComponents = mapFieldsToFormio(fields);

      setFormSchema({
        display: "form",
        components: [
          ...initialSchema.components,
          ...dynamicComponents,
          {
            type: "container",
            key: "buttonContainer",
            customClass: "flex justify-end gap-3 mt-4",
            components: [
              {
                type: "button",
                action: "submit",
                label: "Save Expense",
                theme: "primary",
                key: "submit",
              },
            ],
          },
        ],
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expense fields");
    }
  };

  const handleClose = () => {
    setFormSchema(initialSchema);
    setFormData({});
    setFormKey((prev) => prev + 1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-visible p-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-lg">Add Expense Claim</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-2 max-h-[70vh] min-h-[50vh] overflow-y-auto">
          <Form
            key={formKey}
            form={formSchema}
            submission={{ data: formData }}
            onChange={(change: any) => {
              const currentExpenseType = formData.expense_type;
              const newExpenseType = change.data?.expense_type;
              setFormData(change.data);
              if (newExpenseType && newExpenseType !== currentExpenseType) {
                fetchExpenseTypeFields(newExpenseType);
              }
            }}
            onSubmit={(submission: any) => {
              const combinedData = submission.data;
              if (
                combinedData.attach_receipt &&
                Array.isArray(combinedData.attach_receipt) &&
                combinedData.attach_receipt.length > 0
              ) {
                const file =
                  combinedData.attach_receipt[0]?.data ||
                  combinedData.attach_receipt[0]?.url ||
                  null;
                if (file) combinedData.attach_receipt = file;
              }
              const mappedExpense = {
                id: crypto.randomUUID(),
                expense_type: combinedData.expense_type,
                expense_date: combinedData.expense_date,
                amount: combinedData.amount,
                custom_mercent: combinedData.merchant || "",
                custom_invoice_number: combinedData.invoice_number || "",
                custom_attach_receipt:
                  combinedData.attach_receipt?.file_url || null,
                description: combinedData.description || "",
              };
              onSave(mappedExpense);
              handleClose();
            }}
            options={{ noAlerts: true }}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseClaimModal;
