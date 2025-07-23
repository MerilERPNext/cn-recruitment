import React, { useEffect, useRef } from "react";
import { Form as FormioForm } from "formiojs";
import 'formiojs/dist/formio.form.css';

interface FormioSubmission {
  data: {
    leaveType: string;
    fromDate: string;
    toDate: string;
    halfDay: boolean;
    reason: string;
    attachment?: {
      name: string;
      size: number;
      type: string;
      url: string;
    }[];
  };
}

interface RequestLeaveProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const formSchema = {
  title: "Leave Request Form",
  name: "leaveRequestForm",
  display: "form",
  components: [
    {
      type: "select",
      key: "leaveType",
      label: "Leave Type",
      placeholder: "Select Leave Type",
      data: {
        values: [
          { label: "Sick Leave", value: "sick" },
          { label: "Casual Leave", value: "casual" },
          { label: "Annual Leave", value: "annual" },
        ],
      },
      validate: { required: true },
      input: true,
      customClass: "mb-4"
    },
    {
      type: "columns",
      key: "dateColumns",
      columns: [
        {
          width: 6,
          components: [
            {
              type: "datetime",
              key: "fromDate",
              label: "From Date",
              placeholder: "Select Date",
              format: "yyyy-MM-dd",
              enableDate: true,
              enableTime: false,
              validate: { required: true },
              input: true,
              customClass: "mb-4"
            },
          ],
        },
        {
          width: 6,
          components: [
            {
              type: "datetime",
              key: "toDate",
              label: "To Date",
              placeholder: "Select Date",
              format: "yyyy-MM-dd",
              enableDate: true,
              enableTime: false,
              validate: { required: true },
              input: true,
              customClass: "mb-4"
            },
          ],
        },
      ],
    },
    {
      type: "checkbox",
      key: "halfDay",
      label: "Half-Day Leave",
      description: "Apply for a morning or afternoon leave",
      input: true,
      labelPosition: "bottom",
      customClass: "custom-halfday-toggle border border-gray-300 rounded-lg mt-6 shadow-sm p-2 bg-white mb-4"
    },
    {
      type: "textarea",
      key: "reason",
      label: "Reason",
      placeholder: "Enter the reason for leave",
      rows: 3,
      validate: { required: true, minLength: 10 },
      input: true,
      customClass: "mb-4"
    },
    {
      type: "file",
      key: "attachment",
      label: "Attachment (Optional)",
      fileTypes: [
        { label: "Documents", value: ".pdf,.doc,.docx" },
        { label: "Images", value: ".jpg,.jpeg,.png" }
      ],
      filePattern: "*/*",
      storage: "base64",
      image: false,
      input: true,
      customClass: "mb-6"
    },
    {
      type: "button",
      action: "submit",
      label: "Submit Request",
      key: "submit",
      input: true,
      theme: "primary",
      customClass: "bg-black w-full font-medium rounded-lg text-white py-2 hover:bg-gray-800 transition-colors"
    },
  ],
};

const RequestLeave: React.FC<RequestLeaveProps> = ({ onSuccess, onCancel }) => {
  const formRef = useRef<HTMLDivElement>(null);
  const formioInstance = useRef<any>(null);

  useEffect(() => {
    if (formRef.current) {
      formioInstance.current = new FormioForm(formRef.current, formSchema);

      formioInstance.current.form = formSchema;

      formioInstance.current.on('submit', (submission: FormioSubmission) => {
        console.log('Form submitted:', submission);
        if (onSuccess) {
          onSuccess();
        }
      });

      // Add custom class to the form container
      formioInstance.current.on('render', () => {
        const formElement = formRef.current?.querySelector('.formio-form');
        if (formElement) {
          formElement.classList.add('space-y-4');
        }
      });
    }

    return () => {
      if (formioInstance.current) {
        formioInstance.current.destroy(true);
      }
    };
  }, [onSuccess]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div ref={formRef} className="formio-container"></div>
      {onCancel && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestLeave;