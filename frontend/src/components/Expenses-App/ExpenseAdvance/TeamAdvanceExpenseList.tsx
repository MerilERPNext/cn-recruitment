import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import CustomDropdown from "../../shared/CustomDropdown";
import TeamAdvanceDetailView from "./TeamAdvanceDetailView";
import AdvanceApprovalCard from "./AdvanceApprovalCard";

interface Option {
  value: string;
  label: string;
}

const TeamAdvanceExpenseList = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const options: Option[] = [
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value);
      setRefetchApprovalList(true);
    },
    []
  );

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
      }
    },
    [setSearchParams]
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-0 md:p-6">
          <div className="flex justify-between items-center mb-2 border-b border-gray-200">
            <h2 className="base-title md:module-title pb-1">
              Team Advance Requests
            </h2>

            <div className="flex items-center gap-3 pb-1">
              <CustomDropdown
                options={options}
                value={statusFilter}
                onChange={handleStatusFilterChange}
              />
            </div>
          </div>

          <CardTable
            titles={[
              ...(statusFilter === "Pending" ? ["Select"] : []),
              "Employee",
              "Department",
              "Advance Amount",
              "Due Date",
              "Status",
              "Actions",
            ]}
            columnWidths={[
              statusFilter === "Pending"
                ? "0.5fr 1.25fr 1.25fr 1.25fr 1.25fr 1.25fr 2fr"
                : "1.25fr 1.25fr 1.25fr 1.25fr 1.25fr 2fr",
            ]}
          >
            {currentUser?.name && (
              <ApprovalList
                doctype={"Employee Advance"}
                status={statusFilter}
                refetch={refetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
                renderCardContent={(item) => (
                  <AdvanceApprovalCard
                    data={item?.data}
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    loadingAction={item?.loadingAction}
                    showCheckbox={statusFilter === "Pending"}
                    onClick={(request: any) => handleRequestClick(request)}
                    onAction={item?.onAction}
                  />
                )}
              />
            )}
          </CardTable>
        </div>
      </div>

      {requestId && (
        <TeamAdvanceDetailView
          documentName={requestId}
          label="Employee Advance"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </>
  );
};

export default TeamAdvanceExpenseList;
