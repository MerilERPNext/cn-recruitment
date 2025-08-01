/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { X } from "lucide-react";

import { Formio } from "formiojs";
import { useExpenseTypes } from "../../hooks/useExpense";

interface FormioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (submission: any, fileObject?: File | null) => void;
}

const FormioNewExpenseItemModal: React.FC<FormioModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const expenseType = useExpenseTypes();
  const formioContainerRef = useRef<HTMLDivElement>(null);
  const formInstanceRef = useRef<any>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const newExpenseItemFormSchema = useMemo(
    () => ({
      display: "form",
      components: [
        {
          label: "Expense Type",
          tableView: true,
          dataSrc: "values",
          data: {
            values: expenseType?.data?.map((e: { name: string }) => ({
              label: e?.name,
              value: e?.name,
            })),
          },
          key: "expense-claim-type",
          type: "select",
          input: true,
          customClass: "appearance-none",
          placeholder: "Select type...",
          validate: {
            required: true,
          },
        },
        {
          label: "Amount",
          tableView: true,
          validate: {
            required: true,
            min: 0,
            pattern: "\\d+(\\.\\d{1,2})?",
          },
          key: "amount",
          type: "number",
          input: true,
          decimalLimit: 2,
          allowDecimals: true,
          placeholder: "0.00",
        },
        {
          label: "Description",
          tableView: true,
          validate: {
            required: true,
          },
          key: "description",
          type: "textarea",
          input: true,
          rows: 3,
          placeholder: "Add a description...",
        },
        {
          label: "Date",
          tableView: true,
          validate: {
            required: true,
          },
          key: "date",
          type: "datetime",
          input: true,
          format: "yyyy-MM-dd",
          enableTime: false,
          placeholder: "2025-07-24",
          widget: {
            type: "calendar",
            altInput: true,
            dateFormat: "yyyy-MM-dd",
            enableTime: false,
            mode: "single",
          },
        },
        {
          label: "Attachments",
          key: "attachments",
          type: "file",
          storage: "base64",
          tableView: true,
          input: true,
          webcam: true,
          validate: {
            required: true,
          },
          fileTypes: [
            { label: "Images", value: "image/*" },
            { label: "Documents", value: "application/*" },
          ],
          image: false,
          tooltip: "Upload receipts or supporting documents.",
          fileViewTemplate:
            '<div class="flex items-center space-x-2">' +
            '<svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h6l4 4v6a2 2 0 01-2 2H9a2 2 0 01-2-2z"/></svg>' +
            '<a class="text-blue-600 underline" href="${url}" target="_blank" rel="noreferrer">${originalName}</a>' +
            "</div>",
        },
      ],
    }),
    [expenseType]
  );

  useEffect(() => {
    if (isOpen && formioContainerRef.current) {
      Formio.createForm(formioContainerRef.current, newExpenseItemFormSchema, {
        render: {
          submit: false,
          cancel: false,
        },
      })
        .then((form: any) => {
          formInstanceRef.current = form;

          form.on("change", (submission: any) => {
            if (
              submission.data &&
              submission.data.attachments &&
              submission.data.attachments.length > 0
            ) {
              const attachment = submission.data.attachments[0];
              if (attachment.file instanceof File) {
                setLocalFile(attachment.file);
              } else {
                setLocalFile(null);
              }
            } else {
              setLocalFile(null);
            }
          });

          form.on("submit", (submission: any) => {
            console.log("Form.io internal submit event fired:", submission);
            onSubmit(submission.data, localFile);
            onClose();
          });

          form.on("error", (errors: any) => {
            console.error("Form.io validation errors:", errors);
            alert("Please correct the errors in the form.");
          });
        })
        .catch((err: any) => {
          console.error("Error creating Form.io form:", err);
        });

      return () => {
        if (formInstanceRef.current) {
          formInstanceRef.current.destroy();
          formInstanceRef.current = null;
        }
      };
    }
  }, [isOpen, onSubmit, onClose, localFile, newExpenseItemFormSchema]);

  const handleSaveClick = () => {
    if (formInstanceRef.current) {
      formInstanceRef.current.submit();
    } else {
      console.warn("Form.io instance not ready yet for submission.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-xl w-full max-w-md p-6 shadow-lg flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
          <h2 className="text-lg m-auto font-semibold text-gray-800">
            New Expense Item
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-grow" ref={formioContainerRef}>
          {/* Form.io will inject its HTML here */}
        </div>

        <div className="flex justify-between space-x-4 pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormioNewExpenseItemModal;
