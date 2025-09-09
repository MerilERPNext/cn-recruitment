import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function LeaveRequestApp() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/webapp/leave-app/leaves/leave-requests") {
      navigate("/webapp/leave-app/leaves/leave-requests/my", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="h-full">
      <div className="pt-4 md:pt-0 px-2 md:px-0 h-full overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
