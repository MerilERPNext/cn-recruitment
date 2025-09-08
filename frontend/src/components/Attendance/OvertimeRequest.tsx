/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef, useState } from "react";
import "../../formio.custom.css";

const overtimeForm = {
  display: "form",
  components: [
    {
      type: "datagrid",
      key: "overtimeRows",
      label: "Overtime Requests",
      addAnother: "New Row",
      customClass: "border-0",

      components: [
        {
          type: "datetime",
          key: "shiftDate",
          label: "Shift Date",
          format: "dd-MM-yyyy",
          enableTime: false,
          input: true,
        },
        {
          type: "datetime",
          key: "startDate",
          label: "Start Date",
          format: "dd-MM-yyyy",
          enableTime: false,
          input: true,
        },
        {
          type: "time",
          key: "startTime",
          label: "Start Time",
          input: true,
        },
        {
          type: "datetime",
          key: "endDate",
          label: "End Date",
          format: "dd-MM-yyyy",
          enableTime: false,
          input: true,
        },
        {
          type: "time",
          key: "endTime",
          label: "End Time",
          input: true,
        },
        {
          type: "textfield",
          key: "message",
          label: "Message",
          validate: { required: true },
          input: true,
        },
      ],
    },
    {
      type: "file",
      key: "attachment",
      label: "Attachment",
      storage: "base64",
      input: true,
    },
  ],
};

interface RequestOvertimeProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
}

const OvertimeRequest = ({ onCancel, onSuccess }: RequestOvertimeProps) => {
  const formInstance = useRef<any>(null);
  const [formData, setFormData] = useState<any>({});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={() => {
        if (onCancel) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Planned Overtime Request
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onCancel) {
                onCancel();
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <Form
            form={overtimeForm}
            onFormReady={(instance: any) => {
              formInstance.current = instance;
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              formClass: "space-y-6",
              rowClass: "flex flex-col md:flex-row md:space-x-4",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
            onChange={({ data }: { data: any }) => {
              setFormData(data);
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <button
            onClick={() => {
              if (onSuccess) {
                onSuccess(formData);
              }
            }}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeRequest;
