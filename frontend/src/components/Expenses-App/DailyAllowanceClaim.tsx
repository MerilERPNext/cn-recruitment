import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  FileText,
  File as FileIcon,
} from "lucide-react";
import { Formio } from "formiojs"; 
import { useNavigate } from "react-router-dom";

// Define interfaces for data structures
interface ExpenseItem {
  id: string;
  type: string;
  amount: number;
  attachmentUrl?: string;
  attachmentType?: string;
  fileName?: string;
  fileObject?: File;
  eligibleAmount: number; // New field for eligible amount
}

// Form.io Schema for a single Daily Allowance Expense Item
const dailyAllowanceExpenseFormSchema = {
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
      label: "Attachments",
      tableView: false,
      webcam: true,
      fileTypes: [
        { label: "Images", value: "image/*" },
        { label: "Documents", value: "application/*" },
      ],
      image: true,
      imageSize: "200",
      storage: "base64", // Or 'url' if you have a backend for file storage
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

// Reusable Form.io Modal Component
const FormioDailyAllowanceExpenseModal: React.FC<FormioModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const formioContainerRef = useRef<HTMLDivElement>(null);
  const formInstanceRef = useRef<any>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen && formioContainerRef.current) {
      // Destroy any existing form instance before creating a new one
      if (formInstanceRef.current) {
        formInstanceRef.current.destroy();
        formInstanceRef.current = null;
      }

      Formio.createForm(
        formioContainerRef.current,
        dailyAllowanceExpenseFormSchema,
        {
          render: {
            submit: false,
            cancel: false,
          },
        }
      )
        .then((form: any) => {
          formInstanceRef.current = form;

          // Clear previous submission data if any
          form.submission = { data: {} };

          form.on("change", (submission: any) => {
            if (
              submission.data &&
              submission.data.attachments &&
              submission.data.attachments.length > 0
            ) {
              const attachment = submission.data.attachments[0];
              // Form.io's file component stores the actual File object in 'file' property
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
            onClose(); // Close modal after successful submission
          });

          form.on("error", (errors: any) => {
            console.error("Form.io validation errors:", errors);
            // In a real app, use a custom modal for errors, not alert
            alert("Please correct the errors in the form.");
          });
        })
        .catch((err: any) => {
          console.error("Error creating Form.io form:", err);
        });

      // Cleanup function
      return () => {
        if (formInstanceRef.current) {
          formInstanceRef.current.destroy();
          formInstanceRef.current = null;
        }
        setLocalFile(null); // Clear local file state on close/unmount
      };
    } else if (!isOpen && formInstanceRef.current) {
      // If modal is closed, destroy form instance
      formInstanceRef.current.destroy();
      formInstanceRef.current = null;
      setLocalFile(null);
    }
  }, [isOpen, onSubmit, onClose, localFile]); // Depend on localFile for proper state updates

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
            Add New Expense
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

