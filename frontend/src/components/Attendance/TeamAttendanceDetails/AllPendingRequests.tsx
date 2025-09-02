import { useState } from "react";
import {
  useActionOnAttendanceRequest,
  useAllAttendanceRequests,
} from "../../../hooks/useAttendance";
import { AttendanceRequest } from "../../../types/attendance";
import { RequestCard } from "./RequestCard";
import { BulkActionBar } from "./BulkActionBar";
import { AttendanceDetailView } from "../AttendanceDetails";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";

const AllPendingRequests = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { data = [], refetch } = useAllAttendanceRequests("*", [
    ["status", "=", "Pending"],
    ["employee", "!=", currentEmployee?.employee],
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<AttendanceRequest | null>(null);
  const navigate = useNavigate();
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const isSelected = (id: string) => selectedIds.includes(id);
  const selectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((r) => r.todo_id));
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
  return (
    <div>
      <LayoutHeader
        tab={"Pending Attendants"}
        onBack={() => {
          navigate(-1);
        }}
      />
      <div className="bg-white px-4 mb-16 h-screen">
        <div>
          <div className="my-4">
            <BulkActionBar
              selectedIds={selectedIds}
              pendingRequests={data}
              onSelectAll={selectAll}
              onBulkAction={(action: "Approve" | "Reject") => {
                console.log("Selected Pending IDs:", selectedIds);
                handleAction(action);
                setSelectedIds([]);
              }}
            />
          </div>
          <div className="space-y-3">
            {data?.length > 0 &&
              data.map((request) => (
                <RequestCard
                  key={request.name}
                  isActionedCard={false}
                  request={request}
                  isSelected={isSelected(request.todo_id)}
                  onToggleSelect={toggleSelect}
                  onClick={(request) => setSelectedRequest(request)}
                />
              ))}
          </div>
        </div>
      </div>
      {selectedRequest && (
        <AttendanceDetailView
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default AllPendingRequests;
