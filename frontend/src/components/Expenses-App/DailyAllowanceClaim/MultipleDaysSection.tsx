/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from "react";
import { Formio } from "formiojs";

interface MultipleDaysSectionProps {
  isMultipleDays: boolean;
  onToggleMultipleDays: () => void;
  fromDate: string;
  toDate: string;
  singleDate: string;
  onDateRangeChange: (dates: { fromDate: string; toDate: string }) => void;
  onSingleDateChange: (date: string) => void;
}

interface FormioDateInputProps {
  initialDate: string;
  onDateChange: (date: string) => void;
  schema: any; // Can be dateRangeFormSchema or singleDateFormSchema
}

// Form.io Schema for From Date and To Date (Multiple Days)
const dateRangeFormSchema = {
  display: "form",
  components: [
    {
      label: "From",
      tableView: true,
      key: "fromDate",
      type: "datetime",
      input: true,
      format: "yyyy-MM-dd",
      enableTime: false,
      validate: {
        required: true,
      },
    },
    {
      label: "To",
      tableView: true,
      key: "toDate",
      type: "datetime",
      input: true,
      format: "yyyy-MM-dd",
      enableTime: false,
      validate: {
        required: true,
      },
    },
  ],
};

// Form.io Schema for a Single Date (When Multiple Days is Off)
const singleDateFormSchema = {
  display: "form",
  components: [
    {
      label: "Date",
      tableView: true,
      key: "singleDate",
      type: "datetime",
      input: true,
      format: "yyyy-MM-dd",
      enableTime: false,
      validate: {
        required: true,
      },
    },
  ],
};

// Reusable Form.io component for Date (can be single or range)
export const FormioDateInput: React.FC<FormioDateInputProps> = ({
  initialDate,
  onDateChange,
  schema,
}) => {
  const formioContainerRef = useRef<HTMLDivElement>(null);
  const formInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (formioContainerRef.current) {
      if (formInstanceRef.current) {
        formInstanceRef.current.destroy();
        formInstanceRef.current = null;
      }

      Formio.createForm(formioContainerRef.current, schema, {
        render: {
          submit: false,
          cancel: false,
        },
      })
        .then((form: any) => {
          formInstanceRef.current = form;
          // Set initial submission data based on the schema's key
          const key = schema.components[0].key; // Assumes the first component is the date field
          form.submission = {
            data: {
              [key]: initialDate,
            },
          };

          form.on("change", (submission: any) => {
            const dateValue = submission.data[key];
            onDateChange(dateValue || "");
          });

          form.on("error", (errors: any) => {
            console.error("Form.io date validation errors:", errors);
            const errorMessage = errors
              .map((err: any) => err.message)
              .join("\n");
            alert(`Please correct the date errors:\n${errorMessage}`);
          });
        })
        .catch((err: any) => {
          console.error("Error creating Form.io date form:", err);
        });

      return () => {
        if (formInstanceRef.current) {
          formInstanceRef.current.destroy();
          formInstanceRef.current = null;
        }
      };
    }
  }, [initialDate, onDateChange, schema]);

  return <div ref={formioContainerRef} className="formio-date-input"></div>;
};

const MultipleDaysSection: React.FC<MultipleDaysSectionProps> = ({
  isMultipleDays,
  onToggleMultipleDays,
  fromDate,
  toDate,
  singleDate,
  onDateRangeChange,
  onSingleDateChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <label
          htmlFor="multipleDaysToggle"
          className="text-base font-semibold text-gray-900 cursor-pointer"
        >
          Multiple Days
        </label>
        <label
          htmlFor="multipleDaysToggle"
          className="relative inline-flex items-center cursor-pointer"
        >
          <input
            type="checkbox"
            id="multipleDaysToggle"
            className="sr-only peer"
            checked={isMultipleDays}
            onChange={onToggleMultipleDays}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-100 rounded-xl peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-500 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
        </label>
      </div>

      {isMultipleDays ? (
        <div className="flex flex-col sm:flex-row gap-4">
          <FormioDateInput
            initialDate={fromDate}
            onDateChange={(newDate) =>
              onDateRangeChange({ fromDate: newDate, toDate: toDate })
            }
            schema={{
              display: "form",
              components: [
                { ...dateRangeFormSchema.components[0], key: "fromDate" },
              ],
            }}
          />
          <FormioDateInput
            initialDate={toDate}
            onDateChange={(newDate) =>
              onDateRangeChange({ fromDate: fromDate, toDate: newDate })
            }
            schema={{
              display: "form",
              components: [
                { ...dateRangeFormSchema.components[1], key: "toDate" },
              ],
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          <FormioDateInput
            initialDate={singleDate}
            onDateChange={onSingleDateChange}
            schema={singleDateFormSchema}
          />
        </div>
      )}
    </div>
  );
};

export default MultipleDaysSection;
