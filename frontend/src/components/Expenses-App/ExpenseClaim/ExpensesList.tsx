/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Users } from "lucide-react";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { ApprovalStage } from "../../../types/expenseAdvance";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { isActionEnabled } from "../../../utils/uiPermission";
import DataListView from "../../DataListView";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import CardTable from "../../shared/CardTable";
import Button from "../../shared/atoms/Button";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ExpenseClaimDetailsModal from "./ExpenseClaimDetailsModal";
import ExpensePolicyDrawer from "./ExpensePolicyDrawer";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import { useSearchParams } from "react-router-dom";
import Tooltip from "../../shared/Tooltip";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800";
    case "Draft":
      return "bg-yellow-100 text-yellow-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    case "Paid":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const ExpensesItem: React.FC<{ item: any }> = ({ item }) => {
  const expense = item?.reference_document;
  const { data: currentUser } = useCurrentUser();
  const { data: userUiPermission } = useGetUiPermission("Expenses");
  const { setRefetchAttendance } = useGlobalStore();
  const navigate = useNavigate();
  const revokeEventMutation = useRevokeEvent();
  const loading = useLoadingOverlay();

  const handleRevokeClick = () => {
    if (item?.todo_id) {
      loading?.show("Revoking Expense Claim...");
      revokeEventMutation.mutate(
        {
          docname: item?.reference_name,
          doctype: item?.reference_type,
          todo: item?.todo_id,
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 2000);
            toast.success("Expense Claim Revoked Successfully!");
          },
          onError: (error) => {
            const formatedError = errorResponseFormater(error);
            toast.error(formatedError);
          },
          onSettled: () => {
            loading?.hide();
          },
        },
      );
    }
  };

  const canEditExpense = isActionEnabled(
    userUiPermission,
    "edit_expense",
    "Expense Claims",
  );

  const canEdit =
    currentUser?.name?.toLowerCase() === item?.send_back_user?.toLowerCase() &&
    canEditExpense &&
    item?.can_edit;

  const expenseClaim = item?.reference_document;
  const expenseItem = expenseClaim?.expenses?.[0];

  const handleEditClick = () => {
    if (!expenseClaim?.name || !expenseItem?.name) return;

    const navigationState = buildExpenseNavigationState(
      expenseClaim,
      expenseItem,
    );

    navigate("/webapp/expenses-app/add-expense", {
      state: navigationState,
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value ?? 0);

  const claimedAmount = formatCurrency(expense?.total_claimed_amount);
  const sanctionedAmount = formatCurrency(expense?.total_sanctioned_amount);

  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl"
    >
      <div className="p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Expense ID</Typography>
            <Typography variant="mobileCardValue">
              {expense?.name}
            </Typography>
          </div>

          <StatusBadge status={item?.status} />
        </div>

        {/* Categories / Types */}
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Expense Category</Typography>
            <Typography variant="mobileCardValue">
              {expense?.custom_expense_category_name}
            </Typography>
          </div>

          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Expense Type</Typography>
            <Typography variant="mobileCardValue">
              {expense?.expenses?.[0]?.custom_claim_type_name}
            </Typography>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Claimed Amount</Typography>
            <Typography variant="mobileCardValue">{claimedAmount}</Typography>
          </div>

          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Sanctioned Amount</Typography>
            <Typography variant="mobileCardValue">
              {sanctionedAmount}
            </Typography>
          </div>
        </div>

        {/* Dates */}
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Expense Date</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(expense?.expenses?.[0]?.expense_date)}
            </Typography>
          </div>

          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Claimed Date</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(expense?.creation)}
            </Typography>
          </div>
        </div>

        {/* Allocated To */}
        <MobileAllocatedTo
          users={item?.allocated_to}
          roles={item?.allocated_to_roles}
          role={item?.role}
          username={item?.username}
        />

        <MyApprovalActionPill
          variant="buttons"
          isPending={item?.status === "Draft"}
          canEdit={canEdit}
          onEdit={handleEditClick}
          canRevoke={!!item?.custom_allow_revoke}
          revokeLoading={revokeEventMutation.isPending}
          onRevoke={handleRevokeClick}
        />
      </div>
    </div>
  );
};

