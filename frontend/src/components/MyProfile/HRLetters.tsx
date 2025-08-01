import React from "react";
const letters = [
  {
    title: "Offer Letter",
    description: "Confirms job offer with basic terms.",
  },
  {
    title: "Appointment Letter",
    description: "Officially appoints the candidate with full job details.",
  },
  {
    title: "Joining Letter",
    description: "Employee's confirmation of joining the job.",
  },
  {
    title: "Probation Confirmation Letter",
    description: "Confirms successful completion of probation.",
  },
];

const HRLetters: React.FC = () => {
  return (
    <div className="max-w-md m-4 bg-white rounded-xl shadow-md p-4 space-y-4">
      {letters.map((letter) => (
        <div
          key={letter.title}
          className="flex justify-between items-center border rounded-lg p-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {letter.title}
            </h2>
            <p className="text-xs text-gray-500">{letter.description}</p>
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

export default HRLetters;
