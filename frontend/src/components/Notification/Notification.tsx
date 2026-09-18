/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { PiListChecksBold } from "react-icons/pi";
import { useNavigate } from "react-router";
import {
  useMarkAsRead,
  useMarkAllAsRead,
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
import { useCurrentUser } from "../../hooks/useCurrentUser";

// -------------------- TYPES --------------------
interface NotificationLog {
  email_content: string;
  name: string;
  subject: string;
  for_user: string;
  type: string;
  read: number;
  from_user: string;
  creation: string;
  url: string | null;
  link: string | null;
  document_type: string | null;
  document_name: string | null;
  todo: string | null;
}

// Map tab → readFilter param
const TAB_FILTER: Record<"all" | "read" | "unread", 0 | 1 | undefined> = {
  all: undefined,
  read: 1,
  unread: 0,
};

const NotificationList = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"all" | "read" | "unread">("all");

  const LIMIT = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const { data: currentUser } = useCurrentUser();

  const effectiveUser = currentUser?.email || currentUser?.name;

  // ✅ Pass readFilter to API — server-side filtering
  const readFilter = TAB_FILTER[activeTab];

  const { data, isLoading } = useNotifications(
    effectiveUser,
    LIMIT,
    (currentPage - 1) * LIMIT,
    readFilter
  );

  const isQueryLoading =
    isLoading ||
    (!effectiveUser);

  const apiNotifications: NotificationLog[] = useMemo(() => (data ?? []).map((item) => ({
    email_content: item.email_content || "",
    name: item.name,
    subject: item.subject,
    for_user: item.for_user,
    type: item.type,
    read: item.read,
    from_user: item.from_user,
    creation: item.creation,
    url: item.url,
    link: item.link,
    document_type: item.document_type,
    document_name: item.document_name,
    todo: item.todo,
  })), [data]);

  const [selectedNotification, setSelectedNotification] =
    useState<NotificationLog | null>(null);

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // ✅ Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const currentNotifications: NotificationLog[] = apiNotifications;

  // ✅ No client-side filter needed — API already filtered
  const filteredNotifications = currentNotifications;

  // ✅ Pagination logic
  const hasNextPage = apiNotifications.length === LIMIT;
  const totalPages = hasNextPage ? currentPage + 1 : currentPage;

  // ✅ Fetch unread record from API to check if any unread notifications exist globally
  const { data: unreadApiData } = useNotifications(
    effectiveUser,
    1,
    0,
    0
  );
  const hasUnreadApiRecord = (unreadApiData?.length ?? 0) > 0;

  // ✅ Unread IDs in current page (for unread tab scope)
  const unreadIds = useMemo(
    () => currentNotifications.filter((n) => n.read === 0).map((n) => n.name),
    [currentNotifications]
  );

  const hasUnread =
    activeTab === "all" ? hasUnreadApiRecord : unreadIds.length > 0;
  const isMarkAllDisabled = !hasUnread || markAllAsRead.isPending;

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
    setSelectedNotification(null);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync(effectiveUser);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const startItem = filteredNotifications.length === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  const endItem = (currentPage - 1) * LIMIT + filteredNotifications.length;

  // ✅ Pagination Bar
  const PaginationBar = () => {
    // Show at most 2 page numbers between prev and next
    const getVisiblePages = (): number[] => {
      if (totalPages <= 2) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      // Sliding window of 2 pages around currentPage
      let start = currentPage;
      let end = currentPage + 1;
      if (end > totalPages) {
        end = totalPages;
        start = totalPages - 1;
      }
      if (start < 1) start = 1;
      const pages: number[] = [];
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    };
    const pageNumbers = getVisiblePages();
    return (
      <div className="flex-shrink-0 flex gap-4 items-center justify-between overflow-x-scroll px-4 py-3 border-t bg-white">
        <p className="text-sm text-gray-500 whitespace-nowrap">
          {filteredNotifications.length === 0
            ? "No results"
            : `Showing ${startItem} to ${endItem} results`}
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`w-8 h-8 flex items-center justify-center rounded border text-sm
              ${currentPage === 1
                ? "text-gray-300 border-gray-200 cursor-not-allowed"
                : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
          >
            <ChevronLeft size={16} />
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium
                ${currentPage === page
                  ? "bg-primary text-white border-primary"
                  : "text-gray-600 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className={`w-8 h-8 flex items-center justify-center rounded border text-sm
              ${!hasNextPage
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

  const layout = (
    <div className={`flex flex-col ${isDesktop ? "h-full" : "h-screen"} overflow-hidden`}>
      {/* Sticky Header - Mobile Only */}
      {!isDesktop && (
        <div className="flex-shrink-0">
          <HeaderBar title="Notification Log" />
        </div>
      )}

      {/* ✅ Sticky Tabs + Mark All as Read */}
      <div className="flex-shrink-0 flex items-center justify-between border-b bg-white pr-3">
        {/* Tab buttons on left */}
        <div className="flex">
          {(["all", "read", "unread"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize
                ${activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ✅ Mark All as Read — right side (hidden on 'read' tab) */}
        {activeTab !== "read" && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkAllDisabled}
            className={`text-xs font-medium whitespace-nowrap transition-colors
              ${isMarkAllDisabled
                ? "text-gray-300 border border-gray-400 py-1 px-2 rounded hover:bg-gray-100 cursor-not-allowed"
                : "text-primary border border-primary-400 py-1 px-2 rounded hover:bg-primary-100 cursor-pointer"
              }`}
          >
            {markAllAsRead.isPending ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Scrollable List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {isQueryLoading && currentNotifications.length === 0 ? (
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

      {/* Sticky Pagination Footer */}
      <PaginationBar />

      {/* Drawer */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={handleDrawerClose} />

          <div className="w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-medium truncate">
                {sanitizeToPlainText(selectedNotification.subject)
                  .replace(/\s+/g, " ")
                  .trim()}
              </h3>
              <button onClick={handleDrawerClose} className="text-gray-500 hover:text-gray-700">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <p className="text-sm">
                <strong>From:</strong> {selectedNotification.from_user}
              </p>
              <p className="text-sm">
                <strong>To:</strong> {selectedNotification.for_user}
              </p>
              <p className="text-sm">
                <strong>Date:</strong>{" "}
                {new Date(selectedNotification.creation).toLocaleString()}
              </p>
              <div className="pt-4 text-gray-800">
                <strong>Subject:</strong>{" "} {sanitizeToPlainText(selectedNotification.subject)
                  .replace(/\s+/g, " ")
                  .trim()}
              </div>
              {selectedNotification.email_content && (
                <div className="pt-4 text-gray-800">
                  <strong>Message:</strong>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedNotification.email_content,
                    }}
                  />
                </div>
              )}
            </div>

            {selectedNotification.url && (
              <div className="px-6 py-4 border-t flex justify-end gap-2">
                <Button
                  size="md"
                  className="rounded-none h-8"
                  onClick={() => {
                    const targetUrl = selectedNotification?.url ?? "";
                    navigate(targetUrl);
                  }}
                >
                  Act
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return isDesktop ? (
    <DesktopLayoutWrapper title="Notifications">{layout}</DesktopLayoutWrapper>
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
            <span className={isRead ? "font-normal text-gray-600" : "font-semibold text-gray-900"}>
              {item.type}
            </span>
            :{" "}
            <span className={isRead ? "text-gray-400" : "text-gray-600"}>
              {cleanSubject}
            </span>
          </p>

          <p className="text-xs text-gray-500 mt-1.5">{formatTimeAgo(item.creation)}</p>
        </div>
      </div>

      {!isRead && <span className="w-2 h-2 rounded-full bg-[#AD2D6C]" />}
    </div>
  );
};