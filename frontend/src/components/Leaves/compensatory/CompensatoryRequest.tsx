import React, { useMemo, useState } from "react";
import { useEmployeeByUserId } from "../../../hooks/useEmployee";
import { useGetCompOffList } from "../../../hooks/useLeaves";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import CustomDropdown from "../../shared/CustomDropdown";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import CompensatoryRequestCard, {
  CompensatoryRequestItem,
} from "./CompensatoryRequestCard";
import CompOffDetailsModal from "./CompOffDetailsModal";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Issued", value: "Issued" },
  { label: "Allocated", value: "Allocated" },
  { label: "Expired", value: "Expired" },
];

const CompensatoryRequest: React.FC = () => {
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
  const [selectedStatus, setSelectedStatus] = useState("Pending");

  const [selectedRequest, setSelectedRequest] =
    useState<CompensatoryRequestItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDesktop } = useScreenSize();
  const { data, isLoading, isError, error } = useGetCompOffList(
    currentEmployee?.name,
  );

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (item: CompensatoryRequestItem) => item.custom_status === selectedStatus,
    );
  }, [data, selectedStatus]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
  };

  const handleCardClick = (item: CompensatoryRequestItem) => {
    if (!isDesktop) {
      setSelectedRequest(item);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  if (userError || employeeError) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load Compensatory Requests. Please try again.
      </div>
    );
  }

  if (isError) return <p>Error: {(error as Error).message}</p>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">Compensatory Requests</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your compensatory requests
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4">Compensatory Requests</Typography>
              </div>
            )}
            <CustomDropdown
              value={selectedStatus}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={[
            "Request Type",
            "Work From Date",
            "Work To Date",
            "Reason",
            "Status",
            "Actions",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1.5fr", "1fr", "1fr"]}
        >
          {isLoading || isUserLoading || isEmployeeLoading ? (
            <CardSkeleton />
          ) : filteredData.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              No records found
            </div>
          ) : (
            filteredData.map((item) => (
              <CompensatoryRequestCard
                key={item.name}
                item={item}
                onClick={() => handleCardClick(item)}
              />
            ))
          )}
        </CardTable>
      </div>

      {!isDesktop && isModalOpen && selectedRequest && (
        <CompOffDetailsModal
          compOff={selectedRequest}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default CompensatoryRequest;
