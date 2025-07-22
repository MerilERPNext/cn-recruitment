import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  Camera,
  Image,
  FileText,
  X,
} from "lucide-react";

// Define the structure for an individual expense item
interface ExpenseItem {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  imageUrl?: string; // Optional image URL for mock purposes
}

// Define the props for the NewExpenseItemModal
interface NewExpenseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ExpenseItem, "id" | "imageUrl">) => void; // Omit id and imageUrl as they are generated/handled by parent
}

// Mock data for expense items
const MOCK_EXPENSE_ITEMS: ExpenseItem[] = [
  {
    id: "exp1",
    type: "Travel",
    date: "2024-07-28",
    amount: 150.0,
    description: "Flight to San Francisco",
    imageUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Receipt", // Placeholder image
  },
  {
    id: "exp2",
    type: "Food",
    date: "2024-07-29",
    amount: 30.0,
    description: "Lunch with client",
    imageUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Receipt", // Placeholder image
  },
];

// New Expense Item Modal Component
const NewExpenseItemModal: React.FC<NewExpenseItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  // Reset form fields when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setExpenseType("");
      setAmount("");
      setDescription("");
      setDate("");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (expenseType && amount && description && date) {
      onSave({
        type: expenseType,
        amount: parseFloat(amount),
        description,
        date,
      });
      onClose(); // Close modal after saving
    } else {
      // Basic validation feedback
      alert("Please fill in all fields.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-xl w-full max-w-md p-6 shadow-lg flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
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

        {/* Form Fields */}
        <div className="flex-grow space-y-4">
          {/* Expense Type */}
          <div>
            <label
              htmlFor="expenseType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Expense Type
            </label>
            <select
              id="expenseType"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none "
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
            >
              <option value="">Select type...</option>
              <option value="Travel">Travel</option>
              <option value="Food">Food</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Supplies">Supplies</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount
            </label>
            <input
              type="number"
              id="amount"
              placeholder="0.00"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              placeholder="Add a description..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                id="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="flex space-x-3">
              <button className="flex-1 flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Camera className="h-5 w-5 mb-1" />
                <span className="text-xs">Camera</span>
              </button>
              <button className="flex-1 flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Image className="h-5 w-5 mb-1" />
                <span className="text-xs">Gallery</span>
              </button>
              <button className="flex-1 flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs">Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between space-x-4 pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-3xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
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

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleDeleteItem = useCallback((id: string) => {
    setExpenseItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const handleAddExpenseItem = useCallback(
    (newItem: Omit<ExpenseItem, "id" | "imageUrl">) => {
      const newId = `exp${expenseItems.length + 1}-${Date.now()}`; // Simple unique ID generation
      setExpenseItems((prevItems) => [
        ...prevItems,
        {
          ...newItem,
          id: newId,
          imageUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Receipt",
        }, // Add a default placeholder image
      ]);
    },
    [expenseItems.length]
  );

  // Calculate summary totals
  const totalAmount = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const advances = 0; // Mock value
  const netPayable = totalAmount - advances;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* New Expense Item Modal */}
      <NewExpenseItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddExpenseItem}
      />

      {/* Header */}
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
        {/* User Info Card */}
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

        {/* Expense Travel Policy */}
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

         {/* Expense Items Section */}
        <div className="bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Items</h2>
          <div className="space-y-4">
            {expenseItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No expense items added yet.</p>
            ) : (
              expenseItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex flex-col space-y-1"> {/* Changed to flex-col for text stack */}
                    <p className="font-medium text-gray-900">{item.type}</p>
                    <p className="text-sm text-gray-600">Date: {item.date}</p>
                    <p className="text-sm text-gray-600">Amount: ${item.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex items-center space-x-3"> {/* Container for image and trash icon */}
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt="Receipt"
                        className="w-22 h-22 object-cover rounded-md flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.onerror = null; // Prevent infinite loop
                          e.currentTarget.src = "https://placehold.co/80x80/e0e0e0/000000?text=Error"; // Fallback image
                        }}
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

        {/* Summary Section */}
        <div className="bg-white p-4 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Total Amount</span>
              <span className="font-medium">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Advances</span>
              <span className="font-medium">${advances.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg border-t pt-2 mt-2">
              <span>Net Payable</span>
              <span>${netPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Buttons */}
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
