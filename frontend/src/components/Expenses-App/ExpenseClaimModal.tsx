import React, { useState, useMemo, useRef, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useCalculateExpenseAmount } from "../../hooks/useExpense";
import { useCurrentEmployee } from "../../hooks/useEmployee";

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
  const [calcParams, setCalcParams] = useState<any>();
  const formioInstanceRef = useRef<any>(null);
  const { data: calcData } = useCalculateExpenseAmount(calcParams);

  const lastExpenseType = useRef<string | null>(null);
  const lastCalculatedUnits = useRef<number | null>(null);
  const [isAmountReadonly, setIsAmountReadonly] = useState(false);
  const { data: currentEmployee } = useCurrentEmployee();
  const employeeId = currentEmployee?.name;

  useEffect(() => {
    // Only run if we have new data AND the amount field is readonly
    if (calcData && isAmountReadonly) {
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
  }, [calcData, isAmountReadonly, calcParams]);

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
              format: "dd-MM-yyyy",
              placeholder: "Select date",
              validate: { required: !!field.required },
              input: true,
            };
          case "Datetime":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              format: "yyyy-MM-dd HH:mm",
              enableTime: true,
              enableDate: true,
              placeholder: "Select date and time",
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
              },
              validate: { required: field.required },
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
            // Treat 'units' as 'number' if it's supposed to be calculated
            if (field.fieldname === "units") {
              return {
                type: "number",
                key: field.fieldname,
                label: field.label,
                input: true,
                validate: { required: !!field.required },
                description: field.description, // Keep description if available
              };
            }
            // Treat 'units' as 'number' if it's supposed to be calculated
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
          case "Link":
            if (
              field.fieldname === "currency" &&
              field.options === "Currency"
            ) {
              return {
                type: "select",
                key: field.fieldname,
                label: field.label,
                dataSrc: "url",

                data: {
                  url: `/api/method/chatnext_expense_trips.employee_advance.get_allowed_currencies?employee=${employeeId}`,
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message[0]",
                defaultValue: "INR",
                template: "<span>{{ item }}</span>",
                valueProperty: "",
                validate: { required: field.required },
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
                label: field.label,
                dataSrc: "url",
                data: {
                  url: `/api/resource/Daily%20Allowance%20Vehicle%20Category`,
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
                validate: { required: field.required },
                input: true,
              };
            }

            // Generic Link field handling
            return {
              type: "select",
              key: field.fieldname,
              label: field.label,
              dataSrc: "url",
              data: {
                url: `/api/method/chatnext_expense_trips.expense_claim.get_link_options?doctype=${field.options}`,
              },
              template: "<span>{{ item.name }}</span>",
              valueProperty: "name",
              selectValues: "message",
              validate: { required: field.required },
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
          <h2 className="font-semibold text-lg">Add Expense Advance</h2>
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
            onFormReady={(formio: any) => {
              formioInstanceRef.current = formio;
            }}
            onChange={(change: any) => {
              const newExpenseType = change.data?.expense_type;
              setFormData(change.data);

              if (
                newExpenseType &&
                newExpenseType !== lastExpenseType.current
              ) {
                lastExpenseType.current = newExpenseType;
                lastCalculatedUnits.current = null;
                fetchExpenseTypeFields(newExpenseType);
              }

              const units = change.data?.units;
              const numericUnits = Number(units);

              if (isAmountReadonly && units && newExpenseType) {
                // Delay a bit
                clearTimeout((window as any)._calcTimer);
                (window as any)._calcTimer = setTimeout(() => {
                  if (numericUnits !== lastCalculatedUnits.current) {
                    lastCalculatedUnits.current = numericUnits;
                    setCalcParams({
                      expense_type: newExpenseType,
                      units: numericUnits,
                    });
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

              // Mapped all potential fields to the submission object
              const mappedExpense = {
                id: crypto.randomUUID(),
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
                custom_start_datetime: combinedData.start_datetime,
                custom_end_datetime: combinedData.end_datetime,
                custom_location: combinedData.location,
              };
              console.log("mappedExpense", mappedExpense);

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
