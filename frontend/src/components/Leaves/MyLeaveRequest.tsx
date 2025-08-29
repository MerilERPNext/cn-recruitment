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
import { Calendar } from "lucide-react";

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

  // Desktop horizontal layout
  if (isDesktop) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-4 flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col space-y-1">
              <div className="text-sm text-gray-900 font-medium">{item.leave_type}</div>
              <div className="text-sm text-gray-500">
                {format(new Date(item.from_date), "d MMM")} -{" "}
                {format(new Date(item.to_date), "d MMM, yyyy")}
              </div>
            </div>
          </div>

          <div className="col-span-6 pl-26">
            <div className="flex flex-col text-left">
              <div className="text-sm text-gray-900">Reason</div>
              <div className="text-sm text-gray-500 font-medium">
                {item.description || "No reason provided"}
              </div>
            </div>
          </div>

          <div className="col-span-2 flex items-center space-x-3 justify-end">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(
                item.status
              )}`}
            >
              {item.status === "Open" ? "Pending" : item.status}
            </span>

            {item.status === "Open" && (
              <button
                onClick={handleRevokeClick}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                Revoke
              </button>
            )}
          </div>
        </div>


      </div>
    );
  }

  // Mobile vertical layout with Lucide Calendar icon
  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-lg border border-gray-200 p-3 mb-3 shadow-sm cursor-pointer"
    >
      <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
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

        {item.status === "Open" && (
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
    <div className="space-y-3 pb-20 md:pb-8">
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