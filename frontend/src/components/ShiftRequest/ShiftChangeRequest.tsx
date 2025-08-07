import { Calendar } from "lucide-react";
import { useShiftRequests, useApproveShiftRequest, useRejectShiftRequest } from "../../hooks/useShift";
import { useState } from "react";

export default function ShiftChangeRequests() {
  const { data = [], isLoading, error } = useShiftRequests();
  const approveShiftRequest = useApproveShiftRequest();
  const rejectShiftRequest = useRejectShiftRequest();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedRequests = data.map((item: any) => ({
    id: item.name,
    name: item.employee_name || "Unknown",
    date: item.creation ? item.creation.split(" ")[0] : "",
    currentShift: "",
    requestedShift: item.shift_type || "",
    from: item.from_date || "",
    to: item.to_date || "",
    status: item.status || "Pending",
  }));

  const handleApprove = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      await approveShiftRequest.mutateAsync(requestId);
    } catch {
      console.error("Failed to approve shift request ❌");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      await rejectShiftRequest.mutateAsync(requestId);
    } catch {
      console.error("Failed to reject shift request ❌");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading shift requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading shift requests</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (mappedRequests.length === 0) {
    return (
      <div className="w-full mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Team Requests</h2>
          <p className="text-sm text-gray-500">
            Pending shift change requests from your subordinates.
          </p>
        </div>

        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shift requests found</h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              There are currently no pending shift change requests from your team members.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-6">
     
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Team Requests</h2>
        <p className="text-sm text-gray-500">
          Pending shift change requests from your subordinates.
        </p>
      </div>

      {mappedRequests.map((request) => {
        const isProcessing = processingIds.has(request.id);

        return (
          <div
            key={request.id}
            className="bg-white shadow rounded-xl p-4 space-y-4 border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div className="gap-4">
                <p className="font-semibold text-gray-800">{request.name}</p>
                <p className="text-sm text-gray-500">{request.date}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-3xl ${
                request.status === 'Approved'
                  ? 'bg-green-100 text-green-700'
                  : request.status === 'Rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}>
                {request.status}
              </span>
            </div>

            <div className="text-sm flex flex-col gap-2">
              <p>
                <strong>Current:</strong>{" "}
                <span className="text-gray-800">{request.currentShift}</span>
              </p>
              <p>
                <strong>Requested:</strong>{" "}
                <span className="text-gray-800">{request.requestedShift}</span>
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">From Date</label>
                <div className="flex items-center border rounded-md px-2 py-1">
                  <input
                    type="text"
                    className="w-full focus:outline-none text-sm"
                    value={request.from}
                    readOnly
                  />
                  <Calendar size={16} className="text-gray-500 ml-1" />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">To Date</label>
                <div className="flex items-center border rounded-md px-2 py-1">
                  <input
                    type="text"
                    className="w-full focus:outline-none text-sm"
                    value={request.to || "—"}
                    readOnly
                  />
                  <Calendar size={16} className="text-gray-500 ml-1" />
                </div>
              </div>
            </div>

            {request.status === 'Draft' || request.status === 'Pending' ? (
              <div className="flex w-full gap-4 justify-between py-3">
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={isProcessing}
                  className={`px-6 w-full py-2 text-sm rounded-md transition-colors ${
                    isProcessing
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={isProcessing}
                  className={`px-6 w-full py-2 text-sm rounded-md text-white transition-colors ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            ) : (
              <div className="py-3 text-center text-sm text-gray-500">
                Request has been {request.status.toLowerCase()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
