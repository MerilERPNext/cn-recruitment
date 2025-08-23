import React from "react";

interface MileageExpenseClaimModalProps {
  onClose?: () => void;
}

const MileageExpenseClaimModal: React.FC<MileageExpenseClaimModalProps> = ({ onClose }) => {
  return (
    <div className="bg-gray-50 flex flex-col font-sans">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mileage Expense Claim
          </h2>
          <p className="text-gray-600">
            Mileage expense claim form will be implemented here.
          </p>
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

export default MileageExpenseClaimModal;
