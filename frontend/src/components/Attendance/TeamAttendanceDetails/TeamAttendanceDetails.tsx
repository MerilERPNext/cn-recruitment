import { useState, useMemo } from "react";
import { BulkActionBar } from "./BulkActionBar";
import { RequestCard } from "./RequestCard";
import {
  useActionOnAttendanceRequest,
  useAllAttendanceRequests,
} from "../../../hooks/useAttendance";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import { useNavigate } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";

const TeamAttendanceDetails = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useAllAttendanceRequests(5, [
    ["employee", "!=", currentEmployee?.employee],
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<AttendanceRequest | null>(null);
  const { pendingRequests, actionedRequests } = useMemo(() => {
    const pending = data.filter((req) => req.status === "Pending");
    const actioned = data.filter(
      (req) => req.status === "Approved" || req.status === "Rejected"
    );
    return {
      pendingRequests: pending,
      actionedRequests: actioned,
    };
  }, [data]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const selectAll = () => {
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRequests.map((r) => r.todo_id));
    }
  };

  const mutation = useActionOnAttendanceRequest();
  const handleAction = (action: "Approve" | "Reject") => {
    mutation.mutate(
      {
        todo_ids: selectedIds,
        selected_action: action,
      },
      {
        onSuccess: () => {
          refetch();
          toast.success(
            `Attendance request ${
              action === "Reject" ? "rejecte" : action.toLowerCase()
            }d successfully!`
          );
        },
        onError: (error) => {
          toast.error(error?.message);
          console.error(error);
        },
      }
    );
  };
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <>
        <div className="bg-white min-h-screen">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-500">Loading attendance requests...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-white min-h-screen">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">⚠️</div>
              <p className="text-gray-600">Error loading attendance requests</p>
              <p className="text-sm text-gray-500 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data || data.length === 0) {
    return (
      <>
        <div className="bg-white min-h-screen">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Attendance Requests
              </h3>
              <p className="text-gray-500 mb-6">
                There are currently no attendance requests to display.
              </p>
              <button
                onClick={() => {
                  refetch();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white">
          {/* Pending */}

          <div className="flex justify-between p-4">
            <h2 className=" text-lg font-semibold text-gray-800">
              Pending Requests
            </h2>
            {pendingRequests?.length > 0 && (
              <button
                onClick={() => {
                  navigate(
                    "/webapp/attendance/team-attendance-requests/pendings"
                  );
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            )}
          </div>
          {pendingRequests?.length > 0 && (
            <div className="mb-4 px-4">
              <BulkActionBar
                selectedIds={selectedIds}
                pendingRequests={pendingRequests}
                onSelectAll={selectAll}
                onBulkAction={(action: "Approve" | "Reject") => {
                  handleAction(action);
                  setSelectedIds([]);
                }}
              />
            </div>
          )}

          <div className="space-y-3 border-t-1 border-gray-200 pt-2 px-4">
            {pendingRequests?.length > 0 ? (
              pendingRequests.map((request) => (
                <RequestCard
                  key={request.name}
                  request={request}
                  isActionedCard={false}
                  isSelected={isSelected(request.todo_id)}
                  onToggleSelect={toggleSelect}
                  onClick={(request) => setSelectedRequest(request)}
                  onAction={() => {
                    refetch();
                  }}
                />
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-500">No pending attendance requests</p>
              </div>
            )}
          </div>
        </div>

        {/* Actioned */}
        <div className="bg-white ">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 border-b-1 border-gray-200 p-4">
              Actioned Requests
            </h2>
            <div className="space-y-3 px-4">
              {actionedRequests?.length > 0 ? (
                actionedRequests.map((request) => (
                  <RequestCard
                    key={request.name}
                    request={request}
                    isActionedCard={true}
                    onClick={(request) => setSelectedRequest(request)}
                  />
                ))
              ) : (
                <div className="p-4 text-center ">
                  <p className="text-gray-500">
                    No actioned attendance requests
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedRequest && (
        <AttendanceDetailView
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            refetch();
          }}
        />
      )}
    </>
  );
};

export default TeamAttendanceDetails;
