
import React, { useState, useRef, useMemo } from "react";
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";

// Mock toast for demonstration
const toast = {
  error: (msg: string) => alert(msg),
  success: (msg: string) => console.log(msg)
};

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
    // @ts-expect-error - Global variable set by Vite plugin
    window.__FORMIO_BASE_URL__ ||
    window.location?.origin ||
    "http://localhost:8000";

  // Main form schema with Expense Claim Type selector
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

  const mapFieldsToFormio = (fields: any[]) =>
    fields
      .map((field) => {
        switch (field.fieldtype) {
          case "Date":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              format: "yyyy-MM-dd",
              enableTime: false,
              validate: { required: field.reqd === 1 || field.required === 1 },
              input: true,
            };
          case "Datetime":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              format: "yyyy-MM-dd HH:mm:ss",
              enableTime: true,
              enableDate: true,
              placeholder: "Select date and time",
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
              },
              validate: { required: field.reqd === 1 || field.required === 1 },
              input: true,
            };
          case "Currency":
          case "Float":
            return {
              type: "number",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.reqd === 1 || field.required === 1 },
              input: true,
              delimiter: false,
              requireDecimal: false,
            };
          case "Data":
            return {
              type: "textfield",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.reqd === 1 || field.required === 1 },
              input: true,
            };
          case "Text":
            return {
              type: "textarea",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.reqd === 1 || field.required === 1 },
              rows: 3,
              input: true,
            };
          case "Attach":
            return {
              type: "file",
              key: field.fieldname,
              label: field.label || "Attachment",
              storage: "base64",
              validate: { required: field.reqd === 1 || field.required === 1 },
              input: true,
              filePattern: "*/*",
              customClass: "mb-4",
            };
          case "Link":
            if (
              field.fieldname === "vehicle_type" ||
              field.options === "Daily Allowance Vehicle Category"
            ) {
              return {
                type: "select",
                key: field.fieldname,
                label: field.label,
                dataSrc: "url",
                data: {
                  url: `${getBaseUrl()}/api/resource/Daily%20Allowance%20Vehicle%20Category`,
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
                validate: { required: field.reqd === 1 || field.required === 1 },
                input: true,
              };
            }
            return {
              type: "select",
              key: field.fieldname,
              label: field.label,
              dataSrc: "url",
              data: {
                url: `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_link_options?doctype=${
                  field.options
                }`,
              },
              template: "<span>{{ item.name }}</span>",
              valueProperty: "name",
              selectValues: "message",
              validate: { required: field.reqd === 1 || field.required === 1 },
              input: true,
            };
          default:
            return null;
        }
      })
      .filter(Boolean);

  const fetchExpenseTypeFields = async (expenseType: string) => {
    try {
      const response = await fetch(
        `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_expense_type_fields?expense_type=${encodeURIComponent(expenseType)}`
      );
      const data = await response.json();
      const fields = data.message?.fields || [];
      const components = mapFieldsToFormio(fields);
      setDynamicFields(components);
      setDynamicFormData({}); // Reset dynamic form data when type changes
    } catch (error) {
      console.error("Error fetching expense type fields:", error);
      toast.error("Failed to load expense fields");
    }
  };

  const handleMainFormChange = (change: any) => {
    if (!change || !change.data) return;
    
    setMainFormData(change.data);
    const expenseType = change.data?.expense_type;
    
    if (expenseType && expenseType !== selectedExpenseType) {
      setSelectedExpenseType(expenseType);
      fetchExpenseTypeFields(expenseType);
    }
  };

  const handleDynamicFormChange = (change: any) => {
    if (!change || !change.data) return;
    setDynamicFormData(change.data);
  };

  const validateAndSubmit = () => {
    // Combine both form data
    const combinedData = {
      ...mainFormData,
      ...dynamicFormData,
    };

    // Validate expense type selection
    if (!combinedData.expense_type) {
      toast.error("Please select Expense Claim Type!");
      return;
    }

    // Validate required fields from dynamic form
    const missingFields = dynamicFields.filter(
      (field: any) =>
        field.validate?.required && 
        (combinedData[field.key] === undefined || 
         combinedData[field.key] === null || 
         combinedData[field.key] === "")
    );

    if (missingFields.length > 0) {
      toast.error(
        `Please fill required fields: ${missingFields
          .map((f: any) => f.label)
          .join(", ")}`
      );
      return;
    }

    // Handle file attachment - extract URL from file object
    if (combinedData.attach_receipt && Array.isArray(combinedData.attach_receipt)) {
      const attachment = combinedData.attach_receipt[0]?.url || combinedData.attach_receipt[0]?.data || null;
      if (attachment) {
        combinedData.attach_receipt = attachment;
      }
    }

    // Create expense object with unique ID
    const expense = {
      id: Date.now().toString(),
      ...combinedData,
    };

    console.log("💾 Saving expense:", expense);

    // Call the parent's onSave handler
    onSave(expense);
    
    // Close modal and reset form
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Add Expense Claim</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Main Form: Expense Type Selector */}
          <div className="mb-4">
            <Form
              key={`main-${formKey}`}
              ref={formRef}
              form={expenseTypeSchema}
              submission={{ data: mainFormData }}
              onChange={handleMainFormChange}
              options={{ noAlerts: true, submitButton: false }}
            />
          </div>

          {/* Dynamic Fields Form */}
          {dynamicFields.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium mb-4 text-gray-700">
                Additional Details
              </h3>
              <Form
                key={`dynamic-${formKey}-${selectedExpenseType}`}
                ref={dynamicFormRef}
                form={{
                  display: "form",
                  components: dynamicFields,
                }}
                submission={{ data: dynamicFormData }}
                onChange={handleDynamicFormChange}
                options={{ noAlerts: true, submitButton: false }}
              />
            </div>
          )}

          {/* Info message when no expense type selected */}
          {!selectedExpenseType && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Please select an Expense Claim Type to continue
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={validateAndSubmit}
            disabled={!selectedExpenseType || dynamicFields.length === 0}
            className="px-6 py-2 rounded-lg font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseClaimModal;