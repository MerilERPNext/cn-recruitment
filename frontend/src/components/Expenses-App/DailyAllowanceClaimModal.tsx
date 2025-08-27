import React, { useState, useCallback, useRef, useEffect } from "react";
import { Trash2, FileText, File as FileIcon } from "lucide-react";
import FormioNewExpenseItemModal from "./FormioNewExpenseItemModal";
import MultipleDaysSection from "./DailyAllowanceClaim/MultipleDaysSection";
import ExpensesUserInfo from "./ExpensesUserInfo";

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

// Helper function to get current date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface DailyAllowanceClaimModalProps {}

// Main Component
const DailyAllowanceClaimModal: React.FC<DailyAllowanceClaimModalProps> = () => {
  const [isMultipleDays, setIsMultipleDays] = useState<boolean>(true);
  const [fromDate, setFromDate] = useState<string>(getTodayDate());
  const [toDate, setToDate] = useState<string>(getTodayDate());
  const [singleDate, setSingleDate] = useState<string>(getTodayDate());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const objectUrls = useRef<Record<string, string>>({});

  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
    {
      id: "exp-travel-1",
      type: "Travel",
      amount: 1500,
      eligibleAmount: 1500,
      attachmentUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Travel",
      attachmentType: "image/png",
    },
  ]);

  const CURRENCY_SYMBOL = "₹";

  // Expense item manipulation functions
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
      let attachmentUrl: string = "";
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
          type: formData.expenseType || "Daily Allowance",
          amount: parseFloat(formData.amount),
          eligibleAmount: parseFloat(formData.amount),
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

  // Calculations
  const totalAmount = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const totalEligibleAmount = expenseItems.reduce(
    (sum, item) => sum + item.eligibleAmount,
    0
  );
  const advances = 0;
  const netPayable = totalEligibleAmount - advances;

  // Cleanup effect
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
    <div className="bg-gray-50 flex flex-col font-sans">
      <FormioNewExpenseItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpenseItem}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <ExpensesUserInfo />

        <MultipleDaysSection
          isMultipleDays={isMultipleDays}
          onToggleMultipleDays={() => setIsMultipleDays(!isMultipleDays)}
          fromDate={fromDate}
          toDate={toDate}
          singleDate={singleDate}
          onDateRangeChange={({ fromDate: newFromDate, toDate: newToDate }) => {
            setFromDate(newFromDate);
            setToDate(newToDate);
          }}
          onSingleDateChange={setSingleDate}
        />

        {/* Expense Items Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
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
                  className="relative flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-gray-900">{item.type}</p>
                    <p className="text-sm text-gray-600">
                      Amount: {CURRENCY_SYMBOL}
                      {item.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Eligible: {CURRENCY_SYMBOL}
                      {item.eligibleAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        download={item.fileName || "download"}
                        className="w-22 h-22 flex-shrink-0 cursor-pointer"
                        target="_blank"
                        rel="noopener noreferrer"
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
                          </div>
                        ) : (
                          <img
                            src="https://placehold.co/80x80/e0e0e0/000000?text=Receipt"
                            alt="Receipt"
                            className="w-22 h-22 object-cover rounded-md"
                          />
                        )}
                      </a>
                    )}
                    {!item.attachmentUrl && (
                      <img
                        src="https://placehold.co/80x80/e0e0e0/000000?text=Receipt"
                        alt="Receipt"
                        className="w-22 h-22 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
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
            className="w-full flex items-center justify-center py-2 mt-4 border border-gray-300 rounded-lg font-medium bg-black"
          >
            <span className="text-lg mr-2 text-white">+ Add Expense Item</span>
          </button>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Total Amount</span>
              <span className="font-medium">
                {CURRENCY_SYMBOL}
                {totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Total Eligible Amount</span>
              <span className="font-medium">
                {CURRENCY_SYMBOL}
                {totalEligibleAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Advances</span>
              <span className="font-medium">
                {CURRENCY_SYMBOL}
                {advances.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg border-t pt-2 mt-2">
              <span>Net Payable</span>
              <span>
                {CURRENCY_SYMBOL}
                {netPayable.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <button
            onClick={() => console.log("Submit clicked")}
            className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyAllowanceClaimModal;
