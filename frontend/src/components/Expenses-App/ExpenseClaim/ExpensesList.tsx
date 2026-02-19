/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQueryClient } from "@tanstack/react-query";
import { FileText, MoreVertical, Users } from "lucide-react";
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
import CardTable from "../../shared/CardTable";
import DropdownMenu from "../../shared/DropDownMenu";
import Tooltip from "../../shared/Tooltip";
import Button from "../../shared/atoms/Button";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ExpenseClaimDetailsModal from "./ExpenseClaimDetailsModal";
import ExpensePolicyDrawer from "./ExpensePolicyDrawer";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";

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
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_claimed_amount ?? 0);

  return (
    <div className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20  shadow-sm border-primary p-6 transition-shadow duration-200 flex flex-col gap-5">
      <div className="flex justify-between items-start mb-1">
        <div className="flex flex-col gap-2">
          <Typography variant="mobileCardLabel" className="block">
            Expense category
          </Typography>
          {item?.reference_document?.custom_expense_category && (
            <Typography variant="mobileCardValue">
              {item?.reference_document?.custom_expense_category}
            </Typography>
          )}
        </div>

        <StatusBadge status={item?.status} />
      </div>

      <div className="flex justify-between">
        <div className="flex flex-col gap-2">
          <Typography variant="mobileCardLabel" className="block">
            Claimed Date
          </Typography>
          <Typography variant="mobileCardValue">
            {formatToIndianDate(item?.reference_document?.creation)}
          </Typography>
        </div>

        <div className="flex flex-col gap-2 text-right">
          <Typography variant="mobileCardLabel" className="block">
            Claimed Amount
          </Typography>
          <Typography variant="mobileCardValue">{formattedAmount}</Typography>
        </div>
      </div>

      <div>
        <div className="h-[1px] w-full bg-gray-100 mb-4" />
        <Typography variant="mobileCardFooter">
          Last Updated on{" "}
          {formatToIndianDate(item?.reference_document?.modified)}
        </Typography>
      </div>
    </div>
  );
};

const ExpensesTableRow: React.FC<{ item: any; isPaidFilter?: boolean }> = ({
  item,
  isPaidFilter,
}) => {
  const { data: currentUser } = useCurrentUser();
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
    "Expense Claims"
  );

  const navigate = useNavigate();
  const expenseClaim = item?.reference_document;
  const expenseItem = expenseClaim?.expenses?.[0];

  const handleEditClick = () => {
    if (!expenseClaim?.name || !expenseItem?.name) return;

    const navigationState = buildExpenseNavigationState(
      expenseClaim,
      expenseItem
    );
    navigate("/webapp/expenses-app/add-expense", { state: navigationState });
  };

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{
        gridTemplateColumns: isPaidFilter
          ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
          : "1fr 1fr 1fr 1fr 1fr 1fr 1fr",
      }}
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
      {isPaidFilter && (
        <Typography variant="bodySmall" className="font-medium text-center">
          {formattedPaidAmount}
        </Typography>
      )}
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(
          item?.reference_document?.expenses[0]?.expense_date
        )}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item?.reference_document?.creation)}
      </Typography>
      <div className="flex items-center justify-center">
        <Tooltip
          content={
            item?.status === "Draft"
              ? `Allocated to : ${item?.allocated_to}`
              : ""
          }
        >
          <StatusBadge status={item?.status} />
        </Tooltip>
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
    []
  );
  const [selectedSendBackUser, setSelectedSendBackUser] = React.useState<
    string | null
  >(null);
  const [selectedCanEdit, setSelectedCanEdit] = React.useState<boolean>(false);

  const [isPolicyDrawerOpen, setIsPolicyDrawerOpen] = React.useState(false);

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployee();
  const navigate = useNavigate();

  const [currentFilters, setCurrentFilters] = React.useState<
    Record<string, any>
  >({
    status: "Draft",
  });

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
    canEdit: boolean
  ) => {
    setSelectedStages(stages);
    setTimeout(() => setSelectedId(id), 0);
    setSelectedSendBackUser(sendBackUser);
    setSelectedCanEdit(canEdit);
  };

  const closeModal = () => {
    setSelectedId(null);
    setSelectedStages([]);
    setSelectedSendBackUser(null);
    setSelectedCanEdit(false);
  };

  const RowWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];
    const sendBackUser = item?.send_back_user || null;
    const canEdit = item?.can_edit || false;
    const isPaidFilter = currentFilters.status === "Paid";

    return (
      <div
        onClick={() => id && openModal(id, stages, sendBackUser, canEdit)}
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

    return (
      <div
        onClick={() => id && openModal(id, stages, sendBackUser, canEdit)}
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

  const tableTitles = [
    "Expense Category",
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
              <div>
                <Typography variant="h4">My Expense Claims</Typography>
              </div>
            )}
            <div className="flex items-center space-x-3 pb-1">
              {isDesktop ? (
                <>
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
                  fieldname: "status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Pending", value: "Draft" },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                    { label: "Paid", value: "Paid" },
                  ],
                },
              ]}
              defaultFilters={{
                status: "Draft",
              }}
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

      {selectedId && (
        <ExpenseClaimDetailsModal
          id={selectedId}
          onClose={closeModal}
          getStatusBadgeClasses={getStatusBadgeClasses}
          selectedStages={selectedStages}
          selectedSendBackUser={selectedSendBackUser}
          canEdit={selectedCanEdit}
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
