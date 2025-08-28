import React, { useState, useEffect } from "react";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import FrappeListView from "../ListView";
import { LeaveApplicationItem } from "../../types/leaves";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { MyLeaveRequestSkeleton } from "./LeaveSkeletons";
import { format } from "date-fns";
import RequestDetailsModal from "./RequestDetailsModal";
import { PiHandTap } from "react-icons/pi";

const LeaveRequestItem = ({
  item,
  onClick,
}: {
  item: LeaveApplicationItem;
  onClick?: () => void;
}) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Open":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBlockColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-700";
      case "Open":
        return "bg-yellow-700";
      case "Rejected":
      case "Cancelled":
        return "bg-red-700";
      default:
        return "bg-gray-700";
    }
  };

  const handleRevokeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Revoke request triggered for:", item.name);
  };

  const handleCardClick = () => {
    if (!isDesktop && onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-lg border border-gray-200 p-3 mb-3 shadow-sm ${
        !isDesktop ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {item.leave_type}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {format(new Date(item.from_date), "d MMM")} -{" "}
              {format(new Date(item.to_date), "d MMM, yyyy")}
            </p>
          </div>
        </div>

        {item.status === "Open" && !isDesktop && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Nudge button clicked!");
            }}
          >
            <PiHandTap className="w-6 h-6 text-gray-500" />
          </button>
        )}

        <span
          className={`px-2 py-1 flex items-center rounded-[20px] text-xs font-medium ${getStatusColor(
            item.status
          )}`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${getBlockColor(
              item.status
            )}`}
          ></span>
          {item.status === "Open" ? "Pending" : item.status}
        </span>
      </div>

      {isDesktop && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Reason for leave
          </h4>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-sm text-gray-600">
              {item.description || "kuch"}
            </p>
          </div>
        </div>
      )}

      {item.status === "Open" && isDesktop && (
        <div className="mt-3">
          <button
            onClick={handleRevokeClick}
            className="w-full bg-black text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  );
};

const MyLeaveRequest: React.FC = () => {
  const {
    data: userId,
    isLoading: isUserLoading,
    error: userError,
  } = useLoggedInUser();

  const {
    data: currentEmployee,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = useEmployeeByUserId(userId);

  const [selectedRequest, setSelectedRequest] =
    useState<LeaveApplicationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setRefetch } = useLeaveRequestRefresh();

  const handleCardClick = (item: LeaveApplicationItem) => {
    setSelectedRequest(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  if (userError || employeeError) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load Leave Requests. Please try again.
      </div>
    );
  }

  if (isUserLoading || isEmployeeLoading || !currentEmployee?.name) {
    return <MyLeaveRequestSkeleton />;
  }

  return (
    <div className="space-y-3 pb-20"> {/* 👈 padding bottom added here */}
      <FrappeListView<LeaveApplicationItem>
        doctype="Leave Application"
        ItemComponent={({ item }) => (
          <LeaveRequestItem
            item={item}
            onClick={() => handleCardClick(item)}
          />
        )}
        defaultFields={[
          "name",
          "leave_type",
          "from_date",
          "to_date",
          "status",
          "description",
        ]}
        defaultFilters={{ employee: currentEmployee.name }}
        isSearch={true}
        searchFields={["name", "leave_type", "status"]}
        infiniteScroll={true}
        showRefereshButton={true}
        onRefetchAvailable={setRefetch}
        SkeletonComponent={MyLeaveRequestSkeleton}
      />

      {isModalOpen && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModal}
          isMyLeaveRequest={true}
          onRevoke={() => console.log("Revoke request triggered")}
        />
      )}
    </div>
  );
};

export default MyLeaveRequest;