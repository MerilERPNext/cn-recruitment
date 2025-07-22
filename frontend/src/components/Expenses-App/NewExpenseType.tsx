// import React from "react";
// import { X, FileText, Car, Smile } from "lucide-react";
// import { useCallback } from "react";
// import { useNavigate } from "react-router-dom";

// const NewExpenseType: React.FC = () => {
//   const navigate = useNavigate();

//   const handleClose = useCallback(() => {
//     console.log("Close button clicked!");
//     navigate(-1);
//   }, [navigate]);

//   const handleSelectExpenseType = (type: string) => {
//     console.log(`Selected expense type: ${type}`);
//   };

//   return (
//     <div className="w-full max-w-md">
//       {/* Header Section */}
//       <div className="flex items-center justify-between p-4 border-b border-gray-200">
//         <button
//           onClick={handleClose}
//           className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           aria-label="Close"
//         >
//           <X className="h-5 w-5 text-gray-600" />
//         </button>
//         <h2 className="text-lg font-semibold text-gray-800">New Expense</h2>
//         <div className="w-5 h-5" /> {/* Placeholder to balance the header */}
//       </div>

//       {/* Content Section */}
//       <div className="p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
//         <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
//           What type of expense?
//         </h1>

//         <div className="space-y-4">
//           {/* General Expense Card */}
//           <div
//             className="flex flex-col items-start p-4 border border-gray-200 rounded-xl cursor-pointer     transition-all duration-200"
//             onClick={() => handleSelectExpenseType("General Expense")}
//           >
//             <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full mb-3">
//               {/* Removed text-blue-600 from icon */}
//               <FileText className="h-6 w-6" />
//             </div>
//             <div>
//               <h3 className="text-lg font-semibold text-gray-800">
//                 General Expense
//               </h3>
//               <p className="text-sm text-gray-500">
//                 Reimburse for general expenses like meals, travel, and supplies.
//               </p>
//             </div>
//           </div>

//           {/* Mileage Expense Card */}
//           <div
//             className="flex flex-col items-start p-4 border border-gray-200 rounded-xl cursor-pointer     transition-all duration-200"
//             onClick={() => handleSelectExpenseType("Mileage Expense")}
//           >
//             <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full mb-3">
//               {/* Removed text-blue-600 from icon */}
//               <Car className="h-6 w-6" />
//             </div>
//             <div>
//               <h3 className="text-lg font-semibold text-gray-800">
//                 Mileage Expense
//               </h3>
//               <p className="text-sm text-gray-500">
//                 Claim reimbursement for mileage incurred during business travel.
//               </p>
//             </div>
//           </div>

//           {/* Daily Allowance Card */}
//           <div
//             className="flex flex-col items-start p-4 border border-gray-200 rounded-xl cursor-pointer     transition-all duration-200"
//             onClick={() => handleSelectExpenseType("Daily Allowance")}
//           >
//             <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full mb-3">
//               <Smile className="h-6 w-6" />
//             </div>
//             <div>
//               <h3 className="text-lg font-semibold text-gray-800">
//                 Daily Allowance
//               </h3>
//               <p className="text-sm text-gray-500">
//                 Claim a fixed daily allowance for travel or other expenses.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default NewExpenseType;


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
    // You might want to navigate to a new page or perform other actions here
    // For example: navigate(`/new-expense/${type.toLowerCase().replace(/\s/g, '-')}`);
  };

  return (
    // Removed max-w-md from here and added a responsive container
    <div className="flex justify-center w-full min-h-screen bg-white">
      <div className="w-full  bg-white flex flex-col">
        {/* Header Section */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">New Expense</h2>
          <div className="w-5 h-5" /> {/* Placeholder to balance the header */}
        </div>

        {/* Content Section */}
        <div className="p-6 flex-grow overflow-y-auto">
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
                <FileText className="h-6 w-6 text-gray-700" /> {/* Added a default text color */}
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
                <Car className="h-6 w-6 text-gray-700" /> {/* Added a default text color */}
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
                <Smile className="h-6 w-6 text-gray-700" /> {/* Added a default text color */}
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