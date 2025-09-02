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
  const isDesktop = window.innerWidth >= 1024;

  const layout = (
    <div className="flex flex-col h-full">
      <div className={`${isDesktop ? "p-8" : "px-4 py-3 border-b"}`}>
        <h2 className="text-xl font-semibold text-gray-900">
          Notifications
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <FrappeListView
          doctype="Notification Log"
          ItemComponent={NotificationItem}
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
  item: NotificationLog;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const [isRead, setIsRead] = useState(item.read === 1);
  const [openDialog, setOpenDialog] = useState(false);

  const markAsRead = useMarkAsRead();

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

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString(); // more email-like
  };

  const handleClick = async () => {
    setOpenDialog(true);
    if (!isRead) {
      setIsRead(true);
      try {
        await markAsRead.mutateAsync(item.name);
      } catch (err) {
        console.error("Error updating read state:", err);
      }
    }
  };

  return (
    <>
      {/* List item */}
      <div
        key={item.name}
        onClick={handleClick}
        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
          isRead ? "opacity-70" : "bg-white"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
            {getIcon(item.type)}
          </div>
          <div>
            <p className="text-sm">
              <span
                className={`${
                  isRead
                    ? "font-normal text-gray-600"
                    : "font-semibold text-gray-900"
                }`}
              >
                {item.type === "Alert" ? "New Alert" : item.type}
              </span>
              :{" "}
              <span
                className={`${isRead ? "text-gray-400" : "text-gray-600"}`}
              >
                {item.subject}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              {formatTimeAgo(item.creation)}
            </p>
          </div>
        </div>
        {!isRead && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
      </div>

      {/* Email-like full drawer */}
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
              <h3 className="text-lg font-semibold">{item.subject}</h3>
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
                  <strong>From:</strong> {item.from_user}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>To:</strong> {item.for_user}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {new Date(item.creation).toLocaleString()}
                </p>
              </div>

              <div className="text-gray-800 leading-relaxed">
                <p>
                  {item.subject} – This is the placeholder body. You can extend
                  it to show the full notification message if available.
                </p>
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
