import React, { useState, useRef, useMemo } from "react";
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
  const formRef = useRef<any>(null);
  const dynamicFormRef = useRef<any>(null);
  const [selectedExpenseType, setSelectedExpenseType] = useState("");
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [mainFormData, setMainFormData] = useState<any>({});
  const [dynamicFormData, setDynamicFormData] = useState<any>({});
  const [formKey, setFormKey] = useState(0);

  const getBaseUrl = () =>
    // @ts-ignore
    window.__FORMIO_BASE_URL__ ||
    window.location?.origin ||
    "http://localhost:8000";

  // Step 1: Expense type selector schema
  const expenseTypeSchema = useMemo(
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

  // Step 2: Dynamic field mapping
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
              validate: { required: field.reqd === 1 },
              input: true,
            };
          case "Currency":
          case "Float":
            return {
              type: "number",
              key: field.fieldname,
              label: field.label,
              input: true,
              validate: { required: field.reqd === 1 },
            };
          case "Data":
            return {
              type: "textfield",
              key: field.fieldname,
              label: field.label,
              input: true,
              validate: { required: field.reqd === 1 },
            };
          case "Text":
            return {
              type: "textarea",
              key: field.fieldname,
              label: field.label,
              input: true,
              validate: { required: field.reqd === 1 },
            };
          case "Attach":
            return {
              type: "file",
              key: field.fieldname,
              label: field.label,
              storage: "base64",
              input: true,
              filePattern: "*/*",
              validate: { required: field.reqd === 1 },
            };
          default:
            return null;
        }
      })
      .filter(Boolean);

  // Step 3: Fetch fields from API when expense type changes
  const fetchExpenseTypeFields = async (expenseType: string) => {
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_expense_type_fields?expense_type=${encodeURIComponent(expenseType)}`
      );
      const data = await res.json();
      const fields = data.message?.fields || [];
      const components = mapFieldsToFormio(fields);
      setDynamicFields(components);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expense fields");
    }
  };

  const handleMainFormChange = (change: any) => {
    setMainFormData(change.data);
    const expenseType = change.data?.expense_type;
    if (expenseType && expenseType !== selectedExpenseType) {
      setSelectedExpenseType(expenseType);
      fetchExpenseTypeFields(expenseType);
    }
  };

  const handleDynamicFormChange = (change: any) => {
    setDynamicFormData(change.data);
  };

  // Step 4: Submit logic
  const handleSubmit = () => {
    const combinedData = { ...mainFormData, ...dynamicFormData };

    if (!combinedData.expense_type) {
      toast.error("Please select Expense Claim Type!");
      return;
    }

    // Convert attach_receipt to base64 string if present
    if (
      combinedData.attach_receipt &&
      Array.isArray(combinedData.attach_receipt)
    ) {
      const file =
        combinedData.attach_receipt[0]?.data ||
        combinedData.attach_receipt[0]?.url ||
        null;
      if (file) combinedData.attach_receipt = file;
    }

    // 🔹 Map required custom fields
    const mappedExpense = {
      id: Date.now().toString(),
      expense_type: combinedData.expense_type,
      expense_date: combinedData.expense_date,
      amount: combinedData.amount,
      custom_mercent: combinedData.merchant || "",
      custom_invoice_number: combinedData.invoice_number || "",
      custom_attach_receipt: combinedData.attach_receipt || "",
      description: combinedData.description || "",
    };

    onSave(mappedExpense);
    console.log("mappedExpense", mappedExpense);
    
    handleClose();
  };

  const handleClose = () => {
    setSelectedExpenseType("");
    setDynamicFields([]);
    setMainFormData({});
    setDynamicFormData({});
    setFormKey((prev) => prev + 1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
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

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <Form
            key={`main-${formKey}`}
            ref={formRef}
            form={expenseTypeSchema}
            submission={{ data: mainFormData }}
            onChange={handleMainFormChange}
            options={{ noAlerts: true, submitButton: false }}
          />

          {dynamicFields.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <Form
                key={`dynamic-${formKey}`}
                ref={dynamicFormRef}
                form={{ display: "form", components: dynamicFields }}
                submission={{ data: dynamicFormData }}
                onChange={handleDynamicFormChange}
                options={{ noAlerts: true, submitButton: false }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseClaimModal;
