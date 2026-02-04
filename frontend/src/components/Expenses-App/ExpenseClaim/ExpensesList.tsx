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
import { Users } from "lucide-react";
import useCurrentUser from "../../../hooks/useCurrentUser";
import Button from "../../shared/atoms/Button";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import ExpensePolicyDrawer from "./ExpensePolicyDrawer";
import { MoreVertical, FileText } from "lucide-react";
import DropdownMenu from "../../shared/DropDownMenu";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import StatusBadge from "../../shared/atoms/statusBadge";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";

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

  return (
    <div className="rounded-2xl  my-1 border-t-4 border-primary p-5  transition-shadow duration-200 flex flex-col gap-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <span className="card-subtitle-sm uppercase">Expense category</span>
          {item?.reference_document?.custom_expense_category && (
            <Typography
              variant="body"
              className="leading-[13px]  font-semibold"
            >
              {item?.reference_document?.custom_expense_category}
            </Typography>
          )}
        </div>

        {item?.status && (
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${getStatusBadgeClasses(
              item?.status,
            )}`}
          >
            {item?.status === "Draft" ? "Pending" : item?.status}
          </span>
        )}
      </div>

      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <span className="card-subtitle-sm uppercase">Claimed Date</span>
          <Typography variant="body" className="leading-[13px]  font-semibold">
            {formatToIndianDate(item?.reference_document?.creation)}
          </Typography>
        </div>

        <div className="flex flex-col gap-1 text-right">
          <span className="card-subtitle-sm uppercase">Claimed Amount</span>
          <Typography variant="body" className="leading-[13px] font-semibold">
            {formattedAmount}
          </Typography>
        </div>
      </div>

      <div>
        <div className="h-[1px] w-full bg-gray-100 mb-3" />
        <Typography className="text-gray-300 text-sm mb-3">
          Last Updated on{" "}
          {formatToIndianDate(item?.reference_document?.modified)}
        </Typography>
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

  const formattedSanctionedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_sanctioned_amount ?? 0);

  const { data: userUiPermission } = useGetUiPermission("Expenses");
  const canEditExpense = isActionEnabled(
    userUiPermission,
    "edit_expense",
    "Expense Claims",
  );

  const navigate = useNavigate();
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
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
    >
      <Typography
        variant="bodySmall"
        className="font-medium text-center truncate"
      >
        {expenseClaim?.custom_expense_category}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedAmount}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedSanctionedAmount}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(
          item?.reference_document?.expenses[0]?.expense_date,
        )}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item?.reference_document?.creation)}
      </Typography>
      <div className="flex items-center justify-center">
        <Tooltip
          content={
            item?.status === "Draft"
              ? `Allocated to : ${item?.reference_document?.custom_assigned_user}` ||
              `Allocated to : ${item?.allocated_to}`
              : ""
          }
        >
          {/* <span
            className={`px-2 py-1 rounded-2xl text-xs font-medium text-center ${getStatusBadgeClasses(
              item?.status,
            )}`}
          >
            {item?.status === "Draft" ? "Pending" : item?.status}
          </span> */}
          <StatusBadge status={item?.status} />
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <MyApprovalActionPill
          isPending={item?.status === "Draft"}
          canEdit={
            currentUser?.name?.toLowerCase() ===
            item?.send_back_user?.toLowerCase() && canEditExpense
          }
          onEdit={handleEditClick}
        />
      </div>
    </div>
  );
};

const ExpensesList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedStages, setSelectedStages] = React.useState<ApprovalStage[]>(
    [],
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
    sendBackUser: string,
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

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status;
      const messages: Record<string, { title: string; description: string }> = {
        Draft: {
          title: "No Pending Claims",
          description: "You have no pending expense claim requests."
        },
        Approved: {
          title: "All Claims Approved",
          description: "You have no approved expense claims to review."
        },
        Rejected: {
          title: "No Rejected Claims",
          description: "You have no rejected expense claims."
        }
      };

      return messages[status] || {
        title: "No Expense Claims",
        description: "No expense claims match your filters."
      };
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
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              {isDesktop ? (
                <Typography variant="h4">My Expense Claims</Typography>
              ) : null}
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
                <DropdownMenu items={mobileMenuItems} placement="bottom-left">
                  <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100">
                    <MoreVertical size={18} />
                  </button>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <div className="px-4">
          {currentEmployee?.name && (
            <CardTable
              titles={[
                "Expense Category",
                "Claimed Amount",
                "Sanctioned Amount",
                "Expense Date",
                "Claimed Date",
                "Status",
                "ACTIONS",
              ]}
              columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]}
            >
              <DataListView
                queryKey={["expense-claims-all"]}
                customAPI={{
                  method:
                    "cn_leave_shift_managment.api.get_open_approval_todos",
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
                defaultFilters={{
                  status: "Draft",
                }}
                SkeletonComponent={CardSkeleton}
                onRefetchComplete={() => setRefetchAttendance(false)}
                refetchTrigger={refetchAttendance}
                showRefreshButton={false}
                orderBy="modified desc"
                pageSize={10}
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
                noRecordsScreen={noRecordsScreen}
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
