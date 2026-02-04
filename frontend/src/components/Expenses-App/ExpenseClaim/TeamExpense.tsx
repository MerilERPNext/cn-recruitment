import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { FileText } from "lucide-react";

const TeamExpense = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const tableTitles = isBulkSelectEnabled
    ? [
      "Select",
      "Employee",
      "Expense Category",
      "Claimed Amount",
      "Due Date",
      "Status",
      "Actions",
    ]
    : [
      "Employee",
      "Expense Category",
      "Claimed Amount",
      "Due Date",
      "Status",
      "Actions",
    ];

  const { isDesktop } = useScreenSize();
  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status;

      if (status === "Draft") {
        return {
          title: "No Pending Requests",
          description: "You have no pending team expense claim requests to review."
        };
      } else if (status === "Approved") {
        return {
          title: "No Approved Claims",
          description: "There are no approved expense claims at this time."
        };
      } else if (status === "Rejected") {
        return {
          title: "No Rejected Claims",
          description: "There are no rejected expense claims."
        };
      } else {
        return {
          title: "No Expense Claims",
          description: "No expense claims match your current filters."
        };
      }
    };

    const message = getEmptyStateMessage();

    return (
      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-sm w-full mx-auto text-center p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-center">
              <div className="p-4 bg-blue-50 rounded-full">
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {message.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {message.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            {isDesktop ? (
              <Typography variant="h4">Team Expense Claims</Typography>
            ) : null}
            <Typography variant="bodySmall" color="body2">
              Track and manage team expense claim requests
            </Typography>
          </div>
        </div>
        <div className="px-4">
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Expense Claim"}
                refetch={refetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                showPagination={true}
                infiniteScroll={true}
                loadMorePagination={false}
                isSearch={true}
                isFilter={true}
                columnWidths={tableColumnWidths}
                onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: [
                      { label: "Pending", value: "Draft" },
                      { label: "Approved", value: "Approved" },
                      { label: "Rejected", value: "Rejected" },
                    ],
                  },
                ]}
                noRecordsScreen={noRecordsScreen}
                defaultFilters={{ status: "Draft" }}
                renderCardContent={(item) => (
                  <ExpenseApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    onClick={(request: any) => handleRequestClick(request)}
                    loadingAction={item?.loadingAction}
                    isBulkSelectEnabled={isBulkSelectEnabled}
                  />
                )}
              />
            ) : null}
          </CardTable>
        </div>
      </div>
      {requestId && (
        <TeamExpenseDetailView
          documentName={requestId}
          label="Expense Claim"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamExpense;
