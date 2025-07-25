/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, FileText, File as FileIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../../HeaderBar";
import FormioDailyAllowanceExpenseModal from "./FormioDailyAllowanceExpenseModal";
import MultipleDaysSection from "./MultipleDaysSection";

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

// Form.io Schema for a single Daily Allowance Expense Item

interface EmployeeInfoCardProps {
  employeeName: string;
  employeeId: string;
  expensePolicy: string;
}

const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({
  employeeName,
  employeeId,
  expensePolicy,
}) => (
  <div className="bg-white rounded-lg shadow-sm border p-4 space-y-1">
    <p className="text-sm text-gray-700">
      <span className="font-medium">Employee Name:</span> {employeeName}
    </p>
    <p className="text-sm text-gray-700">
      <span className="font-medium">Employee ID:</span> {employeeId}
    </p>
    <p className="text-sm text-gray-700">
      <span className="font-medium">Expense Policy:</span> {expensePolicy}
    </p>
  </div>
);

// Main Component
const DailyAllowanceClaim: React.FC = () => {
  const navigate = useNavigate();
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

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleDateRangeChange = useCallback(
    ({
      fromDate: newFromDate,
      toDate: newToDate,
    }: {
      fromDate: string;
      toDate: string;
    }) => {
      setFromDate(newFromDate);
      setToDate(newToDate);
    },
    []
  );

  const handleSingleDateChange = useCallback((newDate: string) => {
    setSingleDate(newDate);
  }, []);

  const handleAddExpenseItem = useCallback(
    (formData: any, fileObjectFromModal: File | null | undefined) => {
      const newId = `exp${expenseItems.length + 1}-${Date.now()}`;
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      let fileName: string | undefined;

      if (fileObjectFromModal) {
        attachmentUrl = URL.createObjectURL(fileObjectFromModal);
        objectUrls.current[newId] = attachmentUrl;
        attachmentType = fileObjectFromModal.type;
        fileName = fileObjectFromModal.name;
      } else if (formData.attachments && formData.attachments.length > 0) {
        const attachedFile = formData.attachments[0];
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

  const totalClaimedAmount = expenseItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const totalEligibleAmount = expenseItems.reduce(
    (sum, item) => sum + item.eligibleAmount,
    0
  );

  const handleSubmit = useCallback(() => {
    const submissionData = {
      isMultipleDays: isMultipleDays,
      dateDetails: isMultipleDays
        ? { fromDate: fromDate, toDate: toDate }
        : { singleDate: singleDate },
      expenseItems: expenseItems,
      summary: {
        totalClaimedAmount: totalClaimedAmount,
        totalEligibleAmount: totalEligibleAmount,
      },
      employeeInfo: {
        employeeName: "John Doe",
        employeeId: "EMP/001",
        expensePolicy: "Standard Travel Policy",
      },
    };
    console.log("Full Form Submission Data:", submissionData);
  }, [
    isMultipleDays,
    fromDate,
    toDate,
    singleDate,
    expenseItems,
    totalClaimedAmount,
    totalEligibleAmount,
  ]);

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
      <FormioDailyAllowanceExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpenseItem}
      />

      <HeaderBar onBack={handleBack} title="Daily Allowance Claim" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <EmployeeInfoCard
          employeeName="John Doe"
          employeeId="EMP/001"
          expensePolicy="Standard Travel Policy"
        />

        <MultipleDaysSection
          isMultipleDays={isMultipleDays}
          onToggleMultipleDays={() => setIsMultipleDays(!isMultipleDays)}
          fromDate={fromDate}
          toDate={toDate}
          singleDate={singleDate}
          onDateRangeChange={handleDateRangeChange}
          onSingleDateChange={handleSingleDateChange}
        />

        <ExpenseItemsList
          expenseItems={expenseItems}
          onAddRow={() => setIsModalOpen(true)}
          onDeleteItem={handleDeleteItem}
        />

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

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <button
            onClick={() => console.log("Save as Draft clicked")}
            className="flex-1 py-3 rounded-3xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExpenseItemsListProps {
  expenseItems: ExpenseItem[];
  onAddRow: () => void;
  onDeleteItem: (id: string) => void;
}

const ExpenseItemsList: React.FC<ExpenseItemsListProps> = ({
  expenseItems,
  onAddRow,
  onDeleteItem,
}) => (
  <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
      <button
        onClick={onAddRow}
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
          <ExpenseItemCard
            key={item.id}
            item={item}
            onDeleteItem={onDeleteItem}
          />
        ))
      )}
    </div>
  </div>
);

interface ExpenseItemCardProps {
  item: ExpenseItem;
  onDeleteItem: (id: string) => void;
}

const ExpenseItemCard: React.FC<ExpenseItemCardProps> = ({
  item,
  onDeleteItem,
}) => (
  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-medium text-gray-900">{item.type}</h3>
      <button
        onClick={() => onDeleteItem(item.id)}
        className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
        aria-label={`Delete ${item.type} expense`}
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>

    <div>
      <label
        htmlFor={`amount-${item.id}`}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Amount
      </label>
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
            ) : item.attachmentType?.startsWith("application/pdf") ? (
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
          <span className="text-gray-600 text-sm">No Attachment</span>
          <FileIcon className="w-5 h-5 text-gray-400" />
        </div>
      )}
    </div>

    <p className="text-sm text-gray-600 text-right">
      Eligible Amount: ₹{item.eligibleAmount.toFixed(2)}
    </p>
  </div>
);

export default DailyAllowanceClaim;
