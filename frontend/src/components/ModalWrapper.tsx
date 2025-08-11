
import React, { useCallback } from "react";
import { Outlet, useSearchParams, useNavigate } from "react-router-dom";

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

  const requests = [
    // Expense app requests
    { name: "General Expense Request", path: "/webapp/expenses-app/general-expense-claim" },
    { name: "Mileage Expense Request", path: "/webapp/expenses-app/mileage-expense-claim" },
    { name: "Daily Allowance Request", path: "/webapp/expenses-app/daily-allowance-claim" },
    // Shift app requests
    { name: "Shift Change Request", path: "/webapp/shift-request/shift-change-form" },
    // Attendance app requests
    { name: "Attendance Request", path: "/webapp/attendance/emp-attendance" },
    // Leave app requests
    { name: "Leave Request", path: "/webapp/leave-app/leaves/leave-requests/my" },
  ];

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 9998,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <div
        style={{
          width: "100%",
          background: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "65%",
          overflow: "hidden",
        }}
      >
        {/* Fixed Title */}
        <div
          style={{
            padding: "8px 20px",
            borderBottom: "1px solid #f0f0f0",
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "inherit",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0", textAlign: "center" }}>
            Top Requests for you
          </h2>
        </div>

        {/* Scrollable List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {requests.map((request, index) => (
            <div
              key={index}
              onClick={() => handleCardClick(request.path)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "16px", color: "#000" }}>
                {request.name}
              </span>
              <span style={{ fontSize: "22px", color: "#000" }}>›</span>
            </div>
          ))}
        </div>

        {/* Fixed Helpdesk Card */}
        <div
          onClick={() => handleCardClick("/helpdesk-issues")}
          style={{
            margin: "8px 20px 16px 20px",
            padding: "12px",
            background: "#fef6f4",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            position: "sticky",
            bottom: 0,
            backgroundClip: "padding-box",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "#ff6347",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              ?
            </span>
          </div>
          <span style={{ fontSize: "15px", fontWeight: 500, color: "#000" }}>
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
    navigate({
      pathname: window.location.pathname,
      search: searchParams.toString(),
    });
  }, [navigate, searchParams]);

  return (
    <>
      <Outlet />
      {showModal && <StaticModal onClose={closeModal} />}
    </>
  );
}
