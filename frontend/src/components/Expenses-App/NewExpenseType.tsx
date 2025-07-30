import React from "react";
import { X, FileText, Car, Smile } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const NewExpenseType: React.FC = () => {
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    console.log("Close button clicked!");
    navigate(-1);
  }, [navigate]);

  const handleSelectExpenseType = (type: string) => {
    console.log(`Selected expense type: ${type}`);
    // Navigate to the appropriate expense claim form based on type
    if (type === "General Expense") {
      navigate("/webapp/expenses-app/general-expense-claim");
    } else if (type === "Mileage Expense") {
      navigate("/webapp/expenses-app/mileage-expense-claim");
    } else if (type === "Daily Allowance") {
      navigate("/webapp/expenses-app/daily-allowance-claim");
    }
    // Add logic for other expense types if needed in the future
  };

  return (
    <div className="flex justify-center w-full min-h-screen bg-white">
      <div className="w-full  bg-white flex flex-col">
        {/* Header Section */}
        <div className="flex w-full  items-center sticky top-0 justify-between px-4 py-3 bg-white shadow-sm z-50">
          <div className="flex items-center w-full">
            <button
              onClick={handleClose}
              className="rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg w-full text-center font-semibold text-gray-800">
              New Expense
            </h2>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 flex-grow overflow-y-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What type of expense?
          </h1>

          <div className="space-y-4">
            {/* General Expense Card */}
            <div
              className="flex flex-col items-start p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-200"
              onClick={() => handleSelectExpenseType("General Expense")}
            >
              <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full mb-3">
                <FileText className="h-6 w-6 text-gray-700" />{" "}
                {/* Added a default text color */}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  General Expense
                </h3>
                <p className="text-sm text-gray-500">
                  Reimburse for general expenses like meals, travel, and
                  supplies.
                </p>
              </div>
            </div>

            {/* Mileage Expense Card */}
            <div
              className="flex flex-col items-start p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-200"
              onClick={() => handleSelectExpenseType("Mileage Expense")}
            >
              <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full mb-3">
                <Car className="h-6 w-6 text-gray-700" />{" "}
                {/* Added a default text color */}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Mileage Expense
                </h3>
                <p className="text-sm text-gray-500">
                  Claim reimbursement for mileage incurred during business
                  travel.
                </p>
              </div>
            </div>

            {/* Daily Allowance Card */}
            <div
              className="flex flex-col items-start p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-200"
              onClick={() => handleSelectExpenseType("Daily Allowance")}
            >
              <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full mb-3">
                <Smile className="h-6 w-6 text-gray-700" />{" "}
                {/* Added a default text color */}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Daily Allowance
                </h3>
                <p className="text-sm text-gray-500">
                  Claim a fixed daily allowance for travel or other expenses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewExpenseType;
