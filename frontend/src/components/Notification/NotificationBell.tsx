import { FaBell } from "react-icons/fa";
import { useNotifications } from "../../hooks/useNotificationLog";
import { IMPERSONATION_TEXT } from "../../constants/Notification";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useGetEmployeeDetailsByEmpId } from "../../hooks/useEmployee";

export default function NotificationBell() {
  const { data: currentUser } = useCurrentUser();
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useGetEmployeeDetailsByEmpId(targetEmployeeId ?? "");

  const effectiveUser = isViewingOtherUser
    ? (targetEmployee as { user_id?: string })?.user_id
    : currentUser?.email || currentUser?.name;

  // Fetch only unread for badge count — no limit needed here, small count
  const { data: notifications = [] } = useNotifications(effectiveUser, 100, 0, 0);

  const unreadCount = notifications.filter(
    (n) => !n.subject?.includes(IMPERSONATION_TEXT)
  ).length;

  return (
    <div className="relative">
      <FaBell className="w-5 h-5 text-gray-50 cursor-pointer" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </div>
  );
}