import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

const tabConfig = [
  { label: "My Leave Requests", value: "/webapp/leave-app/leaves/leave-requests/my" },
  { label: "Team Leave Requests", value: "/webapp/leave-app/leaves/leave-requests/team" },
];

export default function LeaveRequestApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    tabConfig.find((tab) => location.pathname.startsWith(tab.value))?.value ||
    tabConfig[0].value;

  const handleTabChange = (newValue: string) => {
    navigate(newValue);
  };

  useEffect(() => {
    if (location.pathname === "/webapp/leave-app/leaves/leave-requests") {
      navigate("/webapp/leave-app/leaves/leave-requests/my", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="flex flex-col ">
      <div style={{ height: "var(--leave-header-height)" }} className="fixed left-0 left-0 w-full">
        <div className="max-w-md mx-auto">
          <div className="flex bg-gray-200 w-full p-1">
            {tabConfig.map((tab) => (
              <button
                key={tab.value}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${currentTab === tab.value
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500"
                  }`}
                onClick={() => handleTabChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex-1 px-4 max-w-md"
        style={{ paddingTop: "var(--leave-header-height)" }}
      >
        <Outlet />
      </div>
    </div>
  );
}


