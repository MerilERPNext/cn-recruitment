/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Trash2 } from "lucide-react";
import React, { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import {
  useDeleteDraftExpenseClaim,
  useDeleteExpenseClaim,
  useGetAllExpenseCategories,
  useGetDraftExpenseClaims,
  usePostExpenseClaim,
  useUpdateExpenseApprovalStatus,
  useUpdateFileAttachment,
} from "../../../hooks/useExpense";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { expenseService } from "../../../services/expenseService";
import { ApprovalStage } from "../../../types/expenseAdvance";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import {
  COLUMN_SORT_CONFIG_EXPENSE_CLAIM,
  COLUMN_SORT_CONFIG_EXPENSE_CLAIM_DRAFT,
  COLUMN_SORT_CONFIG_SHARED_EXPENSE,
} from "../../../utils/tableSortConfig";
import { isActionEnabled } from "../../../utils/uiPermission";
import DataListView from "../../DataListView";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import CardTable from "../../shared/CardTable";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import Modal from "../../shared/Modal";
import Tooltip from "../../shared/Tooltip";
import Button from "../../shared/atoms/Button";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ExpenseClaimDetailsModal from "./ExpenseClaimDetailsModal";
import ExpensePolicyDrawer from "./ExpensePolicyDrawer";
import { SharedExpenseCard, SharedExpensesRow } from "./SharedExpenses";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800";
    case "Draft":
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    case "Paid":
      return "bg-emerald-100 text-emerald-800";
    case "Revoked":
      return "bg-slate-100 text-slate-500";
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
  const [isActed, setIsActed] = useState(false);

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
            setIsActed(true);
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
      canEdit,
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
            <Typography variant="mobileCardValue">{expense?.name}</Typography>
          </div>

          <StatusBadge
            status={
              item?.custom_allow_revoke === 1 &&
                item?.todo_status?.toLowerCase() === "cancelled" &&
                item?.reference_document?.docstatus === 2
                ? "Revoked"
                : item?.reference_document?.approval_status
            }
          />
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
              {item?.todo_status?.toLowerCase() === "closed" &&
                item?.reference_document?.approval_status !== "Rejected"
                ? sanctionedAmount
                : " - "}
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
          roles={item?.allocated_roles}
          role={item?.role}
          username={item?.username}
          RoleAssignedUsers={item?.role_assigned_users}
        />

        <div className={isActed ? "pointer-events-none opacity-50" : ""}>
          <MyApprovalActionPill
            variant="buttons"
            isPending={item?.status === "Pending"}
            canEdit={canEdit && !isActed}
            onEdit={handleEditClick}
            canRevoke={
              item?.custom_allow_revoke === 1 &&
              !(
                item?.todo_status?.toLowerCase() === "cancelled" &&
                item?.reference_document?.docstatus === 2
              ) &&
              !isActed
            }
            revokeLoading={revokeEventMutation.isPending}
            onRevoke={handleRevokeClick}
          />
        </div>
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
  const [isActed, setIsActed] = useState(false);

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
            setIsActed(true);
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
      canEdit,
    );
    navigate("/webapp/expenses-app/add-expense", { state: navigationState });
  };

  return (
    <div
      className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{
        gridTemplateColumns: isPaidFilter
          ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
          : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
      }}
    >
      <Tooltip
        content={expenseClaim?.name || ""}
        triggerClassName="w-full truncate min-w-0 block"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate block w-full"
        >
          {expenseClaim?.name}
        </Typography>
      </Tooltip>
      <Tooltip
        content={`${expenseClaim?.custom_expense_category_name ?? ""}`}
        triggerClassName="w-full truncate min-w-0 block"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate block w-full"
        >
          {expenseClaim?.custom_expense_category_name}
        </Typography>
      </Tooltip>
      <Tooltip
        content={expenseClaim?.expenses[0]?.custom_claim_type_name || ""}
        triggerClassName="w-full truncate min-w-0 block"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate block w-full"
        >
          {expenseClaim?.expenses[0]?.custom_claim_type_name}
        </Typography>
      </Tooltip>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedAmount}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {item?.todo_status?.toLowerCase() === "closed" &&
          item?.reference_document?.approval_status !== "Rejected"
          ? formattedSanctionedAmount
          : " -- "}
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
          RoleAssignedUsers={item?.role_assigned_users}
          roles={item?.allocated_roles}
          allocated_to_user={item?.username}
          role={item?.role}
          position="left"
        >
          <StatusBadge
            status={
              item?.custom_allow_revoke === 1 &&
                item?.todo_status?.toLowerCase() === "cancelled" &&
                item?.reference_document?.docstatus === 2
                ? "Revoked"
                : item?.reference_document?.approval_status
            }
          />
        </AllocatedToTooltip>
      </div>

      <div
        className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}
      >
        <MyApprovalActionPill
          isPending={item?.status === "Pending"}
          canEdit={
            currentUser?.name?.toLowerCase() ===
            item?.send_back_user?.toLowerCase() &&
            canEditExpense &&
            item?.can_edit &&
            !isActed
          }
          onEdit={handleEditClick}
          canRevoke={
            item?.custom_allow_revoke === 1 &&
            !(
              item?.todo_status?.toLowerCase() === "cancelled" &&
              item?.reference_document?.docstatus === 2
            ) &&
            // item?.todo_status?.toLowerCase() === "open" &&
            !isActed
          }
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

  const { data: expenseCategories } = useGetAllExpenseCategories();

  const [activeTab, setActiveTab] = React.useState<"expenses" | "shared">(
    () => {
      const stored = localStorage.getItem("expenseActiveTab");
      if (stored === "expenses" || stored === "shared") return stored;
      return "expenses";
    },
  );
  const [selectedDraftIds, setSelectedDraftIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedMyExpensesDraftIds, setSelectedMyExpensesDraftIds] =
    React.useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedStages, setSelectedStages] = React.useState<ApprovalStage[]>(
    [],
  );
  const [selectedSendBackUser, setSelectedSendBackUser] = React.useState<
    string | null
  >(null);
  const [selectedCanEdit, setSelectedCanEdit] = React.useState<boolean>(false);
  const [selectedTodoStatus, setSelectedTodoStatus] = React.useState<
    string | null
  >(null);
  const [selectedStatus, setSelectedStatus] = React.useState<
    string | undefined
  >(undefined);
  const [selectedIsDraft, setSelectedIsDraft] = React.useState(false);

  const [isPolicyDrawerOpen, setIsPolicyDrawerOpen] = React.useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = React.useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => { } });

  const [submitConfirmModal, setSubmitConfirmModal] = React.useState<{
    isOpen: boolean;
    count: number;
  }>({ isOpen: false, count: 0 });

  const [currentListData, setCurrentListData] = React.useState<any[]>([]);

  const [isAcknowledgementChecked, setIsAcknowledgementChecked] =
    React.useState(false);
  const [
    isRelocationAcknowledgementChecked,
    setIsRelocationAcknowledgementChecked,
  ] = React.useState(false);

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const navigate = useNavigate();
  const { data: draftExpenses } = useGetDraftExpenseClaims(
    currentEmployee?.name,
    {
      enabled: Boolean(currentEmployee?.name),
    },
  );

  const sortedDraftExpenses = React.useMemo(() => {
    if (!draftExpenses) return [];
    return [...draftExpenses].sort((a: any, b: any) => {
      return new Date(b.creation).getTime() - new Date(a.creation).getTime();
    });
  }, [draftExpenses]);
  const deleteDraftMutation = useDeleteDraftExpenseClaim();
  const { mutateAsync: submitExpenses, isPending: isSubmitting } =
    usePostExpenseClaim();
  const updateFileMutation = useUpdateFileAttachment();
  const updateApprovalStatusMutation = useUpdateExpenseApprovalStatus();
  const deleteExpenseClaimMutation = useDeleteExpenseClaim();

  const [currentFilters, setCurrentFilters] = React.useState<
    Record<string, any>
  >({});

  // Stable callbacks to avoid infinite re-render loops in DataListView useEffects
  const handleFiltersChange = useCallback((filters: Record<string, any>) => {
    setCurrentFilters(filters);
    setSelectedMyExpensesDraftIds(new Set());
  }, []);

  const handleDataLoad = useCallback((data: any[]) => {
    setCurrentListData(data);
  }, []);

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  const matchedOpenItem = React.useMemo(() => {
    const openId = selectedId || urlReferenceName;
    if (!openId) return null;

    return (
      currentListData.find(
        (item: any) => item?.reference_document?.name === openId,
      ) || null
    );
  }, [currentListData, selectedId, urlReferenceName]);

  const shouldUseDraftReferenceApi =
    selectedIsDraft ||
    selectedStatus === "Draft" ||
    matchedOpenItem?.reference_document?.approval_status === "Draft";

  const { data: todoData } = useGetToDoWithReferenceDoc(
    shouldUseDraftReferenceApi ? (urlRequestId || undefined) : undefined,
    shouldUseDraftReferenceApi ? (urlReferenceName || undefined) : undefined,
    shouldUseDraftReferenceApi ? "Expense Claim" : undefined,
  );

  const expenseCategoryOptions = React.useMemo(() => {
    if (!expenseCategories || !Array.isArray(expenseCategories)) {
      return [];
    }
    return expenseCategories.map((cat: any) => ({
      label: cat.category_name || cat.name,
      value: cat.category_name || cat.name,
    }));
  }, [expenseCategories]);

  // Compute the default filter for DataListView based on navigation state
  const computedDefaultFilters = React.useMemo(() => {
    const navFilter = (location.state as any)?.initialFilter;
    if (navFilter === "Pending" || navFilter === "Draft") {
      return { approval_status: navFilter };
    }
    return { approval_status: "Draft" };
    // location.key is the dependency so this recomputes on each new navigation
  }, [location.key]);

  React.useEffect(() => {
    if ((location.state as any)?.refresh) {
      queryClient.invalidateQueries({
        queryKey: ["expense-claims"],
      });
      queryClient.invalidateQueries({
        queryKey: ["expense-claims-all"],
      });
    }
    // Clear navigation state after consuming it to prevent stale filter on refresh
    if (
      (location.state as any)?.refresh ||
      (location.state as any)?.initialFilter
    ) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  React.useEffect(() => {
    localStorage.setItem("expenseActiveTab", activeTab);
  }, [activeTab]);

  const openModal = (
    id: string,
    stages: ApprovalStage[],
    sendBackUser: string | null,
    canEdit: boolean,
    todoStatus: string | null,
    status?: string,
    isDraft: boolean = false,
  ) => {
    setSelectedStages(stages);
    setTimeout(() => {
      setSelectedId(id);
      setSearchParams({ reference_name: id });
    }, 0);
    setSelectedSendBackUser(sendBackUser);
    setSelectedCanEdit(canEdit);
    setSelectedTodoStatus(todoStatus);
    setSelectedStatus(status);
    setSelectedIsDraft(isDraft);
  };

  const closeModal = () => {
    setSelectedId(null);
    setSelectedStages([]);
    setSelectedSendBackUser(null);
    setSelectedCanEdit(false);
    setSelectedTodoStatus(null);
    setSelectedStatus(undefined);
    setSelectedIsDraft(false);
    if (urlRequestId || urlReferenceName) {
      setSearchParams({});
    }
  };

  const documentIdToOpen =
    selectedId ||
    urlReferenceName ||
    todoData?.reference_name ||
    todoData?.reference_document?.name;

  const handleExport = () => {
    let exportData: any[] = [];
    let fileName = "Expense_Claims";

    if (activeTab === "expenses") {
      fileName = "My_Expense_Claims";
      const isPaidFilter = currentFilters.status === "Paid";
      exportData = (currentListData || []).map((item: any) => {
        const doc = item?.reference_document;
        const rawStatus =
          item?.custom_allow_revoke === 1 &&
            item?.todo_status?.toLowerCase() === "cancelled" &&
            doc?.docstatus === 2
            ? "Revoked"
            : doc?.approval_status;

        const getExportStatus = (s: string) => {
          const st = s?.toLowerCase().trim();
          if (["open", "pending", "draft"].includes(st)) return "Pending";
          if (["approved", "submitted"].includes(st)) return "Approved";
          return s || "--";
        };

        const status = getExportStatus(rawStatus);

        const sanctioned =
          item?.todo_status?.toLowerCase() === "closed" &&
            doc?.approval_status !== "Rejected"
            ? doc?.total_sanctioned_amount
            : "--";

        const row: any = {
          "Expense ID": doc?.name,
          "Expense Category": doc?.custom_expense_category_name,
          "Expense Type": doc?.expenses?.[0]?.custom_claim_type_name,
          "Claimed Amount": doc?.total_claimed_amount,
          "Sanctioned Amount": sanctioned,
          "Expense Date": formatToIndianDate(doc?.expenses?.[0]?.expense_date),
          "Claimed Date": formatToIndianDate(doc?.creation),
          Status: status,
        };

        if (isPaidFilter) {
          row["Paid Amount"] = doc?.total_amount_reimbursed || 0;
        }

        return row;
      });
    } else if (activeTab === "shared") {
      fileName = "Shared_Expense_Claims";
      exportData = (currentListData || []).map((item: any) => {
        const rowData = item?.message?.data ? item.message.data : item;
        const doc = Array.isArray(rowData) ? rowData[0] : rowData;
        return {
          "Employee Id": doc?.employee,
          "Shared By": doc?.employee_name,
          "Posting Date": formatToIndianDate(doc?.posting_date),
          "Claimed Date": formatToIndianDate(doc?.creation) || "--",
          Status: (function (s: string) {
            const st = s?.toLowerCase().trim();
            if (["open", "pending", "draft"].includes(st)) return "Pending";
            if (["approved", "submitted"].includes(st)) return "Approved";
            return s || "--";
          })(doc?.approval_status),
          "Sanctioned Amount": doc?.total_sanctioned_amount || 0,
          "% Share": doc?.participant_info?.percentage || 0,
          "Allocated Amount": doc?.participant_info?.allocated_amount || 0,
        };
      });
    }

    if (exportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
    toast.success("Exporting data...");
  };

  const RowWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];
    const sendBackUser = item?.send_back_user || null;
    const canEdit = item?.can_edit || false;
    const todoStatus = item?.todo_status || item?.status || null;
    const isPaidFilter = currentFilters.status === "Paid";
    const status =
      item?.custom_allow_revoke === 1 &&
        item?.todo_status?.toLowerCase() === "cancelled" &&
        item?.reference_document?.docstatus === 2
        ? "Revoked"
        : item?.reference_document?.approval_status;
    const isDraft = status === "Draft";

    return (
      <div
        onClick={() =>
          id &&
          openModal(id, stages, sendBackUser, canEdit, todoStatus, status, isDraft)
        }
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

    const status =
      item?.custom_allow_revoke === 1 &&
        item?.todo_status?.toLowerCase() === "cancelled" &&
        item?.reference_document?.docstatus === 2
        ? "Revoked"
        : item?.reference_document?.approval_status;
    const isDraft = status === "Draft";

    return (
      <div
        onClick={() =>
          id &&
          openModal(id, stages, sendBackUser, canEdit, todoStatus, status, isDraft)
        }
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
          title: "No Draft Claims",
          description: "You have no Draft expense claim requests.",
        },
        Pending: {
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

    return <NoDataFound title={message.title} subtitle={message.description} />;
  };

  const isDraftFilter =
    activeTab === "expenses" && currentFilters.approval_status === "Draft";

  const tableTitles = isDraftFilter
    ? [
      "",
      "Expense Id",
      "Expense Category",
      "Expense Type",
      "Claimed Amount",
      "Sanctioned Amount",
      "Expense Date",
      "Claimed Date",
      "Status",
      "Actions",
    ]
    : [
      "Expense Id",
      "Expense Category",
      "Expense Type",
      "Claimed Amount",
      "Sanctioned Amount",
      ...(currentFilters.status === "Paid" ? ["Paid Amount"] : []),
      "Expense Date",
      "Claimed Date",
      "Status",
      "Actions",
    ];

  const tableColumnWidths = isDraftFilter
    ? ["48px", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "120px"]
    : [
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
                <Typography variant="h4">
                  {activeTab === "shared"
                    ? "Shared Expense Claims"
                    : "My Expense Claims"}
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  {activeTab === "shared"
                    ? "Track and manage your shared expense claims"
                    : "Track and manage your expense claim requests"}
                </Typography>
              </div>
            ) : (
              <span></span>
            )}
          </div>

          {/* Toggle Tabs */}
          <div className="flex items-center justify-between mt-3 gap-4">
            <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
              <button
                onClick={() => {
                  setActiveTab("expenses");
                  setCurrentListData([]);
                  setSelectedMyExpensesDraftIds(new Set());
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "expenses"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                My Expenses
              </button>
              <button
                onClick={() => {
                  setActiveTab("shared");
                  setCurrentListData([]);
                  setSelectedMyExpensesDraftIds(new Set());
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "shared"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Shared Expenses
              </button>
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
      </div>

      {/* ── Mobile Bulk Action Bar (fixed bottom, draft filter mode) ────── */}
      {isDraftFilter && (
        <div
          className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${selectedMyExpensesDraftIds.size > 0
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
            }`}
        >
          <div className="bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {selectedMyExpensesDraftIds.size} selected
              </span>
              <button
                onClick={() => setSelectedMyExpensesDraftIds(new Set())}
                className="text-sm text-gray-500 underline"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="contain"
                size="md"
                bgColor="primary"
                disabled={updateApprovalStatusMutation.isPending}
                className="flex-1"
                onClick={async () => {
                  const ids = Array.from(selectedMyExpensesDraftIds);
                  let successCount = 0;
                  for (const expenseClaimName of ids) {
                    try {
                      await updateApprovalStatusMutation.mutateAsync({
                        expenseClaimName,
                        approvalStatus: "Pending",
                      });
                      successCount++;
                    } catch {
                      /* handled in hook */
                    }
                  }
                  if (successCount > 0)
                    toast.success(
                      `${successCount} expense(s) submitted for approval.`,
                    );
                  setSelectedMyExpensesDraftIds(new Set());
                }}
              >
                {updateApprovalStatusMutation.isPending
                  ? "Submitting..."
                  : `Submit (${selectedMyExpensesDraftIds.size})`}
              </Button>
              <Button
                variant="outline"
                size="md"
                bgColor="error"
                disabled={deleteExpenseClaimMutation.isPending}
                className="flex-1"
                onClick={() => {
                  setDeleteConfirmModal({
                    isOpen: true,
                    message: `Delete ${selectedMyExpensesDraftIds.size} selected draft expense(s)? This cannot be undone.`,
                    onConfirm: () => {
                      Array.from(selectedMyExpensesDraftIds).forEach((name) =>
                        deleteExpenseClaimMutation.mutate(name),
                      );
                      setSelectedMyExpensesDraftIds(new Set());
                      setDeleteConfirmModal({
                        isOpen: false,
                        message: "",
                        onConfirm: () => { },
                      });
                    },
                  });
                }}
              >
                {deleteExpenseClaimMutation.isPending
                  ? "Deleting..."
                  : `Delete (${selectedMyExpensesDraftIds.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Select All bar — shown at top of list in draft filter mode */}
      {isDraftFilter && !isDesktop && currentListData.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2.5 shadow-sm md:hidden">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                selectedMyExpensesDraftIds.size === currentListData.length &&
                currentListData.length > 0
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMyExpensesDraftIds(
                    new Set(
                      currentListData
                        .map((d: any) => d?.reference_document?.name)
                        .filter(Boolean),
                    ),
                  );
                } else {
                  setSelectedMyExpensesDraftIds(new Set());
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All
            </span>
          </label>
          <span className="text-sm text-gray-500">
            {selectedMyExpensesDraftIds.size > 0
              ? `${selectedMyExpensesDraftIds.size} selected`
              : `${currentListData.length} items`}
          </span>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto md:px-4 pb-5 ${isDraftFilter && selectedMyExpensesDraftIds.size > 0 ? "pb-28 md:pb-24" : "md:pb-20"}`}
      >
        {currentEmployee?.name && activeTab === "expenses" && (
          <CardTable
            titles={tableTitles}
            columnWidths={tableColumnWidths}
            columnSortConfig={
              isDraftFilter
                ? COLUMN_SORT_CONFIG_EXPENSE_CLAIM_DRAFT
                : COLUMN_SORT_CONFIG_EXPENSE_CLAIM
            }
          >
            {/* Select All header for backend-draft filter mode (desktop only) */}
            {isDraftFilter && isDesktop && currentListData.length > 0 && (
              <div
                className="grid items-center gap-4 px-6 h-12 border-b border-gray-200 bg-gray-50"
                style={{
                  gridTemplateColumns:
                    "48px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 120px",
                }}
              >
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedMyExpensesDraftIds.size ===
                      currentListData.length && currentListData.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMyExpensesDraftIds(
                          new Set(
                            currentListData
                              .map((d: any) => d?.reference_document?.name)
                              .filter(Boolean),
                          ),
                        );
                      } else {
                        setSelectedMyExpensesDraftIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <div className="col-span-9 flex items-center justify-between pr-4">
                  <span className="text-sm font-medium text-gray-700">
                    Select All ({selectedMyExpensesDraftIds.size} selected)
                  </span>
                  {selectedMyExpensesDraftIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="contain"
                        size="sm"
                        bgColor="primary"
                        disabled={updateApprovalStatusMutation.isPending}
                        onClick={async () => {
                          const ids = Array.from(selectedMyExpensesDraftIds);
                          let successCount = 0;
                          for (const expenseClaimName of ids) {
                            try {
                              await updateApprovalStatusMutation.mutateAsync({
                                expenseClaimName,
                                approvalStatus: "Pending",
                              });
                              successCount++;
                            } catch {
                              /* handled in hook */
                            }
                          }
                          if (successCount > 0)
                            toast.success(
                              `${successCount} expense(s) submitted for approval.`,
                            );
                          setSelectedMyExpensesDraftIds(new Set());
                        }}
                      >
                        {updateApprovalStatusMutation.isPending
                          ? "Submitting..."
                          : `Submit Selected (${selectedMyExpensesDraftIds.size})`}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        bgColor="error"
                        disabled={deleteExpenseClaimMutation.isPending}
                        onClick={() => {
                          setDeleteConfirmModal({
                            isOpen: true,
                            message: `Are you sure you want to delete ${selectedMyExpensesDraftIds.size} selected draft expense(s)? This cannot be undone.`,
                            onConfirm: () => {
                              Array.from(selectedMyExpensesDraftIds).forEach(
                                (name) =>
                                  deleteExpenseClaimMutation.mutate(name),
                              );
                              setSelectedMyExpensesDraftIds(new Set());
                              setDeleteConfirmModal({
                                isOpen: false,
                                message: "",
                                onConfirm: () => { },
                              });
                            },
                          });
                        }}
                      >
                        {deleteExpenseClaimMutation.isPending
                          ? "Deleting..."
                          : `Delete Selected (${selectedMyExpensesDraftIds.size})`}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DataListView
              queryKey={["expense-claims-all"]}
              customAPI={{
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Expense Claim",
                  employee: currentEmployee?.name,
                },
              }}
              ItemComponent={(props: { item: any }) => {
                const item = props.item;
                const expenseClaim = item?.reference_document;

                if (isDraftFilter && isDesktop) {
                  const itemId = expenseClaim?.name;
                  const isSelected = selectedMyExpensesDraftIds.has(itemId);
                  const formattedAmount = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(expenseClaim?.total_claimed_amount ?? 0);
                  const formattedSanctioned = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(expenseClaim?.total_sanctioned_amount ?? 0);
                  const stages = item?.approval_stages_status || [];
                  const sendBackUser = item?.send_back_user || null;
                  const canEdit = item?.can_edit || false;
                  const todoStatus = item?.todo_status || item?.status || null;
                  const approvalStatus = expenseClaim?.approval_status;
                  const isDraft = approvalStatus === "Draft";
                  return (
                    <div
                      className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                      style={{
                        gridTemplateColumns:
                          "48px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 120px",
                      }}
                      onClick={() =>
                        itemId &&
                        openModal(
                          itemId,
                          stages,
                          sendBackUser,
                          canEdit,
                          todoStatus,
                          approvalStatus,
                          isDraft,
                        )
                      }
                    >
                      <div
                        className="flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedMyExpensesDraftIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(itemId)) next.delete(itemId);
                              else next.add(itemId);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                      <Tooltip
                        content={expenseClaim?.name || ""}
                        triggerClassName="w-full truncate min-w-0 block"
                      >
                        <Typography
                          variant="bodySmall"
                          className="font-medium text-center truncate block w-full"
                        >
                          {expenseClaim?.name}
                        </Typography>
                      </Tooltip>
                      <Tooltip
                        content={
                          expenseClaim?.custom_expense_category_name || ""
                        }
                        triggerClassName="w-full truncate min-w-0 block"
                      >
                        <Typography
                          variant="bodySmall"
                          className="font-medium text-center truncate block w-full"
                        >
                          {expenseClaim?.custom_expense_category_name || "--"}
                        </Typography>
                      </Tooltip>
                      <Tooltip
                        content={
                          expenseClaim?.expenses?.[0]?.custom_claim_type_name ||
                          ""
                        }
                        triggerClassName="w-full truncate min-w-0 block"
                      >
                        <Typography
                          variant="bodySmall"
                          className="font-medium text-center truncate block w-full"
                        >
                          {expenseClaim?.expenses?.[0]
                            ?.custom_claim_type_name || "--"}
                        </Typography>
                      </Tooltip>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-center"
                      >
                        {formattedAmount}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-center"
                      >
                        {formattedSanctioned || "--"}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-center"
                      >
                        {formatToIndianDate(
                          expenseClaim?.expenses?.[0]?.expense_date,
                        )}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-center"
                      >
                        {formatToIndianDate(expenseClaim?.creation)}
                      </Typography>
                      <div className="flex items-center justify-center">
                        <StatusBadge status={expenseClaim?.approval_status} />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const navigationState = buildExpenseNavigationState(
                              expenseClaim,
                              expenseClaim?.expenses?.[0],
                              false,
                            );
                            navigate("/webapp/expenses-app/add-expense", {
                              state: navigationState,
                            });
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmModal({
                              isOpen: true,
                              message:
                                "Are you sure you want to delete this expense?",
                              onConfirm: () => {
                                deleteExpenseClaimMutation.mutate(
                                  expenseClaim?.name,
                                );
                                setDeleteConfirmModal({
                                  isOpen: false,
                                  message: "",
                                  onConfirm: () => { },
                                });
                              },
                            });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isDraftFilter && !isDesktop) {
                  const itemId = expenseClaim?.name;
                  const isSelected = selectedMyExpensesDraftIds.has(itemId);
                  const formattedAmount = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(expenseClaim?.total_claimed_amount ?? 0);
                  const stages = item?.approval_stages_status || [];
                  const sendBackUser = item?.send_back_user || null;
                  const canEdit = item?.can_edit || false;
                  const todoStatus = item?.todo_status || item?.status || null;
                  const approvalStatus = expenseClaim?.approval_status;
                  const isDraft = approvalStatus === "Draft";
                  return (
                    <div
                      className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl"
                      onClick={() =>
                        itemId &&
                        openModal(
                          itemId,
                          stages,
                          sendBackUser,
                          canEdit,
                          todoStatus,
                          approvalStatus,
                          isDraft,
                        )
                      }
                    >
                      <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <label
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedMyExpensesDraftIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(itemId)) next.delete(itemId);
                                  else next.add(itemId);
                                  return next;
                                });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Typography variant="mobileCardLabel">
                              Select
                            </Typography>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const navigationState =
                                  buildExpenseNavigationState(
                                    expenseClaim,
                                    expenseClaim?.expenses?.[0],
                                    false,
                                  );
                                navigate("/webapp/expenses-app/add-expense", {
                                  state: navigationState,
                                });
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmModal({
                                  isOpen: true,
                                  message:
                                    "Are you sure you want to delete this expense claim?",
                                  onConfirm: () => {
                                    deleteExpenseClaimMutation.mutate(
                                      expenseClaim?.name,
                                    );
                                    setDeleteConfirmModal({
                                      isOpen: false,
                                      message: "",
                                      onConfirm: () => { },
                                    });
                                  },
                                });
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography variant="mobileCardLabel">
                            Expense ID
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {expenseClaim?.name}
                          </Typography>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              Expense Category
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {expenseClaim?.custom_expense_category_name ||
                                "--"}
                            </Typography>
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <Typography variant="mobileCardLabel">
                              Expense Type
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {expenseClaim?.expenses?.[0]
                                ?.custom_claim_type_name || "--"}
                            </Typography>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              Claimed Amount
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {formattedAmount}
                            </Typography>
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <Typography variant="mobileCardLabel">
                              Expense Date
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {formatToIndianDate(
                                expenseClaim?.expenses?.[0]?.expense_date,
                              )}
                            </Typography>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              Status
                            </Typography>
                            <StatusBadge
                              status={expenseClaim?.approval_status}
                            />
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <Typography variant="mobileCardLabel">
                              Claimed Date
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {formatToIndianDate(expenseClaim?.creation)}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Normal (non-draft-filter) rendering
                return isDesktop ? (
                  <RowWrapper item={item} />
                ) : (
                  <ItemWrapper item={item} />
                );
              }}
              isSearch={true}
              isFilter={true}
              filterFields={[
                {
                  fieldname: "approval_status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Draft", value: "Draft" },
                    {
                      label: "Pending",
                      value: "Pending",
                      customAPIParams: { todo_status: ["in", ["Open", "Closed"]] },
                    },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                    {
                      label: "Revoked",
                      value: "Revoked",
                      excludeFieldFromFilters: true,
                      customAPIParams: { todo_status: "Cancelled" },
                      additionalFilters: {
                        docstatus: 2,
                        custom_allow_revoke: 1,
                      },
                    },
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
              defaultFilters={computedDefaultFilters}
              onFiltersChange={handleFiltersChange}
              onDataLoad={handleDataLoad}
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={handleRefetchComplete}
              refetchTrigger={refetchAttendance}
              showRefreshButton={false}
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
              noRecordsScreen={noRecordsScreen}
            />
          </CardTable>
        )}

        {currentEmployee?.name && activeTab === "shared" && (
          <CardTable
            titles={[
              "Employee Id",
              "Shared By",
              "Posting Date",
              "Expense Date",
              "Status",
              "Sanctioned Amount",
              "% Share",
              "Allocated Amount",
            ]}
            columnWidths={[
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
            ]}
            columnSortConfig={COLUMN_SORT_CONFIG_SHARED_EXPENSE}
          >
            <DataListView
              queryKey={["shared-expenses", currentEmployee?.name ?? ""]}
              customAPI={{
                method:
                  "chatnext_expense_trips.expense_claim.get_shared_expenses_for_employee",
              }}
              ItemComponent={(props: { item: any }) => {
                const row = props.item?.message?.data
                  ? props.item.message.data
                  : props.item;
                const doc = Array.isArray(row) ? row[0] : row;
                return isDesktop ? (
                  <SharedExpensesRow item={doc} />
                ) : (
                  <SharedExpenseCard item={doc} />
                );
              }}
              onDataLoad={setCurrentListData}
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={() => setRefetchAttendance(false)}
              refetchTrigger={refetchAttendance}
              isSearch={true}
              isFilter={true}
              onFiltersChange={handleFiltersChange}
              filterFields={[
                {
                  fieldname: "approval_status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Draft", value: "Draft" },
                    { label: "Pending", value: "Pending" },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                  ],
                  emptyValueConfig: {
                    filterValue: ["!=", "Cancelled"],
                  },
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
              showRefreshButton={false}
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
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
          todoStatus={
            selectedTodoStatus || todoData?.todo_status || todoData?.status
          }
          status={selectedStatus}
          isDraft={shouldUseDraftReferenceApi}
        />
      )}
      <ExpensePolicyDrawer
        isOpen={isPolicyDrawerOpen}
        onClose={() => setIsPolicyDrawerOpen(false)}
      />

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() =>
          setDeleteConfirmModal({
            isOpen: false,
            message: "",
            onConfirm: () => { },
          })
        }
        size="sm"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Confirm Delete
          </h3>
          <p className="text-gray-600 mb-6">{deleteConfirmModal.message}</p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() =>
                setDeleteConfirmModal({
                  isOpen: false,
                  message: "",
                  onConfirm: () => { },
                })
              }
            >
              Cancel
            </Button>
            <Button
              size="md"
              bgColor="error"
              onClick={deleteConfirmModal.onConfirm}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {submitConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Acknowledgement</h3>
            <p className="mb-2 font-medium">I acknowledge that:</p>
            <ul className="list-disc pl-5 mb-4 text-sm space-y-1 text-gray-700">
              <li>
                I have raised the expense as per the policy-defined limits
              </li>
              <li>I have attached payment proof for all bills</li>
              <li>
                I have uploaded the approval email screenshot for exceptional
                expenses.
              </li>
            </ul>
            <div className="flex items-start gap-2 mb-4">
              <input
                type="checkbox"
                id="draft-ack-checkbox"
                checked={isAcknowledgementChecked}
                onChange={(e) => setIsAcknowledgementChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label
                htmlFor="draft-ack-checkbox"
                className="text-sm text-gray-800 cursor-pointer"
              >
                Otherwise I acknowledge that, the claim may be rejected on a
                later stage.
              </label>
            </div>

            {(() => {
              const selectedDraftsForRelocation =
                sortedDraftExpenses?.filter((d: any) => {
                  const parsed =
                    d?.json && typeof d.json === "string"
                      ? JSON.parse(d.json)
                      : d?.json;
                  return (
                    selectedDraftIds.has(d.name) &&
                    parsed?.categoryType === "Relocation"
                  );
                }) || [];
              if (selectedDraftsForRelocation.length === 0) return null;
              return (
                <div className="flex items-start gap-2 mb-6">
                  <input
                    type="checkbox"
                    id="draft-relocation-ack-checkbox"
                    checked={isRelocationAcknowledgementChecked}
                    onChange={(e) =>
                      setIsRelocationAcknowledgementChecked(e.target.checked)
                    }
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label
                    htmlFor="draft-relocation-ack-checkbox"
                    className="text-sm text-gray-800 cursor-pointer"
                  >
                    I confirm that I have submitted all my relocation expenses.
                  </label>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                className="font-semibold"
                onClick={() =>
                  setSubmitConfirmModal({ isOpen: false, count: 0 })
                }
              >
                Cancel
              </Button>
              <Button
                size="md"
                bgColor="primary"
                className="font-semibold"
                onClick={async () => {
                  if (!isAcknowledgementChecked) {
                    toast.error("Please acknowledge the terms to proceed.");
                    return;
                  }

                  const selectedDrafts =
                    draftExpenses?.filter((d: any) =>
                      selectedDraftIds.has(d.name),
                    ) || [];

                  const expensesToSubmit = selectedDrafts.map((draft: any) => {
                    const parsedJson =
                      draft?.json && typeof draft.json === "string"
                        ? JSON.parse(draft.json)
                        : draft?.json;
                    return {
                      ...parsedJson,
                      uid: parsedJson?.uid,
                    };
                  });

                  const formatExpenseDate = (dateVal: any) => {
                    if (!dateVal) return undefined;
                    if (typeof dateVal === "string") {
                      if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
                        return dateVal;
                      }
                      const d = new Date(dateVal);
                      if (!isNaN(d.getTime())) {
                        return d.toISOString().split("T")[0];
                      }
                    }
                    if (dateVal instanceof Date) {
                      return dateVal.toISOString().split("T")[0];
                    }
                    return undefined;
                  };

                  const payload = {
                    employee: currentEmployee?.name,
                    employee_name: currentEmployee?.employee_name,
                    company: currentEmployee?.company,
                    posting_date: new Date().toISOString().split("T")[0],
                    expenses: expensesToSubmit.map(
                      (exp: any, index: number) => {
                        const {
                          uid,
                          submitButton,
                          saveAndSubmit,
                          categoryTypeOptions,
                          expense_date,
                          start_datetime,
                          end_datetime,
                          ...rest
                        } = exp;
                        const formattedExpense: any = { ...rest };

                        if (expense_date) {
                          formattedExpense.expense_date =
                            formatExpenseDate(expense_date);
                        }
                        if (start_datetime) {
                          const d = new Date(start_datetime);
                          if (!isNaN(d.getTime())) {
                            formattedExpense.start_datetime = d
                              .toISOString()
                              .replace("T", " ")
                              .slice(0, 19);
                          }
                        }
                        if (end_datetime) {
                          const d = new Date(end_datetime);
                          if (!isNaN(d.getTime())) {
                            formattedExpense.end_datetime = d
                              .toISOString()
                              .replace("T", " ")
                              .slice(0, 19);
                          }
                        }

                        // Add acknowledgment fields matching Save & Submit behavior
                        const categoryType = exp.categoryType || "General";
                        formattedExpense.custom_is_acknowledged =
                          isAcknowledgementChecked;
                        if (
                          categoryType === "Relocation" &&
                          index === expensesToSubmit.length - 1
                        ) {
                          formattedExpense.custom_is_last_relocation_expense =
                            isRelocationAcknowledgementChecked;
                        }

                        return {
                          ...formattedExpense,
                          expense_type: exp.expenseType || exp.expense_type,
                          reimbursement_category:
                            exp.expenseCategory || exp.expenseCategory,
                        };
                      },
                    ),
                  };

                  setSubmitConfirmModal({ isOpen: false, count: 0 });

                  await new Promise<void>((resolve, reject) => {
                    submitExpenses(JSON.stringify(payload), {
                      onSuccess: async (response: any) => {
                        try {
                          // Get the created expense claim document name(s)
                          const message = response?.message;
                          const claims = response?.claims;

                          let expenseClaimNames: string[] = [];

                          if (Array.isArray(claims) && claims.length > 0) {
                            expenseClaimNames = claims.map(
                              (claim: any) => claim.name || claim,
                            );
                          } else if (response?.name) {
                            expenseClaimNames = [response.name];
                          } else if (message?.name) {
                            expenseClaimNames = [message.name];
                          } else if (message?.results) {
                            expenseClaimNames = message.results.map(
                              (r: any) => r.name || r,
                            );
                          }

                          // Update files attached to drafts with new expense claim reference
                          const fileUpdatePromises: Promise<any>[] = [];

                          selectedDrafts.forEach(
                            (draft: any, index: number) => {
                              const expenseClaimName = expenseClaimNames[index];
                              if (!expenseClaimName) return;

                              // Find files attached to this draft
                              fileUpdatePromises.push(
                                expenseService
                                  .getFilesByAttachment(
                                    "Draft Expense Claim",
                                    draft.name,
                                  )
                                  .then(async (files: any[]) => {
                                    await Promise.all(
                                      files.map((file: any) =>
                                        updateFileMutation.mutateAsync({
                                          fileName: file.name,
                                          data: {
                                            attached_to_doctype:
                                              "Expense Claim",
                                            attached_to_name: expenseClaimName,
                                          },
                                        }),
                                      ),
                                    );
                                  }),
                              );
                            },
                          );

                          await Promise.all(fileUpdatePromises);

                          // Delete submitted drafts after updating files
                          selectedDraftIds.forEach((id) => {
                            deleteDraftMutation.mutate(id);
                          });

                          setSelectedDraftIds(new Set());
                          toast.success("Drafts submitted successfully!");
                          resolve();
                        } catch (error) {
                          console.error(
                            "Error updating file attachments:",
                            error,
                          );
                          // Still proceed with deletion even if file update fails
                          selectedDraftIds.forEach((id) => {
                            deleteDraftMutation.mutate(id);
                          });
                          setSelectedDraftIds(new Set());
                          resolve();
                        }
                      },
                      onError: (err: any) => {
                        reject(err);
                      },
                    } as any);
                  });
                }}
                loading={isSubmitting}
              >
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesList;
