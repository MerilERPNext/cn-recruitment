import React, { useMemo } from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { teamShiftsData } from "./AllShiftsDashboard";

const AllTeamShiftsList: React.FC = () => {
  const sortedData = useMemo(() =>
    [...teamShiftsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  []);
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-xl font-bold mb-6">All Team Shifts</h2>
      <ul className="space-y-3">
        {sortedData.map(item => (
          <li key={item.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-600">
                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {item.time}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AllTeamShiftsList;