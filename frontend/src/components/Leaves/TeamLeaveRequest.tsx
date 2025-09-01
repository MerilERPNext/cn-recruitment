import React, { useState } from "react";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import type { TeamRequest } from "../../types/leaves";
import { TeamLeaveRequestSkeleton } from "./LeaveSkeletons";
import RequestDetailsModal from "./RequestDetailsModal";
import { LeaveBulkActionBar } from "./LeaveBulkActionBar";
import HeaderBar from "../HeaderBar";
import { usePostTaskAction, useTeamRequests } from "../../hooks/useLeaves";
import toast from "react-hot-toast";

const TeamLeaveRequest: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<TeamRequest | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [viewAllModal, setViewAllModal] = useState<{
    isOpen: boolean;
    type: "pending" | "actioned" | null;
  }>({ isOpen: false, type: null });

  const { data: teamRequests, isLoading, error } = useTeamRequests();
  const { mutate: postAction } = usePostTaskAction();

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const isSelected = (id: string) => selectedIds.includes(id);

  // const handleBulkAction = (action: "approved" | "rejected") => {
  //   console.log(`Bulk ${action} for`, selectedIds);
  //   setSelectedIds([]);
  // };

  const handleBulkAction = (action: "Approve" | "Reject") => {
    if (!selectedIds.length) return;

    postAction(
      { todo_ids: selectedIds, selected_action: action },
      {
        onSuccess: () => {
          toast.success(
            `${selectedIds.length} request${
              selectedIds.length > 1 ? "s" : ""
            } ${action.toLowerCase()}d`
          );
          setSelectedIds([]);
        },
        onError: () => {
          toast.error(`Bulk ${action.toLowerCase()} failed`);
          setSelectedIds([]);
        },
      }
    );
  };

  const SectionHeader: React.FC<{
    title: string;
    count: number;
    onViewAll: () => void;
  }> = ({ title, count, onViewAll }) => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {count > 0 && (
        <button
          onClick={onViewAll}
          className="text-blue-600 text-sm font-medium hover:text-blue-700"
        >
          View All
        </button>
      )}
    </div>
  );

  // const BulkActionSection: React.FC<{
  //   pendingRequests: TeamRequest[];
  // }> = ({ pendingRequests }) => {
  //   if (!pendingRequests.length) return null;

  //   const allSelected =
  //     selectedIds.length > 0 && selectedIds.length === pendingRequests.length;

  //   const onSelectAll = () =>
  //     setSelectedIds(allSelected ? [] : pendingRequests.map((r) => r.name));

  //   return (
  //     <div className="mb-4">
  //       <LeaveBulkActionBar
  //         pendingRequests={pendingRequests}
  //         selectedIds={selectedIds}
  //         onSelectAll={onSelectAll}
  //         onBulkAction={handleBulkAction}
  //       />
  //     </div>
  //   );
  // };

  const BulkActionSection: React.FC<{
    pendingRequests: TeamRequest[];
  }> = ({ pendingRequests }) => {
    const actualPending = pendingRequests.filter((r) => r.status === "Open");
    if (!actualPending.length) return null;

    const allSelected =
      selectedIds.length > 0 && selectedIds.length === actualPending.length;

    const onSelectAll = () =>
      setSelectedIds(
        allSelected ? [] : actualPending.map((r) => r.todo_id) // names to match toggleSelect
      );

    return (
      <div className="mb-4">
        <LeaveBulkActionBar
          pendingRequests={actualPending}
          selectedIds={selectedIds}
          onSelectAll={onSelectAll}
          onBulkAction={handleBulkAction} // ← now wired
        />
      </div>
    );
  };

  const PendingRequestsSection: React.FC<{
    requests: TeamRequest[];
  }> = ({ requests }) => {
    const pendingRequests = requests.filter((r) => r.status === "Open");
    const displayedRequests = pendingRequests.slice(0, 3);

    const handleViewAll = () =>
      setViewAllModal({ isOpen: true, type: "pending" });

    if (!pendingRequests.length) {
      return (
        <div className="mb-8">
          <SectionHeader
            title="Pending Requests"
            count={0}
            onViewAll={handleViewAll}
          />
          <div className="text-center text-gray-500 py-8">
            No pending requests
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <SectionHeader
          title="Pending Requests"
          count={pendingRequests.length}
          onViewAll={handleViewAll}
        />

        <BulkActionSection pendingRequests={pendingRequests} />

        <div className="space-y-3">
          {displayedRequests.map((request) => (
            <TeamLeaveRequestItem
              key={request.id ?? request.name}
              item={request}
              isSelected={isSelected(request.todo_id)}
              onToggleSelect={toggleSelect}
              onClick={() => handleCardClick(request)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>
    );
  };

  const ActionedRequestsSection: React.FC<{
    requests: TeamRequest[];
  }> = ({ requests }) => {
    const actionedRequests = requests.filter(
      (r) => r.status === "Approved" || r.status === "Rejected"
    );
    const displayedRequests = actionedRequests.slice(0, 3);

    const handleViewAll = () =>
      setViewAllModal({ isOpen: true, type: "actioned" });

    if (!actionedRequests.length) {
      return (
        <div className="mb-8">
          <SectionHeader
            title="Actioned Requests"
            count={0}
            onViewAll={handleViewAll}
          />
          <div className="text-center text-gray-500 py-8">
            No actioned requests
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <SectionHeader
          title="Actioned Requests"
          count={actionedRequests.length}
          onViewAll={handleViewAll}
        />

        <div className="space-y-3">
          {displayedRequests.map((request) => (
            <TeamLeaveRequestItem
              key={request.id ?? request.name}
              item={request}
              onClick={() => handleCardClick(request)}
            />
          ))}
        </div>
      </div>
    );
  };

  const ViewAllModal: React.FC = () => {
    if (!viewAllModal.isOpen || !viewAllModal.type) return null;

    const isPending = viewAllModal.type === "pending";
    const title = isPending ? "All Pending Requests" : "All Actioned Requests";

    const requests = isPending
      ? teamRequests?.filter((r) => r.status === "Open") ?? []
      : teamRequests?.filter(
          (r) => r.status === "Approved" || r.status === "Rejected"
        ) ?? [];

    const handleClose = () => setViewAllModal({ isOpen: false, type: null });

    return (
      <div className="fixed inset-0 bg-white z-[60] flex flex-col">
        <HeaderBar title={title} onBack={handleClose} />

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            {isPending && (
              <div className="mb-6">
                <BulkActionSection pendingRequests={requests} />
              </div>
            )}

            <div className="space-y-3">
              {requests.map((request) => (
                <TeamLeaveRequestItem
                  key={request.id ?? request.name}
                  item={request}
                  isSelected={
                    isPending ? isSelected(request.todo_id) : undefined
                  }
                  onToggleSelect={isPending ? toggleSelect : undefined}
                  onClick={() => {
                    handleClose();
                    handleCardClick(request);
                  }}
                  onApprove={isPending ? handleApprove : undefined}
                  onReject={isPending ? handleReject : undefined}
                />
              ))}
            </div>

            {requests.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                No {isPending ? "pending" : "actioned"} requests found
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleCardClick = (request: TeamRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApprove = (todo_id: string) => {
    postAction(
      { todo_ids: [todo_id], selected_action: "Approve" },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (response: any) => {
          if (response?.status === "success")
            toast.success("Leave request approved");
        },
        onError: () => toast.error("Failed to approve leave request"),
      }
    );
  };

  const handleReject = (todo_id: string) => {
    postAction(
      { todo_ids: [todo_id], selected_action: "Reject" },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (response: any) => {
          if (response?.status === "success")
            toast.success("Leave request Rejected");
        },
        onError: () => toast.error("Failed to reject leave request"),
      }
    );
  };

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load Team Leave Requests. Please try again.
      </div>
    );
  }

  if (isLoading || !teamRequests) return <TeamLeaveRequestSkeleton />;

  return (
    <div className="space-y-3">
      <PendingRequestsSection requests={teamRequests} />
      <ActionedRequestsSection requests={teamRequests} />

      {isModalOpen && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModal}
        />
      )}

      <ViewAllModal />
    </div>
  );
};

export default TeamLeaveRequest;
