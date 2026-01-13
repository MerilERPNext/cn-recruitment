import React, { useMemo, useState } from "react";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../../hooks/useEmployee";
import { MyLeaveRequestSkeleton } from "../LeaveSkeletons";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import CompensatoryRequestCard, {
  CompensatoryRequestItem,
} from "./CompensatoryRequestCard";
import CompOffDetailsModal from "./CompOffDetailsModal";
import { useGetCompOffList } from "../../../hooks/useLeaves";
import CustomDropdown from "../../shared/CustomDropdown";
import { Typography } from "../../shared/atoms/Typography";

const STATUS_OPTIONS = [
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
  const [selectedStatus, setSelectedStatus] = useState("Issued");

  const [selectedRequest, setSelectedRequest] =
    useState<CompensatoryRequestItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDesktop } = useScreenSize();
  const { data, isLoading, isError, error } = useGetCompOffList(
    currentEmployee?.name
  );

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (item: CompensatoryRequestItem) => item.custom_status === selectedStatus
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

  if (
    isLoading ||
    isUserLoading ||
    isEmployeeLoading ||
    !currentEmployee?.name
  ) {
    return <MyLeaveRequestSkeleton />;
  }

  if (isError) return <p>Error: {(error as Error).message}</p>;

  return (
    <div className="px-4 md:py-2 pb-10 md:pb-20">
      <div className="flex justify-between pt-4 mb-2 border-b border-gray-200">
        <Typography variant="subheading">Compensatory Requests</Typography>
        <div className="flex items-center pb-1">
          <CustomDropdown
            value={selectedStatus}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="p-4 text-center text-gray-600">No Comp Offs found</div>
      ) : isDesktop ? (
        <CardTable
          titles={[
            "Request Type",
            "Work From Date",
            "Work To Date",
            "Reason",
            "Status",
            "Actions",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "2.5fr", "1fr", "1fr"]}
        >
          {filteredData.map((item) => (
            <CompensatoryRequestCard
              key={item.name}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </CardTable>
      ) : (
        <div className="space-y-2">
          {filteredData.map((item) => (
            <CompensatoryRequestCard
              key={item.name}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      )}

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
