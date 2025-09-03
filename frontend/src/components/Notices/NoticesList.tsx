import React, { useState } from "react";
import FrappeListView from "../ListView";
import NoticeCard from "./NoticeCard";
import NoticeCardSkeleton from "./NoticeCardSkeleton";
import { BaseItem, NoticeItem } from "./types/noticeItem";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import {
  useArchiveNotice,
  useDismissNotice,
  useGetAllNoticeReadStatus,
  useMarkNoticeAsRead,
} from "../../hooks/useNotices";
import { useNavigate } from "react-router";

interface NoticesListProps {
  activeTab: string;
}

const NoticesList: React.FC<NoticesListProps> = ({ activeTab }) => {
  const navigate = useNavigate();
  const [refetchListView, setRefetchListView] = useState<() => void>();

  const markAsRead = useMarkNoticeAsRead();
  const archive = useArchiveNotice();
  const dismiss = useDismissNotice();
  const { data: userId } = useLoggedInUser();
  const filters = userId ? [["user", "=", userId]] : [];

  const { data: noticesReadStatus } = useGetAllNoticeReadStatus(
    filters as any,
    activeTab === "unread"
  );
  let defaultFilters: Record<string, string> = {};
  if (activeTab === "all") defaultFilters = { status: "Published" };
  else if (activeTab === "unread")
    defaultFilters = {
      name: [
        "not in",
        [
          ...new Set(
            (noticesReadStatus ?? []).map(
              (item: { notice: string }) => item?.notice
            )
          ),
        ],
      ] as any,
    };
  else if (activeTab === "archived") defaultFilters = { status: "archived" };

  const handleActionClick = async (
    noticeId: string,
    actionType: string,
    silent = false
  ) => {
    if (!silent) {
      console.log(`Action clicked: ${actionType} for notice ${noticeId}`);
    }

    try {
      switch (actionType) {
        case "mark_as_read":
          await markAsRead.mutateAsync(noticeId);
          break;
        case "view_task":
          await markAsRead.mutateAsync(noticeId);
          navigate(`/webapp/recruitment-app/task-details/${noticeId}`);
          break;
        case "add_calendar":
          await markAsRead.mutateAsync(noticeId);
          console.log(`Adding to calendar for notice ${noticeId}`);
          break;
        case "dismiss":
          await dismiss.mutateAsync(noticeId);
          break;
        case "archive":
          await archive.mutateAsync(noticeId);
          break;
        case "approve":
        case "reject":
        case "view_details":
          await markAsRead.mutateAsync(noticeId);
          navigate(`/webapp/notices/${noticeId}`);
          break;
        default:
          console.warn(`Unknown action type: ${actionType}`);
      }
      refetchListView?.();
    } catch (error) {
      console.error(
        `Failed to handle action ${actionType} for notice ${noticeId}:`,
        error
      );
    }
  };

  return (
    <main className="space-y-3">
      <FrappeListView
        doctype="Notice"
        ItemComponent={NoticeCard}
        SkeletonComponent={NoticeCardSkeleton}
        onItemClick={(item: BaseItem) => {
          const noticeId = item.id || item.name;
          const notice = item as NoticeItem;
          handleActionClick(noticeId, notice.action?.type || "view_details");
        }}
        isSearch
        pageSize={10}
        defaultFilters={defaultFilters}
        defaultFields={[
          "name",
          "title",
          "priority",
          "publish_date",
          "expiry_date",
          "status",
        ]}
        searchFields={["title", "message", "priority", "status"]}
        infiniteScroll
        onRefetchAvailable={setRefetchListView}
      />
    </main>
  );
};

export default NoticesList;
