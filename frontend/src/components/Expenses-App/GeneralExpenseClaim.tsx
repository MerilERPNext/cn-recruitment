/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, FileText, File as FileIcon } from "lucide-react";
import defaultReceipt from "../../assets/Receipt.svg";

// @ts-expect-error ignore
import { Form } from "@tsed/react-formio";
import FormioNewExpenseItemModal from "./FormioNewExpenseItemModal";
import HeaderBar from "../HeaderBar";

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

const GeneralExpenseClaim: React.FC = () => {
  const navigate = useNavigate();
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const objectUrls = useRef<Record<string, string>>({}); // Using a ref to hold object URLs for cleanup

  const ExpenseTravelPoliciesForm = useMemo(() => {
    return {
      components: [
        {
          type: "select",
          key: "travel_policy",
          label: "Expense Travel Policy (Optional)",
          input: true,
          validate: { required: true },
          placeholder: "Local Commute",
          data: {
            values: [
              {
                value: "domestic_travel",
                label: "Policy A - Domestic Travel",
              },
              {
                value: "international_travel",
                label: "Policy B - International Travel",
              },
              { value: "local_commute", label: "Policy C - Local Commute" },
            ],
          },
          customClass: "appearance-none",
        },
      ],
    };
  }, []);

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
      let attachmentUrl: string = defaultReceipt;
      let attachmentType: string = "image/png";
      let fileName: string | undefined;

      if (fileObjectFromModal) {
        attachmentUrl = URL.createObjectURL(fileObjectFromModal);
        objectUrls.current[newId] = attachmentUrl;
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
        if (objectUrls.current[id].startsWith("blob:")) {
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

      <HeaderBar title="General Expense Claim" onBack={handleBack} />

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
        <Form
          form={ExpenseTravelPoliciesForm}
          options={{
            builder: { styles: false },
            submitButton: false,
            formClass: "space-y-6",
            rowClass: "flex flex-col",
            labelClass: "mb-1 font-medium text-gray-700",
            inputClass:
              "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
            validateOnInit: false,
            validateOnBlur: false,
            validateOnChange: false,
          }}
          className="space-y-6"
        />
        {/* Expense Item */}
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
