/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { PiListChecksBold } from "react-icons/pi";
import { useNavigate } from "react-router";
import {
  useMarkAsRead,
  useNotifications,
} from "../../hooks/useNotificationLog";
import { useScreenSize } from "../../hooks/useScreenSize";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import Button from "../shared/atoms/Button";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import { ChevronLeft, ChevronRight } from "lucide-react";

// -------------------- TYPES --------------------
interface NotificationLog {
  name: string;
  subject: string;
  for_user: string;
  type: string;
  read: number;
  from_user: string;
  creation: string;
}

const NotificationList = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<"all" | "read" | "unread">("all");

  const LIMIT = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState<Record<number, NotificationLog[]>>({});

  const { data, isLoading } = useNotifications(
    LIMIT,
    (currentPage - 1) * LIMIT
  );

  const apiNotifications: NotificationLog[] = data ?? [];

  const [selectedNotification, setSelectedNotification] =
    useState<NotificationLog | null>(null);

  const markAsRead = useMarkAsRead();

  useEffect(() => {
    if (!apiNotifications.length) return;

    setPageCache((prev: Record<number, NotificationLog[]>) => ({
      ...prev,
      [currentPage]: apiNotifications,
    }));
  }, [apiNotifications, currentPage]);

  const currentNotifications: NotificationLog[] =
    pageCache[currentPage] ?? [];

  // ✅ Filter
  const filteredNotifications = useMemo(() => {
    if (activeTab === "read") {
      return currentNotifications.filter((n) => n.read === 1);
    }
    if (activeTab === "unread") {
      return currentNotifications.filter((n) => n.read === 0);
    }
    return currentNotifications;
  }, [currentNotifications, activeTab]);

  // ✅ Pagination logic
  const hasNextPage = apiNotifications.length === LIMIT;
  const totalPages = hasNextPage ? currentPage + 1 : currentPage;

  // ✅ Handlers
  const handleItemClick = async (item: NotificationLog) => {
    setSelectedNotification(item);
    if (item.read === 0) {
      try {
        await markAsRead.mutateAsync(item.name);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDrawerClose = () => {
    if (selectedNotification && selectedNotification.read === 0) {
      setPageCache((prev: Record<number, NotificationLog[]>) => ({
        ...prev,
        [currentPage]: (prev[currentPage] ?? []).map((n) =>
          n.name === selectedNotification.name
            ? { ...n, read: 1 }
            : n
        ),
      }));
    }
    setSelectedNotification(null);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const startItem =
    filteredNotifications.length === 0
      ? 0
      : (currentPage - 1) * LIMIT + 1;
  const endItem =
    (currentPage - 1) * LIMIT + filteredNotifications.length;

  // ✅ Pagination Bar — sticky bottom
  const PaginationBar = () => {
    const pageNumbers: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex-shrink-0 flex gap-4 items-center justify-between  overflow-x-scroll px-4 py-3 border-t bg-white">
        <p className="text-sm text-gray-500 whitespace-nowrap">
          {filteredNotifications.length === 0
            ? "No results"
            : `Showing ${startItem} to ${endItem} results`}
        </p>

        <div className="flex items-center gap-1">
          {/* Prev */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`w-8 h-8 flex items-center justify-center rounded border text-sm
              ${
                currentPage === 1
                  ? "text-gray-300 border-gray-200 cursor-not-allowed"
                  : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium
                ${
                  currentPage === page
                    ? "bg-primary text-white border-primary"
                    : "text-gray-600 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {page}
            </button>
          ))}

          {/* Next */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className={`w-8 h-8 flex items-center justify-center rounded border text-sm
              ${
                !hasNextPage
                  ? "text-gray-300 border-gray-200 cursor-not-allowed"
                  : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // ✅ Layout — h-screen overflow-hidden for sticky header/footer + scrollable list
  const layout = (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ✅ Sticky Header */}
      <div className="flex-shrink-0">
        <HeaderBar
          title="Notification Log"
          onBack={() => navigate(-1)}
        />
      </div>

      {/* ✅ Sticky Tabs */}
      <div className="flex-shrink-0 flex border-b bg-white">
        {["all", "read", "unread"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium capitalize
              ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ✅ Scrollable List — min-h-0 is key for flex scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {isLoading && currentNotifications.length === 0 ? (
          <CardSkeleton />
        ) : filteredNotifications.length === 0 ? (
          <NoDataFound
            title="No Notifications"
            subtitle="You don't have any notifications yet."
          />
        ) : (
          <div className="space-y-1">
            {filteredNotifications.map((item) => (
              <NotificationItem
                key={item.name}
                item={item}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ✅ Sticky Pagination Footer */}
      <PaginationBar />

      {/* Drawer */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={handleDrawerClose}
          />

          <div className="w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-medium truncate">
                {sanitizeToPlainText(selectedNotification.subject)
                  .replace(/\s+/g, " ")
                  .trim()}
              </h3>

              <button
                onClick={handleDrawerClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <p className="text-sm">
                <strong>From:</strong>{" "}
                {selectedNotification.from_user}
              </p>
              <p className="text-sm">
                <strong>To:</strong>{" "}
                {selectedNotification.for_user}
              </p>
              <p className="text-sm">
                <strong>Date:</strong>{" "}
                {new Date(
                  selectedNotification.creation
                ).toLocaleString()}
              </p>

              <div className="pt-4 text-gray-800">
                {sanitizeToPlainText(selectedNotification.subject)
                  .replace(/\s+/g, " ")
                  .trim()}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <Button size="md" onClick={handleDrawerClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
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
  onClick: () => void;
}> = ({ item, onClick }) => {
  const isRead = item.read === 1;

  const cleanSubject = sanitizeToPlainText(item.subject)
    .replace(/\s+/g, " ")
    .trim();

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
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50
      ${isRead ? "bg-white" : "bg-white shadow-sm"}`}
    >
      <div className="flex items-start gap-4 flex-1">
        <div className="flex-shrink-0 flex items-center justify-center p-2 rounded-md bg-[#AD2D6C]/10">
          <PiListChecksBold
            size={28}
            className="text-[#AD2D6C] border-2 border-[#AD2D6C] rounded-[5px] p-0.5"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-3">
            <span
              className={
                isRead
                  ? "font-normal text-gray-600"
                  : "font-semibold text-gray-900"
              }
            >
              {item.type}
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
            {formatTimeAgo(item.creation)}
          </p>
        </div>
      </div>

      {!isRead && (
        <span className="w-2 h-2 rounded-full bg-[#AD2D6C]" />
      )}
    </div>
  );
};