import React, { useState, useMemo, useRef, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useCalculateExpenseAmount } from "../../../hooks/useExpense";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { CalculateExpenseParams } from "../../../types/expenseAdvance";
import { formatMySQLDatetime } from "../../../utils/dateTimeFormatUtils";

interface ExpenseBreakupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: any) => void;
  initialData?: any;
  advanceType: string | null;
}

const ExpenseBreakupModal: React.FC<ExpenseBreakupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  advanceType,
}) => {
  const [formKey, setFormKey] = useState(0);
  const [formData, setFormData] = useState<any>(initialData || {});
  const [calcParams, setCalcParams] = useState<any>();
  const formioInstanceRef = useRef<any>(null);
  const { data: calcData } = useCalculateExpenseAmount(calcParams);

  const lastExpenseType = useRef<string | null>(null);
  const lastCalculatedUnits = useRef<CalculateExpenseParams | null>(null);
  const { data: currentEmployee } = useCurrentEmployee();
  const employeeId = currentEmployee?.name;

  const mapStoredDataToForm = (storedData: any) => {
    if (!storedData) return {};

    const formReadyData = {
      // Basic Fields
      id: storedData.id,
      expense_type: storedData.expense_type,
      amount: storedData.amount,
      description: storedData.description,
      expense_date: storedData.expense_date,
      currency: storedData.custom_currency,
      invoice_number: storedData.custom_invoice_number,
      merchant: storedData.custom_mercent,
      units: storedData.custom_units,
      vehicle_type: storedData.custom_vehicle_type,
      from_location: storedData.custom_from_location,
      to_location: storedData.custom_to_location,
      start_datetime: storedData.custom_start_datetime,
      end_datetime: storedData.custom_end_datetime,
      location: storedData.custom_location,
      attach_receipt: storedData.custom_attach_receipt
        ? [
            {
              name:
                storedData.custom_attach_receipt.substring(
                  storedData.custom_attach_receipt.lastIndexOf("/") + 1
                ) || "Attached File",
              originalName: "Attached File",
              size: 1,
              type: "application/octet-stream",
              url: storedData.custom_attach_receipt,
              data: storedData.custom_attach_receipt,
              storage: "customBase64",
            },
          ]
        : [],
    };

    return Object.fromEntries(
      Object.entries(formReadyData).filter(([, value]) => value !== undefined)
    );
  };

  useEffect(() => {
    if (isOpen) {
      const remappedData = mapStoredDataToForm(initialData);
      setFormData(remappedData);

      setFormKey((prev) => prev + 1);

      lastExpenseType.current = initialData?.expense_type || null;
      lastCalculatedUnits.current = null;

      if (initialData?.expense_type) {
        fetchExpenseTypeFields(initialData.expense_type);
      } else {
        setFormSchema(initialSchema);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
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

  const mapFieldsToFormio = (fields: any[]) =>
    fields
      .map((field) => {
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
                description: field.description,
              };
            }
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
                  url: `/api/method/chatnext_expense_trips.employee_advance.get_allowed_currencies?employee=${employeeId}&advance_type=${encodeURIComponent(
                    advanceType || ""
                  )}`,
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message[0]",
                // defaultValue: "INR",
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
                  url: `/api/method/chatnext_expense_trips.expense_claim.get_applicable_vehicle_types?employee=${employeeId}&claim_type=${
                    formData?.expense_type || ""
                  }`,
                },
                selectValues: "message",
                valueProperty: "vehicle_category",
                template: "<span>{{ item.vehicle_category }}</span>",
                validate: {
                  required: !!field.required,
                  customMessage: `${field?.label} is required`,
                },
                html: true,
                input: true,
              };
            }
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
    onClose();
  };

  if (!isOpen) return null;

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
            submission={{ data: formData }}
            onFormReady={(formio: any) => {
              formioInstanceRef.current = formio;
            }}
            onChange={(change: any) => {
              const newExpenseType = change.data?.expense_type;
              const units = change.data?.units;
              const numericUnits = Number(units);
              const vehicleType = change.data?.vehicle_type;

              setFormData(change.data);

              if (
                newExpenseType &&
                newExpenseType !== lastExpenseType.current
              ) {
                lastExpenseType.current = newExpenseType;
                lastCalculatedUnits.current = null;
                fetchExpenseTypeFields(newExpenseType);
              }

              if (
                newExpenseType &&
                ((units !== null && units !== undefined) || vehicleType)
              ) {
                clearTimeout((window as any)._calcTimer);
                (window as any)._calcTimer = setTimeout(() => {
                  const lastParams = lastCalculatedUnits.current;

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

              if (formioInstanceRef.current) {
                const vehicleField =
                  formioInstanceRef.current.getComponent("vehicle_type");
                if (vehicleField) vehicleField.refresh();
              }
            }}
            onSubmit={(submission: any) => {
              const combinedData = submission.data;

              let attachReceiptValue = null;

              if (
                combinedData.attach_receipt &&
                Array.isArray(combinedData.attach_receipt) &&
                combinedData.attach_receipt.length > 0
              ) {
                attachReceiptValue =
                  combinedData.attach_receipt[0]?.data ||
                  combinedData.attach_receipt[0]?.url ||
                  null;
              }

              if (!attachReceiptValue && initialData?.custom_attach_receipt) {
                attachReceiptValue = initialData.custom_attach_receipt;
              }

              const startDatetime = formatMySQLDatetime(
                combinedData.start_datetime
              );
              const endDatetime = formatMySQLDatetime(
                combinedData.end_datetime
              );
              let finalAttachValue = attachReceiptValue;

              if (
                typeof attachReceiptValue === "object" &&
                attachReceiptValue !== null
              ) {
                finalAttachValue = attachReceiptValue.file_url || null;
              }

              const mappedExpense = {
                id: initialData?.id || crypto.randomUUID(),
                expense_type: combinedData.expense_type,
                expense_date: combinedData.expense_date,
                custom_amount_in_other_currency: combinedData.amount,
                custom_mercent: combinedData.merchant,
                custom_invoice_number: combinedData.invoice_number,
                custom_attach_receipt: finalAttachValue,
                custom_units: combinedData.units,
                custom_currency: combinedData.currency,
                description: combinedData.description,
                custom_vehicle_type: combinedData.vehicle_type,
                custom_from_location: combinedData.from_location,
                custom_to_location: combinedData.to_location,
                custom_start_datetime: startDatetime,
                custom_end_datetime: endDatetime,
                custom_location: combinedData.location,
              };
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

export default ExpenseBreakupModal;
