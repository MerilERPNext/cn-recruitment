import React, { useState } from "react";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import FrappeListView from "../ListView";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import type { TeamLeaveRequest } from "../../types/leaves";
import { TeamLeaveRequestSkeleton } from "./LeaveSkeletons";
import RequestDetailsModal from "./RequestDetailsModal";
import type { PreListComponentProps } from "../ListView";
import { LeaveBulkActionBar } from "./LeaveBulkActionBar";
import HeaderBar from "../HeaderBar";

const TeamLeaveRequest: React.FC = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<TeamLeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewAllModal, setViewAllModal] = useState<{
    isOpen: boolean;
    type: "pending" | "actioned" | null;
    requests: TeamLeaveRequest[];
  }>({
    isOpen: false,
    type: null,
    requests: [],
  });

  const {
    data: userId,
    isLoading: isUserLoading,
    error: userError,
  } = useLoggedInUser();

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const isSelected = (id: string) => selectedIds.includes(id);

  const handleBulkAction = (action: "approved" | "rejected") => {
    console.log(`Bulk ${action} for`, selectedIds);
    setSelectedIds([]);
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

  const BulkActionSection: React.FC<{
    pendingRequests: TeamLeaveRequest[];
  }> = ({ pendingRequests }) => {
    if (!pendingRequests.length) return null;

    const allSelected =
      selectedIds.length > 0 && selectedIds.length === pendingRequests.length;

    const onSelectAll = () =>
      setSelectedIds(allSelected ? [] : pendingRequests.map((r) => r.name));

    return (
      <div className="mb-4">
        <LeaveBulkActionBar
          pendingRequests={pendingRequests}
          selectedIds={selectedIds}
          onSelectAll={onSelectAll}
          onBulkAction={handleBulkAction}
        />
      </div>
    );
  };

  const PendingRequestsSection: React.FC<PreListComponentProps> = ({
    ListQuery,
  }) => {
    const rows: TeamLeaveRequest[] = ListQuery.data?.pages
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ListQuery.data.pages.flatMap((p: any) => p.data ?? [])
      : [];

    const pendingRequests = rows.filter((r) => r.status === "Open");
    const displayedRequests = pendingRequests.slice(0, 3);

    const handleViewAll = () => {
      setViewAllModal({
        isOpen: true,
        type: "pending",
        requests: pendingRequests,
      });
    };

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
              key={request.name}
              item={request}
              isSelected={isSelected(request.name)}
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

  const ActionedRequestsSection: React.FC<PreListComponentProps> = ({
    ListQuery,
  }) => {
    const rows: TeamLeaveRequest[] = ListQuery.data?.pages
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ListQuery.data.pages.flatMap((p: any) => p.data ?? [])
      : [];

    const actionedRequests = rows.filter(
      (r) => r.status === "Approved" || r.status === "Rejected"
    );
    const displayedRequests = actionedRequests.slice(0, 3);

    const handleViewAll = () => {
      setViewAllModal({
        isOpen: true,
        type: "actioned",
        requests: actionedRequests,
      });
    };

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
              key={request.name}
              item={request}
              onClick={() => handleCardClick(request)}
            />
          ))}
        </div>
      </div>
    );
  };

  const SectionedView: React.FC<PreListComponentProps> = ({ ListQuery }) => (
    <div>
      <PendingRequestsSection
        ListQuery={ListQuery}
        doctype={""}
        setCurrentPage={function (): void {
          throw new Error("Function not implemented.");
        }}
        currentPage={0}
        totalPages={0}
        startIndex={0}
        endIndex={0}
        pageSize={0}
        totalCount={0}
      />
      <ActionedRequestsSection
        ListQuery={ListQuery}
        doctype={""}
        setCurrentPage={function (): void {
          throw new Error("Function not implemented.");
        }}
        currentPage={0}
        totalPages={0}
        startIndex={0}
        endIndex={0}
        pageSize={0}
        totalCount={0}
      />
    </div>
  );

  const ViewAllModal: React.FC = () => {
    if (!viewAllModal.isOpen || !viewAllModal.type) return null;

    const isPending = viewAllModal.type === "pending";
    const title = isPending ? "All Pending Requests" : "All Actioned Requests";

    const handleCloseViewAll = () => {
      setViewAllModal({ isOpen: false, type: null, requests: [] });
    };

    return (
      <div className="fixed inset-0 bg-white z-[60] flex flex-col">
        <HeaderBar title={title} onBack={handleCloseViewAll} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            {isPending && (
              <div className="mb-6">
                <BulkActionSection pendingRequests={viewAllModal.requests} />
              </div>
            )}

            <div className="space-y-3">
              {viewAllModal.requests.map((request) => (
                <TeamLeaveRequestItem
                  key={request.name}
                  item={request}
                  isSelected={isPending ? isSelected(request.name) : undefined}
                  onToggleSelect={isPending ? toggleSelect : undefined}
                  onClick={() => {
                    handleCloseViewAll();
                    handleCardClick(request);
                  }}
                  onApprove={isPending ? handleApprove : undefined}
                  onReject={isPending ? handleReject : undefined}
                />
              ))}
            </div>

            {viewAllModal.requests.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                No {isPending ? "pending" : "actioned"} requests found
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const EmptyItemComponent = () => null;

  const handleCardClick = (request: TeamLeaveRequest) => {
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

  if (userError) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load Team Leave Requests. Please try again.
      </div>
    );
  }

  if (isUserLoading || !userId) return <TeamLeaveRequestSkeleton />;

  return (
    <div className="space-y-3">
      <FrappeListView
        doctype="Leave Application"
        PreListComponent={SectionedView}
        ItemComponent={EmptyItemComponent}
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

      <ViewAllModal />
    </div>
  );
};

export default TeamLeaveRequest;
