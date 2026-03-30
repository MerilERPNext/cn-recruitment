import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetAllExpenseCategories } from "../../../hooks/useExpense";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";

const TeamExpense = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: expenseCategories } = useGetAllExpenseCategories();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [activeStatus, setActiveStatus] = useState("Draft");
  const navigate = useNavigate();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const expenseCategoryOptions = useMemo(() => {
    if (!expenseCategories || !Array.isArray(expenseCategories)) {
      return [];
    }
    return expenseCategories.map((cat: any) => ({
      label: cat.category_name || cat.name,
      value: cat.category_name || cat.name,
    }));
  }, [expenseCategories]);

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
      "Expense Id",
      "Employee",
      "Expense Category",
      "Expense Type",
      "Expense Date",
      "Claimed Amount",
      "Claimed Date",
      "Due Date",
      "Status",
      ...(activeStatus === "Approved" ? ["Paid Status"] : []),
      "Actions",
    ]
    : [
      "Expense Id",
      "Employee",
      "Expense Category",
      "Expense Type",
      "Expense Date",
      "Claimed Amount",
      "Claimed Date",
      "Due Date",
      "Status",
      ...(activeStatus === "Approved" ? ["Paid Status"] : []),
      "Actions",
    ];

  const { isDesktop } = useScreenSize();
  const tableColumnWidths = isBulkSelectEnabled
    ? (activeStatus === "Approved"
      ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
      : ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"])
    : (activeStatus === "Approved"
      ? ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
      : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]);

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
                {
                  fieldname: "custom_expense_category_name",
                  label: "Expense Category",
                  fieldtype: "Select",
                  options: expenseCategoryOptions,
                },
                {
                  fieldname: "creation_start",
                  label: "Start Date",
                  fieldtype: "Date",
                },
                {
                  fieldname: "creation_end",
                  label: "End Date",
                  fieldtype: "Date",
                },
              ]}
              noRecordsScreen={noRecordsScreen}
              defaultFilters={{ approval_status: "Draft" }}
              orderBy="posting_date desc"
              SkeletonComponent={CardSkeleton}
              onActiveFiltersChange={(filters) => {
                setActiveStatus(filters?.approval_status || "Draft");
              }}
              renderCardContent={(item) => {
                if (item?.data?.custom_selected_doctype_action === "Send Back") {
                  return null;
                }
                return <ExpenseApprovalCard
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={(request: any) => handleRequestClick(request)}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                  activeStatus={activeStatus}
                />
              }}
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