const ExpensesTableRow: React.FC<{ item: any; isPaidFilter?: boolean }> = ({
  item,
  isPaidFilter,
}) => {
  const { data: currentUser } = useCurrentUser();
  const { setRefetchAttendance } = useGlobalStore();
  const navigate = useNavigate();
  const revokeEventMutation = useRevokeEvent();
  const loading = useLoadingOverlay();

  const handleRevokeClick = () => {
    if (item?.todo_id) {
      loading?.show("Revoking Expense Claim...");
      revokeEventMutation.mutate(
        {
          docname: item?.reference_name,
          doctype: item?.reference_type,
          todo: item?.todo_id,
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 2000);
            toast.success("Expense Claim Revoked Successfully!");
          },
          onError: (error) => {
            const formatedError = errorResponseFormater(error);
            toast.error(formatedError);
          },
          onSettled: () => {
            loading?.hide();
          },
        },
      );
    }
  };

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_claimed_amount ?? 0);

  const formattedSanctionedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_sanctioned_amount ?? 0);

  const formattedPaidAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_amount_reimbursed ?? 0);

  const { data: userUiPermission } = useGetUiPermission("Expenses");
  const canEditExpense = isActionEnabled(
    userUiPermission,
    "edit_expense",
    "Expense Claims",
  );

  const expenseClaim = item?.reference_document;
  const expenseItem = expenseClaim?.expenses?.[0];

  const handleEditClick = () => {
    if (!expenseClaim?.name || !expenseItem?.name) return;

    const navigationState = buildExpenseNavigationState(
      expenseClaim,
      expenseItem,
    );
    navigate("/webapp/expenses-app/add-expense", { state: navigationState });
  };

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{
        gridTemplateColumns: isPaidFilter
          ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
          : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
      }}
    >
      <Typography
        variant="bodySmall"
        className="font-medium text-center truncate"
      >
        {expenseClaim?.name}
      </Typography>
      <Tooltip content={`${expenseClaim?.custom_expense_category_name ?? ""}`}>
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          {expenseClaim?.custom_expense_category_name}
        </Typography>
      </Tooltip>
      <Typography variant="bodySmall" className="font-medium text-center">
        {expenseClaim?.expenses[0]?.custom_claim_type_name}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedAmount}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {item?.status?.toLowerCase() === "approved" ? formattedSanctionedAmount : " -- "}
      </Typography>
      {isPaidFilter && (
        <Typography variant="bodySmall" className="font-medium text-center">
          {formattedPaidAmount}
        </Typography>
      )}
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(
          item?.reference_document?.expenses[0]?.expense_date,
        )}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item?.reference_document?.creation)}
      </Typography>
      <div className="flex items-center justify-center">
        <AllocatedToTooltip
          users={item?.allocated_to}
          roles={item?.allocated_roles}
          allocated_to_user={item?.username}
          role={item?.role}
          position="left"
        >
          <StatusBadge status={item?.reference_document?.approval_status} />
        </AllocatedToTooltip>
      </div>

      <div className="flex items-center justify-center">
        <MyApprovalActionPill
          isPending={item?.status === "Draft"}
          canEdit={
            currentUser?.name?.toLowerCase() ===
            item?.send_back_user?.toLowerCase() &&
            canEditExpense &&
            item?.can_edit
          }
          onEdit={handleEditClick}
          canRevoke={!!item?.custom_allow_revoke}
          revokeLoading={revokeEventMutation.isPending}
          onRevoke={handleRevokeClick}
        />
      </div>
    </div>
  );
};

