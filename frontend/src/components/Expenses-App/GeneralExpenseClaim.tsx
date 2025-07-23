import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, X } from "lucide-react";
// Import all necessary icons, including FileIcon (aliased from File)
import { FileText, File as FileIcon } from "lucide-react";

import { Formio } from "formiojs";

interface ExpenseItem {
  id: string;
  type: string;
  date: string; // Required
  amount: number;
  description: string;
  attachmentUrl?: string;
  attachmentType?: string;
  fileName?: string;
  fileObject?: File;
}

const MOCK_EXPENSE_ITEMS: ExpenseItem[] = [
  {
    id: "exp1",
    type: "Travel",
    date: "2024-07-28",
    amount: 150.0,
    description: "Flight to San Francisco",
    attachmentUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Receipt",
    attachmentType: "image/png",
  },
];

const newExpenseItemFormSchema = {
  display: "form",
  components: [
    {
      label: "Expense Type",
      tableView: true,
      dataSrc: "values",
      data: {
        values: [
          { label: "Travel", value: "Travel" },
          { label: "Food", value: "Food" },
          { label: "Accommodation", value: "Accommodation" },
          { label: "Supplies", value: "Supplies" },
          { label: "Other", value: "Other" },
        ],
      },
      key: "expenseType",
      type: "select",
      input: true,
      widget: "html5",
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
      tableView: false,
      webcam: true,
      fileTypes: [
        { label: "Images", value: "image/*" },
        { label: "Documents", value: "application/*" },
      ],
      image: true,
      imageSize: "200",
      storage: "base64",
      key: "attachments",
      type: "file",
      input: true,
      tooltip: "Upload receipts or supporting documents.",
    },
  ],
};

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
  const formioContainerRef = useRef<HTMLDivElement>(null);
  const formInstanceRef = useRef<any>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

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
  }, [isOpen, onSubmit, onClose, localFile]);

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
            className="flex-1 py-3 rounded-3xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const GeneralExpenseClaim: React.FC = () => {
  const navigate = useNavigate();
  const [expenseItems, setExpenseItems] =
    useState<ExpenseItem[]>(MOCK_EXPENSE_ITEMS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const objectUrls = useRef<Record<string, string>>({}); // Using a ref to hold object URLs for cleanup

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleDeleteItem = useCallback((id: string) => {
    setExpenseItems((prevItems) => {
      const itemToDelete = prevItems.find((item) => item.id === id);
      if (
        itemToDelete &&
        itemToDelete.attachmentUrl &&
        itemToDelete.attachmentUrl.startsWith("blob:")
      ) {
        const urlToRevoke = objectUrls.current[itemToDelete.id];
        if (urlToRevoke) {
          URL.revokeObjectURL(urlToRevoke);
          delete objectUrls.current[itemToDelete.id];
        }
      }
      return prevItems.filter((item) => item.id !== id);
    });
  }, []);

  const handleAddExpenseItem = useCallback(
    (formData: any, fileObjectFromModal: File | null | undefined) => {
      const newId = `exp${expenseItems.length + 1}-${Date.now()}`;
      let attachmentUrl: string =
        "https://placehold.co/80x80/e0e0e0/000000?text=Receipt";
      let attachmentType: string = "image/png";
      let fileName: string | undefined;

      if (fileObjectFromModal) {
        attachmentUrl = URL.createObjectURL(fileObjectFromModal);
        objectUrls.current[newId] = attachmentUrl; // Store for revocation
        attachmentType = fileObjectFromModal.type;
        fileName = fileObjectFromModal.name;
      } else if (formData.attachments && formData.attachments.length > 0) {
        const attachedFile = formData.attachments[0];
        attachmentUrl = attachedFile.url || attachmentUrl;
        attachmentType = attachedFile.type || attachmentType;
        fileName = attachedFile.name || undefined;
      }

      setExpenseItems((prevItems) => [
        ...prevItems,
        {
          id: newId,
          type: formData.expenseType,
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date,
          attachmentUrl: attachmentUrl,
          attachmentType: attachmentType,
          fileName: fileName,
          fileObject: fileObjectFromModal || undefined,
        },
      ]);
      setIsModalOpen(false);
    },
    [expenseItems.length]
  );

  const totalAmount = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const advances = 0;
  const netPayable = totalAmount - advances;

  useEffect(() => {
    return () => {
      for (const id in objectUrls.current) {
        if (objectUrls.current[id].startsWith('blob:')) {
            URL.revokeObjectURL(objectUrls.current[id]);
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <FormioNewExpenseItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpenseItem}
      />

      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl m-auto font-bold text-gray-900">
            General Expense Claim
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center space-x-4">
          <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-user h-6 w-6 text-gray-600"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">John Doe</p>
            <p className="text-sm text-gray-600">Sales Department</p>
          </div>
        </div>

        <div className="bg-white p-4">
          <label
            htmlFor="expensePolicy"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Expense Travel Policy (Optional)
          </label>
          <select
            id="expensePolicy"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none "
          >
            <option value="">Select Policy...</option>
            <option value="policyA">Policy A - Domestic Travel</option>
            <option value="policyB">Policy B - International Travel</option>
            <option value="policyC">Policy C - Local Commute</option>
          </select>
        </div>

        <div className="bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Expense Items
          </h2>
          <div className="space-y-4">
            {expenseItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No expense items added yet.
              </p>
            ) : (
              expenseItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-gray-900">{item.type}</p>
                    <p className="text-sm text-gray-600">Date: {item.date}</p>
                    <p className="text-sm text-gray-600">
                      Amount: {item.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Wrap the display content in an <a> tag for download */}
                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        download={item.fileName || "download"} // Use the download attribute
                        className="w-22 h-22 flex-shrink-0 cursor-pointer" // Add cursor-pointer for visual feedback
                        target="_blank" // Keep target_blank to avoid current page navigation
                        rel="noopener noreferrer"
                        // Add some hover/focus styles if desired
                      >
                        {item.attachmentType?.startsWith("image/") ? (
                          <img
                            src={item.attachmentUrl}
                            alt="Receipt"
                            className="w-22 h-22 object-cover rounded-md"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                "https://placehold.co/80x80/e0e0e0/000000?text=Error";
                            }}
                          />
                        ) : item.attachmentType?.startsWith("application/") ||
                          item.attachmentType?.startsWith("text/") ? (
                          <div className="w-22 h-22 bg-gray-100 rounded-md flex flex-col items-center justify-center p-2 text-gray-600 text-center text-xs border border-gray-300">
                            {item.attachmentType?.includes("pdf") ? (
                              <FileText className="h-8 w-8 text-red-500 mb-1" />
                            ) : item.attachmentType?.includes("word") ||
                              item.attachmentType?.includes("document") ? (
                              <FileText className="h-8 w-8 text-blue-500 mb-1" />
                            ) : item.attachmentType?.includes("excel") ||
                              item.attachmentType?.includes("sheet") ? (
                              <FileText className="h-8 w-8 text-green-500 mb-1" />
                            ) : (
                              <FileIcon className="h-8 w-8 text-gray-500 mb-1" />
                            )}
                            <span className="truncate w-full font-medium">
                              {item.fileName || "Document"}
                            </span>
                            {/* Removed the 'View' button/link text here */}
                          </div>
                        ) : (
                          // Fallback for no attachment or unrecognized type, but still clickable for download
                          <img
                            src="https://placehold.co/80x80/e0e0e0/000000?text=Receipt"
                            alt="Receipt"
                            className="w-22 h-22 object-cover rounded-md"
                          />
                        )}
                      </a>
                    )}
                    {/* Placeholder if no attachmentUrl */}
                    {!item.attachmentUrl && (
                        <img
                            src="https://placehold.co/80x80/e0e0e0/000000?text=Receipt"
                            alt="Receipt"
                            className="w-22 h-22 object-cover rounded-md flex-shrink-0"
                        />
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 mt-[-60px] rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${item.type} expense`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center py-3 mt-4 border border-gray-300 rounded-3xl text-blue-600 font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl mr-2">+</span> Add Expense Item
          </button>
        </div>

        <div className="bg-white p-4 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Total Amount</span>
              <span className="font-medium">{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Advances</span>
              <span className="font-medium">{advances.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg border-t pt-2 mt-2">
              <span>Net Payable</span>
              <span>{netPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <button
            onClick={() => console.log("Save as Draft clicked")}
            className="flex-1 py-3 rounded-3xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => console.log("Submit clicked")}
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralExpenseClaim;