import React from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export type Holiday = {
  name: string;
  date: string;
};

const holidays: Holiday[] = [
  { name: "New Year’s Day", date: "2025-01-01" },
  { name: "Martin Luther King Jr. Day", date: "2025-01-15" },
  { name: "Presidents' Day", date: "2025-02-19" },
  { name: "Memorial Day", date: "2025-05-27" },
  { name: "Juneteenth", date: "2025-06-19" },
  { name: "Independence Day", date: "2025-07-04" },
  { name: "Labor Day", date: "2025-09-01" },
  { name: "Columbus Day", date: "2025-10-14" },
  { name: "Veterans Day", date: "2025-11-11" },
  { name: "Thanksgiving Day", date: "2025-11-28" },
  { name: "Christmas Day", date: "2025-12-25" },
];

const HolidaysFull: React.FC = () => {
  const year = holidays.length > 0 ? new Date(holidays[0].date).getFullYear() : new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white">

      <header className="sticky top-0 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-slate-900">{year}</h1>
        </div>
      </header>


      <main className="flex-1 overflow-y-auto p-4">
        <div className="divide-y divide-gray-200">
          {holidays.map((h) => {
            const dateObj = new Date(h.date);
            const formatted = format(dateObj, "EEEE, MMMM d, yyyy");
            return (
              <div key={h.date} className="py-3">
                <p className="font-medium text-gray-900 mb-0.5">{h.name}</p>
                <p className="text-sm text-gray-500">{formatted}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default HolidaysFull;
