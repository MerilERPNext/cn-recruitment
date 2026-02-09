/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { PiListChecksBold } from "react-icons/pi";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import Button from "../shared/atoms/Button";
import { useNotifications, useMarkAsRead } from "../../hooks/useNotificationLog";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useNavigate } from "react-router";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";

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

// ==================================================
// MAIN LIST
// ==================================================
const NotificationList = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<"all" | "read" | "unread">("all");
    const { data: apiNotifications = [] } = useNotifications();
    const [notifications, setNotifications] =
      useState<NotificationLog[]>(apiNotifications);

      useEffect(() => {
        setNotifications(apiNotifications);
      }, [apiNotifications]);

  // 🔥 Filter locally
  const filteredNotifications = useMemo(() => {
    if (activeTab === "read") {
      return notifications.filter((n: NotificationLog) => n.read === 1);
    }
    if (activeTab === "unread") {
      return notifications.filter((n: NotificationLog) => n.read === 0);
    }
    return notifications;
  }, [notifications, activeTab]);

  const layout = (
    <div className="flex flex-col h-full">
      <HeaderBar title="Notification Log" onBack={() => navigate(-1)} />

      {/* Tabs */}
      <div className="flex border-b">
        {["all", "read", "unread"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium capitalize
              ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 p-2 overflow-y-auto space-y-1">
        {filteredNotifications.length === 0 ? (
          <p className="text-center text-gray-500 text-sm">
            No notifications found
          </p>
        ) : (
          filteredNotifications.map((item: NotificationLog) => (
            <NotificationItem
  key={item.name}
  item={item}
  onMarkedRead={(id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.name === id ? { ...n, read: 1 } : n
      )
    );
  }}
/>
          ))
        )}
      </div>
    </div>
  );

  return isDesktop ? (
    <DesktopLayoutWrapper title="Notifications">
      {layout}
    </DesktopLayoutWrapper>
  ) : (
    layout
  );
};

export default NotificationList;

// ==================================================
// ITEM COMPONENT
// ==================================================
const NotificationItem: React.FC<{
  item: NotificationLog;
  onMarkedRead: (id: string) => void;
}> = ({ item, onMarkedRead }) => {
  const notification = item;

  const [isRead, setIsRead] = useState(notification.read === 1);
  const [openDialog, setOpenDialog] = useState(false);
  const markAsRead = useMarkAsRead();
  console.log("NotificationItem render",openDialog);
useEffect(() => {
  setIsRead(notification.read === 1);
}, [notification.read]);
  const cleanSubject = sanitizeToPlainText(
    notification.subject
  ).replace(/\s+/g, " ").trim();

  const handleClick = async () => {
    setOpenDialog(true);   // open always
  
    if (notification.read === 0) {
      try {
        onMarkedRead(notification.name);
        await markAsRead.mutateAsync(notification.name);
      } catch (err) {
        console.error("Mark read failed", err);
      }
    }
  };
  

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHr < 24) return `${diffHr} hours ago`;
    return `${diffDay} days ago`;
  };

  return (
    <>
      {/* List item */}
      <div
        onClick={handleClick}
        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50
        ${isRead ? "bg-white" : "bg-white shadow-sm"}`}
      >
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center p-2 rounded-md bg-[#AD2D6C]/10">
            <PiListChecksBold
              size={28}
              className="text-[#AD2D6C] border-2 border-[#AD2D6C] rounded-[5px] p-0.5"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-3">
              <span
                className={
                  isRead
                    ? "font-normal text-gray-600"
                    : "font-semibold text-gray-900"
                }
              >
                {notification.type}
              </span>
              :{" "}
              <span
                className={
                  isRead ? "text-gray-400" : "text-gray-600"
                }
              >
                {cleanSubject}
              </span>
            </p>

            <p className="text-xs text-gray-500 mt-1.5">
              {formatTimeAgo(notification.creation)}
            </p>
          </div>
        </div>

        {/* Unread dot */}
        {!isRead && (
          <span className="w-2 h-2 rounded-full bg-[#AD2D6C]" />
        )}
      </div>

      {/* Drawer */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpenDialog(false)}
          />

          {/* Panel */}
          <div className="w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-medium truncate">
                {cleanSubject}
              </h3>

              <button
                onClick={() => setOpenDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <p className="text-sm">
                <strong>From:</strong> {notification.from_user}
              </p>
              <p className="text-sm">
                <strong>To:</strong> {notification.for_user}
              </p>
              <p className="text-sm">
                <strong>Date:</strong>{" "}
                {new Date(notification.creation).toLocaleString()}
              </p>

              <div className="pt-4 text-gray-800">
                {cleanSubject}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end">
              <Button onClick={() => setOpenDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
