import React, { useMemo } from "react";
import { StatusBadge } from "./AllShiftsDashboard"; // Reuse badge
import { myShiftsData } from "./AllShiftsDashboard"; // Reuse mock data

const AllMyShiftsList: React.FC = () => {
  const today = new Date('2025-08-25');
  const { upcoming, past } = useMemo(() => {
    const upcomingShifts = myShiftsData
      .filter(shift => new Date(shift.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const pastShifts = myShiftsData
      .filter(shift => new Date(shift.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { upcoming: upcomingShifts, past: pastShifts };
  }, []);
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-xl font-bold mb-6">All My Shifts</h2>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-600 mb-3">Upcoming</h3>
        <ul className="space-y-2">
          {upcoming.map(shift => (
            <li key={shift.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <p className="text-sm text-gray-700">
                {new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {shift.time}
              </p>
              <StatusBadge status={shift.status} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-gray-600 mb-3">Past</h3>
        <ul className="space-y-2">
          {past.map(shift => (
            <li key={shift.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <p className="text-sm text-gray-700">
                {new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {shift.time}
              </p>
              <StatusBadge status={shift.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AllMyShiftsList;