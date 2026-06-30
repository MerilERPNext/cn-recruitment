import { FaBell } from "react-icons/fa";
import { useNotifications } from "../../hooks/useNotificationLog";
import { IMPERSONATION_TEXT } from "../../constants/Notification";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "text-gray-50" }: NotificationBellProps) {
  const { data: currentUser } = useCurrentUser();

  const effectiveUser = currentUser?.email || currentUser?.name;

  // Fetch only unread for badge count — no limit needed here, small count
  const { data: notifications = [] } = useNotifications(effectiveUser, 100, 0, 0);

  const unreadCount = notifications.filter(
    (n) => !n.subject?.includes(IMPERSONATION_TEXT)
  ).length;

  return (
    <div className="relative">
      <FaBell className={`w-5 h-5 cursor-pointer ${className}`} />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </div>
  );
}