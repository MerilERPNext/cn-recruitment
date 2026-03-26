import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";

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
  const referenceName = searchParams.get("reference_name");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({
          requestId: request.todo_id,
          reference_name: request?.reference_document?.name || "",
        });
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
      "ACTIONS",
    ]
    : [
      "Employee",
      "Expense Category",
      "Claimed Amount",
      "Due Date",
      "Status",
      "ACTIONS",
    ];

  const { isDesktop } = useScreenSize();
  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status;
      const messages: Record<string, { title: string; description: string }> = {
        Draft: {
          title: "No Pending Requests",
          description:
            "You have no pending team expense claim requests to review.",
        },
        Approved: {
          title: "No Approved Claims",
          description: "There are no approved expense claims at this time.",
        },
        Rejected: {
          title: "No Rejected Claims",
          description: "There are no rejected expense claims.",
        },
      };

      return (
        messages[status] || {
          title: "No Expense Claims",
          description: "No expense claims match your current filters.",
        }
      );
    };

    const message = getEmptyStateMessage();

    return (
      <NoDataFound title={message.title} subtitle={message.description} />
    );
  };
  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Expense Claims</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team expense claim requests{" "}
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          {currentUser?.name ? (
            <ApprovalList
              doctype={"Expense Claim"}
              refetch={refetchApprovalList}
              onApprovalRefetchComplete={handleApprovalRefetchComplete}
              pageSize={10}
              isSearch={true}
              isFilter={true}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
              columnWidths={tableColumnWidths}
              onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
              filterFields={[
                {
                  fieldname: "approval_status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Pending", key: "Draft", value: "Draft", customAPIParams: { todo_status: "Open" } },
                    {
                      label: "Approved",
                      key: "Approved",
                      value: ["in", ["Draft", "Approved", "Open", "Pending"]],
                      customAPIParams: { todo_status: "Closed" }
                    },
                    { label: "Rejected", key: "Rejected", value: "Rejected" },
                  ],
                },
              ]}
              noRecordsScreen={noRecordsScreen}
              defaultFilters={{ approval_status: "Draft" }}
              orderBy="posting_date desc"
              SkeletonComponent={CardSkeleton}
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
      {(requestId || referenceName) && (
        <TeamExpenseDetailView
          documentName={requestId || undefined}
          referenceName={referenceName || undefined}
          label="Expense Claim"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamExpense;
