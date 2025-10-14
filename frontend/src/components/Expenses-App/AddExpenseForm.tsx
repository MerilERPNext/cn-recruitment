/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useMemo } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { usePostExpenseClaim } from "../../hooks/useExpense";
import { format } from "date-fns";

interface Expense {
  id: string;
  expenseCategory: string;
  expenseType: string;
  expenseDate?: string;
  currency?: string;
  amount?: number;
  merchant?: string;
  invoiceNumber?: string;
  [key: string]: any;
}

const AddExpenseForm: React.FC = () => {
  const formRef = useRef<any>(null);
  const dynamicFormRef = useRef<any>(null);
  const [formKey, setFormKey] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [mainFormData, setMainFormData] = useState<any>({});
  const [dynamicFormData, setDynamicFormData] = useState<any>({});
  const [showCategoryAndType, setShowCategoryAndType] = useState(true);
  const { data: currentEmployee } = useCurrentEmployee();
  const { mutate: submitExpenseClaim, isPending } = usePostExpenseClaim();

  const getBaseUrl = () =>
    // @ts-expect-error - Global variable set by Vite plugin
    window.__FORMIO_BASE_URL__ ||
    window.location?.origin ||
    "http://localhost:3000";

  const formSchema = useMemo(
    () => ({
      display: "form",
      components: [
        {
          type: "htmlelement",
          tag: "h2",
          content: "Create New Expense",
          className: "text-xl font-semibold mb-4",
        },
        {
          type: "columns",
          key: "categoryAndTypeRow",
          customClass: "flex min-w-full mt-4",
          columns: [
            {
              components: [
                {
                  type: "select",
                  key: "expenseCategory",
                  label: "Select Expense Category",
                  placeholder: "Select Expense Category",
                  dataSrc: "url",
                  data: {
                    url: `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_applicable_expense_categories`,
                    headers: [{ key: "Accept", value: "application/json" }],
                  },
                  selectValues: "message",
                  valueProperty: "name",
                  template: "<span>{{ item.category_name }}</span>",
                  validate: { required: true },
                  input: true,
                },
              ],
            },
            {
              components: [
                {
                  type: "select",
                  key: "expenseType",
                  label: "Select Expense Type",
                  placeholder: "Select Expense Type",
                  dataSrc: "url",
                  data: {
                    url: `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_expense_types_by_category?employee=${
                      currentEmployee?.employee_number
                    }&&reimbursement_category={{ data.expenseCategory }}`,
                    headers: [{ key: "Accept", value: "application/json" }],
                  },
                  selectValues: "message",
                  valueProperty: "name",
                  template: "<span>{{ item.name }}</span>",
                  refreshOn: "expenseCategory",
                  validate: { required: true },
                  input: true,
                },
              ],
            },
          ],
        },
      ],
    }),
    [currentEmployee]
  );

  const handleSubmit = (submission: any) => {
    console.log("Dynamic form data:", dynamicFormData);
    console.log("Form submitted:", submission.data);
    const newExpense: Expense = {
      id: Date.now().toString(),
      expenseCategory: submission.data.expenseCategory,
      expenseType: submission.data.expenseType,
    };
    setExpenses((prev) => [...prev, newExpense]);
    formRef.current?.reset();
  };

  const handleCheckboxChange = (id: string) =>
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDeleteSelected = () => {
    setExpenses((prev) => prev.filter((e) => !selectedExpenses.includes(e.id)));
    setSelectedExpenses([]);
  };

  const mapFieldsToFormio = (fields: any[]) =>
    fields
      .map((field) => {
        switch (field.fieldtype) {
          case "Date":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              format: "dd-MM-yyyy",
              enableTime: false,
              validate: { required: field.required },
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
            return {
              type: "number",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.required },
              input: true,
            };
          case "Data":
            return {
              type: "textfield",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.required },
              input: true,
            };
          case "Text":
            return {
              type: "textarea",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.required },
              rows: 5,
              input: true,
            };
          case "Attach":
            return {
              type: "file",
              key: field.fieldname, // e.g., "attach_receipt"
              label: field.label || "Attachment",
              storage: "customBase64", // this allows sending Base64 to backend
              validate: { required: field.required },
              input: true,
              fileTypes: [
                { label: "Documents", value: ".pdf,.doc,.docx" },
                { label: "Images", value: ".jpg,.jpeg,.png" },
              ],
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
                validate: { required: field.required },
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
              validate: { required: field.required },
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
        `${getBaseUrl()}/api/method/chatnext_expense_trips.expense_claim.get_expense_type_fields?expense_type=${expenseType}`
      );
      const data = await response.json();
      const fields = data.message?.fields || [];
      const components = mapFieldsToFormio(fields);
      setDynamicFields(components);
    } catch (error) {
      console.error("Error fetching expense type fields:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {(showCategoryAndType || expenses.length === 0) && (
        <Form
          key={formKey}
          ref={formRef}
          form={formSchema}
          submission={{ data: mainFormData }}
          onChange={(change: any) => {
            setMainFormData(change.data);
            const expenseType = change.data?.expenseType;
            if (expenseType) fetchExpenseTypeFields(expenseType);
          }}
          onSubmit={handleSubmit}
          options={{ noAlerts: true }}
        />
      )}

      {/* Dynamic Fields Form */}
      {dynamicFields.length > 0 && (
        <div className="mt-4">
          <Form
            key={`dynamic-${formKey}`}
            ref={dynamicFormRef}
            form={{
              display: "form",
              components: [
                {
                  type: "columns",
                  key: "dynamicColumns",
                  columns: [
                    { components: dynamicFields.filter((_, i) => i % 2 === 0) },
                    { components: dynamicFields.filter((_, i) => i % 2 !== 0) },
                  ],
                },
                {
                  type: "button",
                  action: "submit",
                  label: "Save",
                  theme: "primary",
                  key: "submitButton",
                  customClass: "mt-4",
                },
              ],
            }}
            onSubmit={(submission: any) => {
              const combinedData = {
                ...mainFormData,
                ...submission.data,
              };

              if (!combinedData.expenseCategory || !combinedData.expenseType) {
                alert("Please select Expense Category and Expense Type!");
                return;
              }

              const attachment = combinedData.attach_receipt?.[0]?.url || null;

              const newExpense: Expense = {
                id: Date.now().toString(),
                ...combinedData,
                attach_receipt: attachment,
              };

              setExpenses((prev) => [...prev, newExpense]);
              console.log("Saved Expense:", newExpense);

              // reset both
              formRef.current?.reset();
              dynamicFormRef.current?.reset();
              setMainFormData({});
              setDynamicFormData({});
              setDynamicFields([]);
              setShowCategoryAndType(false);
              setFormKey((prev) => prev + 1);
            }}
            onChange={(change: any) => setDynamicFormData(change.data)}
          />
        </div>
      )}

      {/* Expense Table */}
      {expenses.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Expense List</h2>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedExpenses.length === 0}
              className={`px-4 py-2 rounded ${
                selectedExpenses.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              Delete Selected
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-12 px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        setSelectedExpenses(
                          e.target.checked ? expenses.map((e) => e.id) : []
                        )
                      }
                      checked={
                        selectedExpenses.length === expenses.length &&
                        expenses.length > 0
                      }
                    />
                  </th>
                  <th className="px-4 py-2 text-left">Expense Category</th>
                  <th className="px-4 py-2 text-left">Expense Type</th>
                  <th className="px-4 py-2 text-left">Expense Date</th>
                  <th className="px-4 py-2 text-left">Merchant</th>
                  <th className="px-4 py-2 text-left">Invoice Number</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-t border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={() => handleCheckboxChange(expense.id)}
                      />
                    </td>
                    <td className="px-4 py-2">{expense.expenseCategory}</td>
                    <td className="px-4 py-2">{expense.expenseType}</td>
                    <td className="px-4 py-2">
                      {expense.expense_date
                        ? new Date(expense.expense_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-2">{expense.merchant || "-"}</td>
                    <td className="px-4 py-2">
                      {expense.invoice_number || "-"}
                    </td>
                    <td className="px-4 py-2">{expense.amount || "-"}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          setExpenses((prev) =>
                            prev.filter((e) => e.id !== expense.id)
                          );
                          setSelectedExpenses((prev) =>
                            prev.filter((id) => id !== expense.id)
                          );
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <button
              className="bg-blue-500 text-white font-bold px-6 py-2 rounded hover:bg-blue-600 mr-4"
              onClick={() => {
                setShowCategoryAndType(true);
                setFormKey((prev) => prev + 1);
              }}
            >
              Add More
            </button>

            <button
              className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700"
              disabled={expenses.length === 0 || isPending}
              onClick={() => {
                console.log(expenses);

                const payload = {
                  employee: currentEmployee?.employee_number,
                  employee_name: currentEmployee?.employee_name,
                  company: currentEmployee?.company,
                  posting_date: new Date().toISOString().split("T")[0],
                  expenses: expenses.map(
                    ({
                      id,
                      submitButton,
                      expenseType,
                      expenseCategory,
                      ...rest
                    }) => {
                      console.log(
                        "expense id with status button:",
                        id,
                        submitButton
                      );
                      const filteredRest = Object.fromEntries(
                        Object.entries(rest).filter(
                          ([, value]) =>
                            value !== null &&
                            value !== undefined &&
                            value !== ""
                        )
                      );

                      if (filteredRest.expense_date) {
                        filteredRest.expense_date = format(
                          new Date(filteredRest.expense_date),
                          "yyyy-MM-dd"
                        );
                      }
                      if (filteredRest.start_datetime) {
                        filteredRest.start_datetime = format(
                          new Date(filteredRest.start_datetime),
                          "yyyy-MM-dd HH:mm:ss"
                        );
                      }
                      if (filteredRest.end_datetime) {
                        filteredRest.end_datetime = format(
                          new Date(filteredRest.end_datetime),
                          "yyyy-MM-dd HH:mm:ss"
                        );
                      }

                      return {
                        ...filteredRest,
                        expense_type: expenseType,
                        reimbursement_category: expenseCategory,
                      };
                    }
                  ),
                };
                console.log("Submitting Payload:", payload);
                submitExpenseClaim(JSON.stringify(payload));
              }}
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExpenseForm;
