import React, { useState } from "react";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import FrappeListView from "../ListView";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import type { TeamLeaveRequest } from "../../types/leaves";
import { TeamLeaveRequestSkeleton } from "./LeaveSkeletons";
import RequestDetailsModal from "./RequestDetailsModal";
import type { PreListComponentProps } from "../ListView";
import { LeaveBulkActionBar } from "./LeaveBulkActionBar";

const TeamLeaveRequest: React.FC = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<TeamLeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const isSelected = (id: string) => selectedIds.includes(id);

  const handleBulkAction = (action: "approved" | "rejected") => {
    console.log(`Bulk ${action} for`, selectedIds);
    setSelectedIds([]);
  };
  const BulkBar: React.FC<PreListComponentProps> = ({
    ListQuery,
  }: PreListComponentProps) => {
    const rows: TeamLeaveRequest[] = ListQuery.data?.pages
      ? ListQuery.data.pages.flatMap((p: any) => p.data ?? [])
      : [];

    const pending = rows.filter((r) => r.status === "Open");

    if (!pending.length) return null;

    const allSelected =
      selectedIds.length > 0 && selectedIds.length === pending.length;

    const onSelectAll = () =>
      setSelectedIds(allSelected ? [] : pending.map((r) => r.name));

    return (
      <div className="mb-3">
        <LeaveBulkActionBar
          pendingRequests={pending}
          selectedIds={selectedIds}
          onSelectAll={onSelectAll}
          onBulkAction={handleBulkAction}
        />
      </div>
    );
  };

  const handleCardClick = (request: any) => {
    const teamRequest: TeamLeaveRequest = {
      id: request.name || "",
      name: request.name,
      employee_name: request.employee_name,
      leave_type: request.leave_type,
      from_date: request.from_date,
      to_date: request.to_date,
      status: request.status,
      description: request.description,
      department: request.department,
    };
    setSelectedRequest(teamRequest);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApprove = (id: string) => console.log(`Approving ${id}`);
  const handleReject = (id: string) => console.log(`Rejecting ${id}`);

  if (isUserLoading || !userId) return null;

  return (
    <div className="space-y-3">
      <FrappeListView
        doctype="Leave Application"
        PreListComponent={BulkBar}
        ItemComponent={({ item }) => (
          <TeamLeaveRequestItem
            item={item}
            isSelected={isSelected(item.name)}
            onToggleSelect={toggleSelect}
            onClick={() => handleCardClick(item)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        defaultFields={[
          "name",
          "employee_name",
          "leave_type",
          "from_date",
          "to_date",
          "status",
          "description",
        ]}
        defaultFilters={{ leave_approver: userId }}
        isSearch={true}
        searchFields={["employee_name", "leave_type", "status"]}
        infiniteScroll={true}
        showRefereshButton={true}
        SkeletonComponent={TeamLeaveRequestSkeleton}
      />

      {isModalOpen && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default TeamLeaveRequest;
