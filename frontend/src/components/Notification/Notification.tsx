/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  FaRegEnvelope,
  FaRegFileAlt,
  FaBriefcase,
  FaTimes,
} from "react-icons/fa";
import FrappeListView from "../ListView";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useMarkAsRead } from "../../hooks/useNotificationLog";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useNavigate } from "react-router";
import { IMPERSONATION_TEXT } from "../../constants/Notification";

// -------------------- TYPES --------------------
interface NotificationLog {
  name: string;
  subject: string;
  for_user: string;
  type: string;
  read: number; // 0 = unread, 1 = read
  from_user: string;
  creation: string;
}

// -------------------- MAIN LIST --------------------
const NotificationList = () => {
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<"all" | "read" | "unread">("all");
  const navigate = useNavigate();

  const layout = (
    <div className="flex flex-col h-full">
      <HeaderBar title="Notification Log" onBack={() => navigate(-1)} />

      {/* Tabs */}
      <div className="flex border-b">
        {["all", "read", "unread"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2   text-sm font-medium capitalize ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <FrappeListView
          doctype="Notification Log"
          ItemComponent={(props) => (
            <NotificationItem {...props} activeTab={activeTab} />
          )}
          isSearch={true}
          pageSize={10}
          defaultFields={[
            "name",
            "subject",
            "for_user",
            "type",
            "read",
            "from_user",
            "creation",
          ]}
          searchFields={["subject", "for_user", "type"]}
          infiniteScroll={true}
        />
      </div>
    </div>
  );

  return isDesktop ? (
    <DesktopLayoutWrapper title="Notifications">{layout}</DesktopLayoutWrapper>
  ) : (
    layout
  );
};

// -------------------- ITEM COMPONENT --------------------
const NotificationItem: React.FC<{
  item: any;
  index?: number;
  doctype: string;
  activeTab: "all" | "read" | "unread";
}> = ({ item, activeTab }) => {
  const notification = item as NotificationLog;

  const [isRead, setIsRead] = useState(notification.read === 1);
  const [openDialog, setOpenDialog] = useState(false);
  const markAsRead = useMarkAsRead();

  if (notification.subject?.includes(IMPERSONATION_TEXT)) {
    return null;
  }

  // Tab filter logic
  if (!openDialog) {
    if (activeTab === "read" && !isRead) return null;
    if (activeTab === "unread" && isRead) return null;
  }

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "alert":
        return <FaRegEnvelope className="text-black w-5 h-5" />;
      case "job":
        return <FaBriefcase className="text-blue-500 w-5 h-5" />;
      case "application":
        return <FaRegFileAlt className="text-green-500 w-5 h-5" />;
      default:
        return <FaRegEnvelope className="text-gray-400 w-5 h-5" />;
    }
  };

  const handleClick = async () => {
    setOpenDialog(true);
    if (!isRead) {
      setIsRead(true);
      try {
        await markAsRead.mutateAsync(notification.name);
      } catch (err) {
        console.error("Error updating read state:", err);
      }
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffHr < 1) return `${diffMin} minutes ago`;
    if (diffHr < 24) return `${diffHr} hours ago`;
    return `${diffDay} days ago`;
  };
  return (
    <>
      {/* List item */}
      <div
        key={notification.name}
        onClick={handleClick}
        className={`flex items-center justify-between p-4 mt-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
          isRead ? "opacity-70" : "bg-white"
        }`}
      >
        <div className="flex items-start gap-4 w-0 flex-1">
          {/* Fixed Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
            {getIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              <span
                className={`${
                  isRead
                    ? "font-normal text-gray-600"
                    : "font-semibold text-gray-900"
                }`}
              >
                {notification.type === "Alert"
                  ? "New Alert"
                  : notification.type}
              </span>
              :{" "}
              <span
                className={`${
                  isRead ? "text-gray-400" : "text-gray-600"
                } break-words`}
                dangerouslySetInnerHTML={{ __html: notification.subject }}
              />
            </p>

            <p className="text-xs text-gray-400 truncate">
              {formatTimeAgo(notification.creation)}
            </p>
          </div>
        </div>

        {/* Read dot */}
        {!isRead && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></span>
        )}
      </div>

      {/* Drawer */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpenDialog(false)}
          ></div>

          {/* Right panel */}
          <div className="w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3
                className="text-lg font-semibold"
                dangerouslySetInnerHTML={{ __html: notification.subject }}
              />
              <button
                onClick={() => setOpenDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>From:</strong> {notification.from_user}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>To:</strong> {notification.for_user}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong>{" "}
                  {new Date(notification.creation).toLocaleString()}
                </p>
              </div>
              <div className="text-gray-800 leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{ __html: notification.subject }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setOpenDialog(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationList;
