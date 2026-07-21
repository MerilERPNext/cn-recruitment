import React, { useState } from "react";

const leaveData = [
  {
    type: "Casual Leave",
    entitled: 10,
    availed: 5,
    balance: 5,
  },
  {
    type: "Sick Leave",
    entitled: 10,
    availed: 2,
    balance: 8,
  },
  {
    type: "Vacation Leave",
    entitled: 20,
    availed: 10,
    balance: 10,
  },
];

const labelColor = "text-[#0094FF]";
const activeBg = "bg-[#EAF6FF]";
const inactiveBg = "bg-[#FFF]";

const LeaveBalance: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className=" min-h-screen px-4 pb-4">
      <div className="mt-4">
        {leaveData.map((leave, idx) => (
          <div
            key={leave.type}
            className={`rounded-2xl mb-4 p-5 shadow-sm cursor-pointer transition-colors ${idx === activeIdx ? activeBg : inactiveBg
              }`}
            onClick={() => setActiveIdx(idx)}
          >
            <div className={`text-xl font-semibold mb-4 ${labelColor}`}>
              {leave.type}
            </div>
            <div className="flex justify-between">
              <div className="flex-1 text-center">
                <div className="text-xl font-bold">{leave.entitled}</div>
                <div className="text-[#7A7A7A] text-sm mt-1">Entitled</div>
              </div>
              <div className="flex-1 text-center border-x">
                <div className="text-xl font-bold">{leave.availed}</div>
                <div className="text-[#7A7A7A] text-sm mt-1">Availed</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-xl font-bold">{leave.balance}</div>
                <div className="text-[#7A7A7A] text-sm mt-1">Balance</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaveBalance;
