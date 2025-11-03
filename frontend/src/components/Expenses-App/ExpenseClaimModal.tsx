import React, { useState, useMemo, useRef, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useCalculateExpenseAmount } from "../../hooks/useExpense";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { CalculateExpenseParams } from "../../types/expenseAdvance";
import { formatMySQLDatetime } from "../../utils/dateTimeFormatUtils";

interface ExpenseClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: any) => void; 
  // 1. New prop for initial data when editing
  initialData?: any;
}

const ExpenseClaimModal: React.FC<ExpenseClaimModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData, // 2. Destructure initialData
}) => {
  const [formKey, setFormKey] = useState(0);
  // 3. Initialize formData with initialData if available
  const [formData, setFormData] = useState<any>(initialData || {});
  const [calcParams, setCalcParams] = useState<any>();
  const formioInstanceRef = useRef<any>(null);
  const { data: calcData } = useCalculateExpenseAmount(calcParams);

  const lastExpenseType = useRef<string | null>(null);
  const lastCalculatedUnits = useRef<CalculateExpenseParams | null>(null);

  const [_isAmountReadonly, setIsAmountReadonly] = useState(false);
  const { data: currentEmployee } = useCurrentEmployee();
  const employeeId = currentEmployee?.name;

  // 4. Effect to reset form state when the modal opens/initialData changes
  useEffect(() => {
    if (isOpen) {
      // Set initial data for the Form.io component
      setFormData(initialData || {}); 
      // Force a re-render of the Form.io component by changing the key
      setFormKey((prev) => prev + 1); 
      // Reset ref-based state for recalculation logic on edit
      lastExpenseType.current = initialData?.expense_type || null;
      lastCalculatedUnits.current = null;

      if (initialData?.expense_type) {
        // If we have an expense type from initial data, fetch its fields
        fetchExpenseTypeFields(initialData.expense_type);
      } else {
        // Otherwise, reset to initial schema (only expense_type select)
        setFormSchema(initialSchema);
      }
    }
  }, [isOpen, initialData]); 

  useEffect(() => {
    // Only run if we have new data AND the amount field is readonly
    if (calcData) {
      const amount =
        (calcData as any)?.amount ??
        (calcData as any)?.message?.amount ??
        (calcData as any)?.data?.amount ??
        null;

      if (amount !== null && !isNaN(amount)) {
        if (formioInstanceRef.current) {
          const amountComponent =
            formioInstanceRef.current.getComponent("amount");

          if (amountComponent) {
            if (amountComponent.getValue() !== amount) {
              amountComponent.setValue(amount, {
                noValidate: true,
              });
              toast.success("Amount calculated Succesfully.");
            }
          }
        }
      } else if (calcParams?.units) {
        toast.error("Failed to calculate amount.");
      }
    }
  }, [calcData, calcParams]);

  // CORRECT: Your mapping function was already fixed, ensure it stays this way
  const mapFieldsToFormio = (fields: any[]) =>
    fields
      .map((field) => {
        // Add a red asterisk (*) for required fields
        const labelWithAsterisk = field.required
          ? `${field.label} <span style="color:red">&nbsp;*</span>`
          : field.label;
        switch (field.fieldtype) {
          case "Date":
            return {
              type: "datetime",
              key: field.fieldname,
              label: labelWithAsterisk,
              enableTime: false,
              format: "dd-MM-yyyy",
              placeholder: "Select date",
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
              input: true,
            };
          case "Datetime":
            return {
              type: "datetime",
              key: field.fieldname,
              label: labelWithAsterisk,
              format: "dd-MM-yyyy HH:mm:ss",
              enableTime: true,
              enableDate: true,
              placeholder: "Select date and time",
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
              },
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
              input: true,
            };
          case "Currency":
          case "Float":
            return {
              type: "number",
              key: field.fieldname,
              label: labelWithAsterisk,
              input: true,
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
            };
          case "Data":
            // Treat 'units' as 'number' if it's supposed to be calculated
            if (field.fieldname === "units") {
              return {
                type: "number",
                key: field.fieldname,
                label: labelWithAsterisk,
                input: true,
                validate: {
                  required: !!field.required,
                  customMessage: `${field?.label} is required`,
                },
                html: true,
                description: field.description, // Keep description if available
              };
            }
            // Treat 'units' as 'number' if it's supposed to be calculated
            return {
              type: "textfield",
              key: field.fieldname,
              label: labelWithAsterisk,
              input: true,
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
            };
          case "Text":
            return {
              type: "textarea",
              key: field.fieldname,
              label: labelWithAsterisk,
              input: true,
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
            };
          case "Attach":
            return {
              type: "file",
              key: field.fieldname,
              label: labelWithAsterisk,
              storage: "customBase64",
              input: true,
              fileTypes: [
                { label: "Documents", value: ".pdf,.doc,.docx" },
                { label: "Images", value: ".jpg,.jpeg,.png" },
              ],
              filePattern: "*/*",
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
            };
          case "Link":
            if (
              field.fieldname === "currency" &&
              field.options === "Currency"
            ) {
              return {
                type: "select",
                key: field.fieldname,
                label: labelWithAsterisk,
                dataSrc: "url",

                data: {
                  url: `/api/method/chatnext_expense_trips.employee_advance.get_allowed_currencies?employee=${employeeId}`,
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message[0]",
                defaultValue: "INR",
                template: "<span>{{ item }}</span>",
                valueProperty: "",
                validate: {
                  required: !!field.required,
                  customMessage: `${field?.label} is required`,
                },
                html: true,
                input: true,
                clearOnRefresh: false,
              };
            }

            if (
              field.fieldname === "vehicle_type" ||
              field.options === "Daily Allowance Vehicle Category"
            ) {
              return {
                type: "select",
                key: field.fieldname,
                label: labelWithAsterisk,
                dataSrc: "url",
                data: {
                  url: `/api/resource/Daily%20Allowance%20Vehicle%20Category`,
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
                validate: {
                  required: !!field.required,
                  customMessage: `${field?.label} is required`,
                },
                html: true,
                input: true,
              };
            }

            // Generic Link field handling
            return {
              type: "select",
              key: field.fieldname,
              label: labelWithAsterisk,
              dataSrc: "url",
              data: {
                url: `/api/method/chatnext_expense_trips.expense_claim.get_link_options?doctype=${field.options}`,
              },
              template: "<span>{{ item.name }}</span>",
              valueProperty: "name",
              selectValues: "message",
              validate: {
                required: !!field.required,
                customMessage: `${field?.label} is required`,
              },
              html: true,
              input: true,
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
          label: "Expense Advance Type",
          placeholder: "Select Expense Advance Type",
          dataSrc: "url",
          data: {
            url: `/api/resource/Expense%20Claim%20Type?fields=["name"]&limit_page_length=100`,
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
        `/api/method/chatnext_expense_trips.expense_claim.get_expense_type_fields?expense_type=${encodeURIComponent(
          expenseType
        )}`
      );
      const data = await res.json();
      const fields = data.message?.fields || [];
      const dynamicComponents = mapFieldsToFormio(fields);

      const isReadonly = data.message?.is_amount_readonly ?? false;
      setIsAmountReadonly(isReadonly);

      const dynamicComponentsWithReadonly = dynamicComponents.map(
        (comp: any) => {
          if (comp.key === "amount" && isReadonly) {
            return { ...comp, disabled: true };
          }
          return comp;
        }
      );

      setFormSchema({
        display: "form",
        components: [
          ...initialSchema.components,
          ...dynamicComponentsWithReadonly,

          {
            type: "container",
            key: "buttonContainer",
            customClass: "flex justify-end gap-3 mt-4",
            components: [
              {
                type: "button",
                action: "submit",
                label: "Save Advance",
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
    lastExpenseType.current = null;
    // 5. Reset the form schema and data state
    setFormSchema(initialSchema);
    setFormData({}); 
    // Do NOT increment formKey here, as it's handled in the useEffect
    // setFormKey((prev) => prev + 1); 
    onClose();
  };

  if (!isOpen) return null;

  // 6. Update modal title based on whether we are editing or adding
  const modalTitle = initialData
    ? "Edit Expense Advance Breakup"
    : "Add Expense Advance Breakup";

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-visible p-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-lg">{modalTitle}</h2> 
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
            submission={{ data: formData }} // Use formData which is set via useEffect
            onFormReady={(formio: any) => {
              formioInstanceRef.current = formio;
            }}
            onChange={(change: any) => {
              const newExpenseType = change.data?.expense_type;
              const units = change.data?.units;
              const numericUnits = Number(units);
              const vehicleType = change.data?.vehicle_type;

              setFormData(change.data);

              // Handle expense type change
              if (
                newExpenseType &&
                newExpenseType !== lastExpenseType.current
              ) {
                lastExpenseType.current = newExpenseType;
                lastCalculatedUnits.current = null;
                fetchExpenseTypeFields(newExpenseType);
              }

              // 🔹 Trigger recalculation whenever units OR vehicle_type changes
              if (newExpenseType && (units || vehicleType)) {
                clearTimeout((window as any)._calcTimer);
                (window as any)._calcTimer = setTimeout(() => {
                  const lastParams = lastCalculatedUnits.current;

                  // Recalculate only if something changed
                  if (
                    !lastParams ||
                    lastParams.units !== numericUnits ||
                    lastParams.vehicle_type !== vehicleType ||
                    lastParams.expense_type !== newExpenseType
                  ) {
                    const newCalcParams: CalculateExpenseParams = {
                      expense_type: newExpenseType,
                      units: numericUnits,
                    };

                    if (vehicleType) {
                      newCalcParams.vehicle_type = vehicleType;
                    }

                    lastCalculatedUnits.current = newCalcParams;
                    setCalcParams(newCalcParams);
                  }
                }, 700);
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

              // Apply the formatting function to the datetime fields before mapping
              const startDatetime = formatMySQLDatetime(
                combinedData.start_datetime
              );
              const endDatetime = formatMySQLDatetime(
                combinedData.end_datetime
              );

              // Mapped all potential fields to the submission object
              const mappedExpense = {
                // 7. Crucial: Keep the original ID if editing, or generate a new one if adding
                id: initialData?.id || crypto.randomUUID(),
                expense_type: combinedData.expense_type,
                expense_date: combinedData.expense_date,
                amount: combinedData.amount,
                custom_mercent: combinedData.merchant,
                custom_invoice_number: combinedData.invoice_number,
                custom_attach_receipt: combinedData.attach_receipt?.file_url,
                custom_units: combinedData.units,
                custom_currency: combinedData.currency,
                description: combinedData.description,
                custom_vehicle_type: combinedData.vehicle_type,
                custom_from_location: combinedData.from_location,
                custom_to_location: combinedData.to_location,
                custom_start_datetime: startDatetime, // Use the formatted value
                custom_end_datetime: endDatetime, // Use the formatted value
                custom_location: combinedData.location,
              };
              // 8. Call onSave with the mapped expense (it will either update or add in the main form)
              onSave(mappedExpense); 

              handleClose();
            }}
            options={{ noAlerts: true, showRequiredFields: true }}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseClaimModal;
