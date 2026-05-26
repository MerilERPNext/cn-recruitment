/* eslint-disable @typescript-eslint/no-explicit-any */
import { Download } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import * as XLSX from "xlsx";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useGetAllExpenseCategories, useGetAllowRequestsToBePutOnHold } from "../../../hooks/useExpense";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { getCOLUMN_SORT_CONFIG_TEAM_EXPENSE_CLAIM } from "../../../utils/tableSortConfig";
import { isActionEnabled } from "../../../utils/uiPermission";
import ApprovalList from "../../shared/ApprovalList";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { Typography } from "../../shared/atoms/Typography";
import { BulkSelectProvider } from "../../shared/BulkSelectContext";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import Tooltip from "../../shared/Tooltip";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";

const TeamExpense = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: expenseCategories } = useGetAllExpenseCategories();
  const { data: allowHoldData } = useGetAllowRequestsToBePutOnHold();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const navigate = useNavigate();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const [currentListData, setCurrentListData] = useState<any[]>([]);

  const uiPermission = {
    app: "Expenses",
    page: "Team Requests",
    actionKey: "actions_enabled",
  };
  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const actionsEnabled = isActionEnabled(
    uiPermissionData,
    uiPermission?.actionKey ?? "",
    uiPermission?.page,
  );

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

  const handleExport = () => {
    const exportData = (currentListData || []).map((item: any) => {
      const doc = item?.reference_document;
      // Sync Status Condition
      const rawStatus =
        item?.todo_status === "Closed" && doc?.approval_status !== "Rejected"
          ? "Approved"
          : doc?.approval_status;

      const getExportStatus = (s: string) => {
        const status = s?.toLowerCase().trim();
        if (["open", "pending", "draft"].includes(status)) return "Pending";
        if (["approved", "submitted"].includes(status)) return "Approved";
        return s || "--";
      };

      const status = getExportStatus(rawStatus);

      // Sync Sanctioned Amount Condition
      const sanctioned =
        item?.todo_status === "Closed" && doc?.approval_status !== "Rejected"
          ? doc?.total_sanctioned_amount
          : "--";

      const row: any = {
        "Expense Id": doc?.name || "--",
        Employee: doc?.employee_name || "--",
        "Expense Category": doc?.custom_expense_category_name || "--",
        "Expense Type": doc?.expenses?.[0]?.custom_claim_type_name || "--",
        "Expense Date":
          formatToIndianDate(doc?.expenses?.[0]?.expense_date) || "--",
        "Claimed Amount": doc?.total_claimed_amount || 0,
        "Sanctioned Amount": sanctioned,
        "Claimed Date": formatToIndianDate(doc?.creation) || "--",
        "Due Date": formatToIndianDate(item?.due_date) || "--",
        Status: status,
      };

      if (activeStatus === "Approved") {
        row["Paid Status"] = item?.status === "Paid" ? "Paid" : "Unpaid";
      }

      return row;
    });

    if (exportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Team Expenses");
    XLSX.writeFile(workbook, `Team_Expenses_${new Date().getTime()}.xlsx`);
    toast.success("Exporting data...");
  };

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
    ? activeStatus === "Approved"
      ? [
          "0.5fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
        ]
      : [
          "0.5fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
        ]
    : activeStatus === "Approved"
      ? [
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
        ]
      : [
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
          "1fr",
        ];

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status || filters.approval_status;
      const messages: Record<string, { title: string; description: string }> = {
        Pending: {
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
        "On Hold": {
          title: "No On Hold Claims",
          description: "There are no expense claims on hold.",
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

    return <NoDataFound title={message.title} subtitle={message.description} />;
  };
  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4 flex items-center justify-between">
            <div>
              <Typography variant="h4">Team Expense Claims</Typography>
              <Typography variant="bodySmall" color="body2">
                Track and manage team expense claim requests{" "}
              </Typography>
            </div>
            <Tooltip content="Export to Excel">
              <button
                onClick={handleExport}
                className="flex items-center justify-center p-2.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-200 border border-primary/20 shadow-sm"
              >
                <Download size={20} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <BulkSelectProvider>
          <CardTable
            titles={tableTitles}
            columnWidths={tableColumnWidths}
            columnSortConfig={getCOLUMN_SORT_CONFIG_TEAM_EXPENSE_CLAIM(
              isBulkSelectEnabled,
              activeStatus === "Approved",
            )}
          >
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
                      { label: "Pending", value: "Pending" },
                      {
                        label: "Approved",
                        key: "Approved",
                        value: ["in", ["Draft", "Approved", "Open", "Pending"]],
                        customAPIParams: { todo_status: "Closed" },
                      },
                      { label: "Rejected", value: "Rejected" },
                      { label: "On Hold", value: "On Hold" },
                    ],
                    emptyValueConfig: {
                      filterValue: ["!=", "Cancelled"],
                    },
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
                defaultFilters={{ approval_status: "Pending" }}
                SkeletonComponent={CardSkeleton}
                bulkSelectVisible={actionsEnabled}
                onActiveFiltersChange={(filters) => {
                  setActiveStatus(filters?.approval_status || "Pending");
                }}
                renderCardContent={(item) => {
                  if (
                    item?.data?.custom_selected_doctype_action === "Send Back"
                  ) {
                    return null;
                  }
                  return (
                    <ExpenseApprovalCard
                      actionsEnabled={actionsEnabled}
                      isSelected={item?.isSelected}
                      onToggleSelect={item?.onToggleSelect}
                      data={item?.data}
                      onAction={item?.onAction}
                      onClick={(request: any) => handleRequestClick(request)}
                      loadingAction={item?.loadingAction}
                      isBulkSelectEnabled={isBulkSelectEnabled}
                      activeStatus={activeStatus}
                      isActed={item?.isActed}
                      allowHoldData={allowHoldData}
                      onRefetch={() => setRefetchApprovalList(true)}
                    />
                  );
                }}
                onDataLoad={setCurrentListData}
              />
            ) : null}
          </CardTable>
        </BulkSelectProvider>
      </div>
      {(requestId || referenceName) && (
        <TeamExpenseDetailView
          actionsEnabled={actionsEnabled}
          documentName={requestId || undefined}
          referenceName={referenceName || undefined}
          label="Expense Claim"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
          allowHoldData={allowHoldData}
        />
      )}
    </div>
  );
};

export default TeamExpense;