const ExpensesList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRequestId = searchParams.get("requestId");
  const urlReferenceName = searchParams.get("reference_name");

  const { data: todoData } = useGetToDoWithReferenceDoc(
    urlRequestId || undefined,
    urlReferenceName || undefined
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedStages, setSelectedStages] = React.useState<ApprovalStage[]>(
    [],
  );
  const [selectedSendBackUser, setSelectedSendBackUser] = React.useState<
    string | null
  >(null);
  const [selectedCanEdit, setSelectedCanEdit] = React.useState<boolean>(false);
  const [selectedTodoStatus, setSelectedTodoStatus] = React.useState<string | null>(null);

  const [isPolicyDrawerOpen, setIsPolicyDrawerOpen] = React.useState(false);

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployee();
  const navigate = useNavigate();

  const [currentFilters, setCurrentFilters] = React.useState<
    Record<string, any>
  >({});

  React.useEffect(() => {
    if ((location.state as any)?.refresh) {
      queryClient.invalidateQueries({
        queryKey: ["expense-claims"],
      });
      queryClient.invalidateQueries({
        queryKey: ["expense-claims-all"],
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const openModal = (
    id: string,
    stages: ApprovalStage[],
    sendBackUser: string | null,
    canEdit: boolean,
    todoStatus: string | null,
  ) => {
    setSelectedStages(stages);
    setTimeout(() => {
      setSelectedId(id);
      setSearchParams({ reference_name: id });
    }, 0);
    setSelectedSendBackUser(sendBackUser);
    setSelectedCanEdit(canEdit);
    setSelectedTodoStatus(todoStatus);
  };

  const closeModal = () => {
    setSelectedId(null);
    setSelectedStages([]);
    setSelectedSendBackUser(null);
    setSelectedCanEdit(false);
    setSelectedTodoStatus(null);
    if (urlRequestId || urlReferenceName) {
      setSearchParams({});
    }
  };

  const documentIdToOpen =
    selectedId ||
    urlReferenceName ||
    todoData?.reference_name ||
    todoData?.reference_document?.name;

  const RowWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];
    const sendBackUser = item?.send_back_user || null;
    const canEdit = item?.can_edit || false;
    const todoStatus = item?.todo_status || item?.status || null;
    const isPaidFilter = currentFilters.status === "Paid";

    return (
      <div
        onClick={() => id && openModal(id, stages, sendBackUser, canEdit, todoStatus)}
        className="cursor-pointer"
      >
        <ExpensesTableRow item={item} isPaidFilter={isPaidFilter} />
      </div>
    );
  };

  const ItemWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];
    const sendBackUser = item?.send_back_user || null;
    const canEdit = item?.can_edit || false;
    const todoStatus = item?.todo_status || item?.status || null;

    return (
      <div
        onClick={() => id && openModal(id, stages, sendBackUser, canEdit, todoStatus)}
        className="cursor-pointer"
      >
        <ExpensesItem item={item} />
      </div>
    );
  };

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status;
      const messages: Record<string, { title: string; description: string }> = {
        Draft: {
          title: "No Pending Claims",
          description: "You have no pending expense claim requests.",
        },
        Approved: {
          title: "All Claims Approved",
          description: "You have no approved expense claims to review.",
        },
        Rejected: {
          title: "No Rejected Claims",
          description: "You have no rejected expense claims.",
        },
        Paid: {
          title: "No Paid Claims",
          description: "You have no paid expense claims.",
        },
      };

      return (
        messages[status] || {
          title: "No Expense Claims",
          description: "No expense claims match your filters.",
        }
      );
    };

    const message = getEmptyStateMessage();

    return (
      <NoDataFound title={message.title} subtitle={message.description} />
    );
  };

  const tableTitles = [
    "Expense ID",
    "Expense Category",
    "Expense Type",
    "Claimed Amount",
    "Sanctioned Amount",
    ...(currentFilters.status === "Paid" ? ["Paid Amount"] : []),
    "Expense Date",
    "Claimed Date",
    "Status",
    "ACTIONS",
  ];

  const tableColumnWidths = [
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    ...(currentFilters.status === "Paid" ? ["1fr"] : []),
    "1fr",
    "1fr",
    "1fr",
    "1fr",
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">My Expense Claims</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your expense claim requests
                </Typography>
              </div>
            ) : (
              <span></span>
            )}
            <div className="flex items-center space-x-3 pb-1">
              <Button
                icon={<FileText size={16} />}
                variant="outline"
                size="md"
                className="rounded-xl hover:bg-blue-100 py-1"
                onClick={() => setIsPolicyDrawerOpen(true)}
              >
                Policy
              </Button>

              <Button
                onClick={() => navigate("/webapp/expenses-app/shared-expenses")}
                icon={<Users size={16} />}
                size="md"
                variant="outline"
                className="hover:bg-blue-100 rounded-xl py-1"
              >
                Shared
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {currentEmployee?.name && (
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            <DataListView
              queryKey={["expense-claims-all"]}
              customAPI={{
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Expense Claim",
                  employee: currentEmployee?.name,
                },
              }}
              ItemComponent={(props: { item: any }) =>
                isDesktop ? (
                  <RowWrapper item={props.item} />
                ) : (
                  <ItemWrapper item={props.item} />
                )
              }
              isSearch={true}
              isFilter={true}
              filterFields={[
                {
                  fieldname: "approval_status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Pending", key: "Draft", value: "Draft", customAPIParams: { todo_status: "Open" } },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },


                  ],
                },
              ]}
              defaultFilters={{ approval_status: ["===", "Draft"] }}
              onFiltersChange={setCurrentFilters}
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={() => setRefetchAttendance(false)}
              refetchTrigger={refetchAttendance}
              showRefreshButton={false}
              orderBy="posting_date desc"
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
              noRecordsScreen={noRecordsScreen}
            />
          </CardTable>
        )}
      </div>

      {documentIdToOpen && (
        <ExpenseClaimDetailsModal
          id={documentIdToOpen}
          onClose={closeModal}
          getStatusBadgeClasses={getStatusBadgeClasses}
          selectedStages={selectedStages}
          selectedSendBackUser={selectedSendBackUser}
          canEdit={selectedCanEdit}
          todoStatus={selectedTodoStatus || todoData?.todo_status || todoData?.status}
        />
      )}
      <ExpensePolicyDrawer
        isOpen={isPolicyDrawerOpen}
        onClose={() => setIsPolicyDrawerOpen(false)}
      />
    </div>
  );
};

export default ExpensesList;
