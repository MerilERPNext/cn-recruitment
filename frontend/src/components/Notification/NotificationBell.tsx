import { FaBell, FaPlus } from "react-icons/fa";
import { useNotifications } from "../../hooks/useNotificationLog";
import { IMPERSONATION_TEXT } from "../../constants/Notification";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "text-gray-50" }: NotificationBellProps) {
  const { data: currentUser } = useCurrentUser();

  const effectiveUser = currentUser?.email || currentUser?.name;

  // Fetch only unread for badge count — limit 1000
  const { data: notifications = [] } = useNotifications(effectiveUser, 1000, 0, 0);

  const unreadCount = notifications.filter(
    (n) => !n.subject?.includes(IMPERSONATION_TEXT)
  ).length;

  return (
    <div className="relative inline-flex items-center justify-center">
      <FaBell className={`w-5 h-5 cursor-pointer ${className}`} />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center leading-none shadow-sm pointer-events-none">
          {unreadCount >= 100 ? (
            <span className="inline-flex items-center gap-0.5">
              <span>100</span>
              <FaPlus className="w-1.5 h-1.5 shrink-0" />
            </span>
          ) : (
            unreadCount
          )}
        </span>
      )}
    </div>
  );
}