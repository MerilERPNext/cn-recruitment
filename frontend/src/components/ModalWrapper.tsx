import React, { useCallback } from "react";
import { Outlet, useSearchParams, useNavigate } from "react-router-dom";

const requests = [
  {
    name: "General Expense Request",
    path: "/webapp/expenses-app/general-expense-claim",
  },
  {
    name: "Mileage Expense Request",
    path: "/webapp/expenses-app/mileage-expense-claim",
  },
  {
    name: "Daily Allowance Request",
    path: "/webapp/expenses-app/daily-allowance-claim",
  },
  {
    name: "Shift Change Request",
    path: "/webapp/shift-request/shift-change-form",
  },
  { name: "Attendance Request", path: "/webapp/attendance/emp-attendance" },
  { name: "Leave Request", path: "/webapp/leave-app/leaves/leave-requests/my" },
];

const StaticModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black bg-opacity-40 z-[9998] flex justify-center items-end"
    >
      <div className="w-full bg-white rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.15)] flex flex-col max-h-[65%] overflow-hidden">
        {/* Fixed Title */}
        <div className="px-5 py-2 border-b border-gray-200 sticky top-0 z-10 bg-white">
          <h2 className="text-lg font-semibold text-center m-0">
            Top Requests for you
          </h2>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto">
          {requests.map((request) => (
            <div
              key={request.path}
              onClick={() => handleCardClick(request.path)}
              className="flex justify-between items-center px-5 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
            >
              <span className="text-base text-black">{request.name}</span>
              <span className="text-2xl text-black">›</span>
            </div>
          ))}
        </div>

        {/* Fixed Helpdesk Card */}
        <div
          onClick={() => handleCardClick("/helpdesk-issues")}
          className="m-2.5 px-3 py-3 bg-slate-100 rounded-lg flex items-center cursor-pointer shadow-sm sticky bottom-0"
        >
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-white">?</span>
          </div>
          <span className="text-md font-medium text-black">
            Helpdesk - raise Issues
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ModalWrapper() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showModal = searchParams.has("showModal");

  const closeModal = useCallback(() => {
    searchParams.delete("showModal");
    navigate(-1);
  }, [navigate, searchParams]);
  

  return (
    <>
      <Outlet />
      {showModal && <StaticModal onClose={closeModal} />}
    </>
  );
}
