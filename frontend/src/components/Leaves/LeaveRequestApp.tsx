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
    <div className="h-screen flex flex-col">
      <div className="fixed top-[6rem] left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex bg-gray-200 rounded-lg w-full p-1">
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
      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ paddingTop: '80px' }}>
        <Outlet />
      </div>
    </div>
  );
}


