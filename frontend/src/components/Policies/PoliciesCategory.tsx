import React from "react";
import { useNavigate } from "react-router";

export type CategoryCardProps = {
  name: string;
  count: number;
};

const CategoryCard: React.FC<CategoryCardProps> = ({ name, count }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => {
        navigate("/webapp/policies-app/policies-list", {
          state: { name, count },
        });
      }}
      className="flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 my-2"
    >
      <div className="flex items-center justify-between w-full gap-3">
        <span className="font-medium text-gray-900">{name}</span>
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-semibold">
          <span className="uppercase leading-none">{count}</span>
        </div>
      </div>
    </div>
  );
};

const policyCategories = [
  {
    name: "Leave Policy",
    count: 15,
  },
  {
    name: "Expense Reimbursement",
    count: 8,
  },
  {
    name: "Remote Work Guidelines",
    count: 5,
  },
  {
    name: "Data Security Policy",
    count: 10,
  },
  {
    name: "Travel Policy",
    count: 7,
  },
  {
    name: "Asset Management Policy",
    count: 4,
  },
];

const PoliciesCategory: React.FC = () => {
  return (
    <div className="h-full w-full">
      {policyCategories.map((policy, index) => (
        <CategoryCard key={index} name={policy.name} count={policy.count} />
      ))}
    </div>
  );
};

export default PoliciesCategory;