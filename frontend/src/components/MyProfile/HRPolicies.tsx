import React from "react";
const policies = [
  {
    title: "Leave Policy",
    description: "Annual leave, sick leave, and other absences.",
  },
  {
    title: "Expense Policy",
    description: "Guidelines for business-related expenses.",
  },
  {
    title: "Code of Conduct",
    description: "Standards for professional behavior.",
  },
  {
    title: "Benefits Summary",
    description: "Health insurance and retirement plans.",
  },
];

const HRPolicies: React.FC = () => {
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-4 space-y-4">
      {policies.map((policy) => (
        <div
          key={policy.title}
          className="flex justify-between items-center border rounded-lg p-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {policy.title}
            </h2>
            <p className="text-xs text-gray-500">{policy.description}</p>
          </div>
          <div className="flex gap-2">
            <button className="text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
              View
            </button>
            <button className="text-sm px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              Download
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HRPolicies;