const DailyAllowanceClaim: React.FC = () => {
  // State for the "Multiple Days" toggle and dates
  const navigate = useNavigate();
  const [isMultipleDays, setIsMultipleDays] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const objectUrls = useRef<Record<string, string>>({}); // Using a ref to hold object URLs for cleanup

  // Mock initial expense items based on the screenshot (these are static examples)
  // New items will be added dynamically via the modal
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
    {
      id: "exp-travel-1",
      type: "Travel",
      amount: 1500,
      eligibleAmount: 1500,
      attachmentUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Travel", // Placeholder
      attachmentType: "image/png",
    },
  ]);

  // Handler for the back button
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Handler for adding a new expense row via Form.io modal
  const handleAddExpenseItem = useCallback(
    (formData: any, fileObjectFromModal: File | null | undefined) => {
      const newId = `exp${expenseItems.length + 1}-${Date.now()}`;
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      let fileName: string | undefined;

      if (fileObjectFromModal) {
        attachmentUrl = URL.createObjectURL(fileObjectFromModal);
        objectUrls.current[newId] = attachmentUrl; // Store for revocation
        attachmentType = fileObjectFromModal.type;
        fileName = fileObjectFromModal.name;
      } else if (formData.attachments && formData.attachments.length > 0) {
        const attachedFile = formData.attachments[0];
        // If storage is 'base64', Form.io provides the data URL directly
        attachmentUrl = attachedFile.url || attachedFile.data || undefined;
        attachmentType = attachedFile.type || undefined;
        fileName = attachedFile.name || undefined;
      }

      setExpenseItems((prevItems) => [
        ...prevItems,
        {
          id: newId,
          type: formData.expenseType,
          amount: parseFloat(formData.amount),
          eligibleAmount: parseFloat(formData.amount), // For simplicity, eligible amount equals claimed amount
          attachmentUrl: attachmentUrl,
          attachmentType: attachmentType,
          fileName: fileName,
          fileObject: fileObjectFromModal || undefined,
        },
      ]);
      setIsModalOpen(false); // Close modal after adding
    },
    [expenseItems.length]
  );

  // Handler for deleting an expense row
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

  // Calculate summary totals
  const totalClaimedAmount = expenseItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const totalEligibleAmount = expenseItems.reduce(
    (sum, item) => sum + item.eligibleAmount,
    0
  );

  // Effect to revoke object URLs on component unmount
  useEffect(() => {
    return () => {
      for (const id in objectUrls.current) {
        if (objectUrls.current[id].startsWith("blob:")) {
          URL.revokeObjectURL(objectUrls.current[id]);
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Form.io Modal for adding new expenses */}
      <FormioDailyAllowanceExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpenseItem}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl m-auto font-bold text-gray-900">
            Daily Allowance Claim
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        {/* Employee Information Card */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-1">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Employee Name:</span> John Doe
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Employee ID:</span> EMP/001
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Expense Policy:</span> Standard Travel
            Policy
          </p>
        </div>

        {/* Multiple Days Section */}
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
                onChange={() => setIsMultipleDays(!isMultipleDays)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-500 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>

          {isMultipleDays && (
            <div className="flex flex-row sm:flex-row gap-4">
              <div className="flex-1">
                <label
                  htmlFor="fromDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  From
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="fromDate"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="toDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  To
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="toDate"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
            <button
              onClick={() => setIsModalOpen(true)} // Open modal on "Add Row" click
              className="flex items-center px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Row
            </button>
          </div>

          <div className="space-y-4">
            {expenseItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No expense items added yet.
              </p>
            ) : (
              expenseItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{item.type}</h3>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${item.type} expense`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Amount Display (read-only for added items, input for static) */}
                  <div>
                    <label
                      htmlFor={`amount-${item.id}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Amount
                    </label>
                    {/* For simplicity, making it read-only for now for items added via modal.
                        If you need to edit, you'd integrate another modal or inline edit. */}
                    <input
                      type="number"
                      id={`amount-${item.id}`}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                      value={item.amount}
                      readOnly
                      placeholder="0.00"
                      min="0"
                    />
                  </div>

                  {/* Attachment Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attachment (Optional)
                    </label>
                    {item.attachmentUrl ? (
                      <a
                        href={item.attachmentUrl}
                        download={item.fileName || "download"}
                        className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex items-center space-x-2">
                          {item.attachmentType?.startsWith("image/") ? (
                            <img
                              src={item.attachmentUrl}
                              alt="Attachment"
                              className="h-8 w-8 object-cover rounded-md"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "https://placehold.co/80x80/e0e0e0/000000?text=Error";
                              }}
                            />
                          ) : item.attachmentType?.startsWith(
                              "application/pdf"
                            ) ? (
                            <FileText className="h-8 w-8 text-red-500" />
                          ) : item.attachmentType?.includes("word") ||
                            item.attachmentType?.includes("document") ? (
                            <FileText className="h-8 w-8 text-blue-500" />
                          ) : item.attachmentType?.includes("excel") ||
                            item.attachmentType?.includes("sheet") ? (
                            <FileText className="h-8 w-8 text-green-500" />
                          ) : (
                            <FileIcon className="h-8 w-8 text-gray-500" />
                          )}
                          <span className="text-gray-700 text-sm truncate max-w-[150px]">
                            {item.fileName || "View Attachment"}
                          </span>
                        </div>
                        <FileIcon className="w-5 h-5 text-gray-500" />
                      </a>
                    ) : (
                      <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <span className="text-gray-600 text-sm">
                          No Attachment
                        </span>
                        <FileIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Eligible Amount */}
                  <p className="text-sm text-gray-600 text-right">
                    Eligible Amount: ₹{item.eligibleAmount.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="flex justify-between text-gray-700">
            <span>Total Claimed Amount</span>
            <span className="font-medium">
              ₹{totalClaimedAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Total Eligible Amount</span>
            <span className="font-medium">
              ₹{totalEligibleAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
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

export default DailyAllowanceClaim;
