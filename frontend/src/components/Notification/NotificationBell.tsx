import { FaBell } from "react-icons/fa";
import { useNotifications } from "../../hooks/useNotificationLog";
import { IMPERSONATION_TEXT } from "./Notification";

export default function NotificationBell() {
  const { data: notifications = [] } = useNotifications();

  const unreadCount = notifications.filter(
    (n) => n.read === 0 && !n.subject?.includes(IMPERSONATION_TEXT)
  ).length;

  return (
    <div className="relative">
      <FaBell className="w-5 h-5 text-gray-700 cursor-pointer" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </div>
  );
}



