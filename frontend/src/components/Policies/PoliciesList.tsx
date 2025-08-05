import React from "react";
import { useLocation } from "react-router";

type PolicyState = {
  name: string;
  count: number;
};

const policies = [
  {
    name: "Leave Policy",
    description: "Defines rules for employee leave, accruals, and holidays.",
  },
  {
    name: "Work From Home Policy",
    description: "Guidelines and eligibility for remote work.",
  },
  {
    name: "Travel Policy",
    description: "Outlines procedures and reimbursement for business travel.",
  },
  {
    name: "Code of Conduct",
    description: "Standards for ethical behavior in the workplace.",
  },
];

const PoliciesList: React.FC = () => {
  const location = useLocation();
  const state = location.state as PolicyState | undefined;

  return (
    <>
      {state && (
        <div className="max-w-md bg-white rounded-xl shadow-md p-4 space-y-4 border border-gray-100">
          {policies.map((policy) => (
            <div
              key={policy.name}
              className="flex justify-between items-center border rounded-lg p-4"
            >
              <div className="mr-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  {policy.name}
                </h2>
                <p className="text-xs text-gray-500">{policy.description}</p>
              </div>
              <div className="flex gap-2">
                <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-gray-200">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PoliciesList;