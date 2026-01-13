/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseClaimDetailsModal from "./ExpenseClaimDetailsModal";
import Tooltip from "../../shared/Tooltip";
import DataListView from "../../DataListView";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { ApprovalStage } from "../../../types/expenseAdvance";
import { SquarePen, Users } from "lucide-react";
import useCurrentUser from "../../../hooks/useCurrentUser";
import Button from "../../shared/atoms/Button";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";
import { format } from "date-fns";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import ExpensePolicyDrawer from "./ExpensePolicyDrawer";
import { MoreVertical, FileText } from "lucide-react";
import DropdownMenu from "../../shared/DropDownMenu";
import { Typography } from "../../shared/atoms/Typography";

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800";
    case "Draft":
      return "bg-yellow-100 text-yellow-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const ExpensesItem: React.FC<{ item: any }> = ({ item }) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_claimed_amount ?? 0);

  const formattedDate = item?.reference_document?.creation
    ? format(new Date(item.reference_document.creation), "dd/MM/yyyy")
    : " - ";

  return (
    <div className="rounded-xl my-1 border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="card-title">Expense category</span>
          {item?.reference_document?.custom_expense_category && (
            <span className="card-subtitle">
              {item?.reference_document?.custom_expense_category}
            </span>
          )}
        </div>

        {item?.status && (
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${getStatusBadgeClasses(
              item?.status
            )}`}
          >
            {item?.status === "Draft" ? "Pending" : item?.status}
          </span>
        )}
      </div>

      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <span className="card-title">Claimed Date</span>
          <span className="card-subtitle">{formattedDate}</span>
        </div>

        <div className="flex flex-col gap-1 text-right">
          <span className="card-title">Claimed Amount</span>
          <span className="card-subtitle">{formattedAmount}</span>
        </div>
      </div>
    </div>
  );
};

const ExpensesTableRow: React.FC<{ item: any }> = ({ item }) => {
  const { data: currentUser } = useCurrentUser();
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_claimed_amount ?? 0);

  const formattedDate = item?.reference_document?.creation
    ? new Date(item?.reference_document?.creation).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";

  const formattedExpenseDate = item?.reference_document?.expenses[0]
    ?.expense_date
    ? new Date(
        item?.reference_document?.expenses[0]?.expense_date
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";

  const formattedSanctionedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_sanctioned_amount ?? 0);

  const { data: userUiPermission } = useGetUiPermission("Expenses");
  const canEditExpense = isActionEnabled(
    userUiPermission,
    "edit_expense",
    "Expense Claims"
  );

  const navigate = useNavigate();
  const expenseClaim = item?.reference_document;
  const expenseItem = expenseClaim?.expenses?.[0];
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click from opening modal
    if (!expenseClaim?.name || !expenseItem?.name) return;

    const navigationState = buildExpenseNavigationState(
      expenseClaim,
      expenseItem
    );
    navigate("/webapp/expenses-app/add-expense", { state: navigationState });
  };

  return (
    <div
      className="grid gap-4 px-6 py-5 hover:bg-primary/10 border-b border-gray-100 text-sm text-gray-700 items-center"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 0.5fr" }}
    >
      <span>{expenseClaim?.custom_expense_category || " - "}</span>
      <span>{formattedAmount}</span>
      <span>{formattedSanctionedAmount || " - "}</span>
      <span>{formattedExpenseDate}</span>
      <span>{formattedDate}</span>
      <div>
        <Tooltip
          content={
            item?.status === "Draft"
              ? item?.reference_document?.custom_assigned_user ||
                item?.allocated_to
              : ""
          }
        >
          <span
            className={`px-2 py-1 rounded-2xl text-xs font-medium text-center ${getStatusBadgeClasses(
              item?.status
            )}`}
          >
            {item?.status === "Draft" ? "Pending" : item?.status}
          </span>
        </Tooltip>
      </div>

      {currentUser?.name?.toLowerCase() ===
        item?.send_back_user?.toLowerCase() &&
        canEditExpense && (
          <button
            onClick={handleEditClick}
            className="text-gray-500 hover:text-blue-600"
          >
            <SquarePen size={18} />
          </button>
        )}
    </div>
  );
};

const ExpensesList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedStages, setSelectedStages] = React.useState<ApprovalStage[]>(
    []
  );
  const [selectedSendBackUser, setSelectedSendBackUser] = React.useState<
    string | null
  >(null);

  const [isPolicyDrawerOpen, setIsPolicyDrawerOpen] = React.useState(false);

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployee();
  const navigate = useNavigate();

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
    sendBackUser: string
  ) => {
    setSelectedStages(stages);
    setTimeout(() => setSelectedId(id), 0);
    setSelectedSendBackUser(sendBackUser);
  };

  const closeModal = () => {
    setSelectedId(null);
    setSelectedStages([]);
    setSelectedSendBackUser(null);
  };

  const RowWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];
    const sendBackUser = item?.send_back_user || null;

    return (
      <div
        onClick={() => id && openModal(id, stages, sendBackUser)}
        className="cursor-pointer"
      >
        <ExpensesTableRow item={item} />
      </div>
    );
  };

  const ItemWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];
    const sendBackUser = item?.send_back_user || null;

    return (
      <div
        onClick={() => id && openModal(id, stages, sendBackUser)}
        className="cursor-pointer"
      >
        <ExpensesItem item={item} />
      </div>
    );
  };

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2 flex justify-between">
        <div>
          <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
        <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
      </div>
    </div>
  );

  const mobileMenuItems = [
    {
      label: "Policy",
      icon: <FileText size={16} />,
      onClick: () => setIsPolicyDrawerOpen(true),
    },
    {
      label: "Shared",
      icon: <Users size={16} />,
      onClick: () => navigate("/webapp/expenses-app/shared-expenses"),
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="px-4">
        <div className="flex justify-between items-center pt-4 mb-2 border-b border-gray-200 px-2">
          <div className="flex flex-col mb-2">
            <Typography variant="h4">My Expense Claims</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your expense claim requests
            </Typography>
          </div>

          <div className="flex items-center space-x-3 pb-1">
            {isDesktop ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  className="rounded-xl hover:bg-blue-100 py-1"
                  onClick={() => setIsPolicyDrawerOpen(true)}
                >
                  Policy
                </Button>

                <Button
                  onClick={() =>
                    navigate("/webapp/expenses-app/shared-expenses")
                  }
                  icon={<Users size={16} />}
                  size="md"
                  variant="outline"
                  className="hover:bg-blue-100 rounded-xl py-1"
                >
                  Shared
                </Button>
              </>
            ) : (
              <DropdownMenu items={mobileMenuItems} placement="bottom-right">
                <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100">
                  <MoreVertical size={18} />
                </button>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="h-full px-0  pt-0">
          {currentEmployee?.name && (
            <CardTable
              titles={[
                "Expense Category",
                "Claimed Amount",
                "Sanctioned Amount",
                "Expense Date",
                "Claimed Date",
                "Status",
                "Actions",
              ]}
              columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "0.5fr"]}
            >
              <DataListView
                queryKey={["expense-claims-all"]}
                customAPI={{
                  method:
                    "cn_leave_shift_managment.api.get_open_approval_todos",
                  params: {
                    doctype: "Expense Claim",
                    employee: currentEmployee?.name,
                    status: "Draft",
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
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: ["Draft", "Approved", "Rejected"],
                  },
                ]}
                SkeletonComponent={CardSkeleton}
                onRefetchComplete={() => setRefetchAttendance(false)}
                refetchTrigger={refetchAttendance}
                showRefreshButton={false}
                orderBy="modified desc"
                pageSize={10}
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
              />
            </CardTable>
          )}
        </div>
      </div>

      {selectedId && (
        <ExpenseClaimDetailsModal
          id={selectedId}
          onClose={closeModal}
          getStatusBadgeClasses={getStatusBadgeClasses}
          selectedStages={selectedStages}
          selectedSendBackUser={selectedSendBackUser}
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
