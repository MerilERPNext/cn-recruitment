/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import {
  useDeleteDraftExpenseClaim,
  useGetAllExpenseCategories,
  useGetDraftExpenseClaims,
  usePostExpenseClaim,
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
import { buildExpenseNavigationState } from "./expenseNavigationHelper";
import { SharedExpenseCard, SharedExpensesRow } from "./SharedExpenses";

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
        />

        <MyApprovalActionPill
          variant="buttons"
          isPending={item?.status === "Draft"}
          canEdit={canEdit}
          onEdit={handleEditClick}
          canRevoke={
            item?.custom_allow_revoke === 1 &&
            !(
              item?.todo_status?.toLowerCase() === "cancelled" &&
              item?.reference_document?.docstatus === 2
            )
          }
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
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
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
          canRevoke={
            item?.custom_allow_revoke === 1 &&
            !(
              item?.todo_status?.toLowerCase() === "cancelled" &&
              item?.reference_document?.docstatus === 2
            )
            &&
            item?.todo_status?.toLowerCase() === "open"
          }
          revokeLoading={revokeEventMutation.isPending}
          onRevoke={handleRevokeClick}
        />
      </div>
    </div>
  );
};

// --- Draft Expense Mobile Card ---
const DraftExpenseItem: React.FC<{
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}> = ({ item, isSelected, onToggleSelect, onEdit, onDelete }) => {
  const parsedJson = React.useMemo(() => {
    if (item?.json && typeof item.json === "string") {
      try {
        return JSON.parse(item.json);
      } catch {
        return null;
      }
    }
    return item?.json || null;
  }, [item]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value ?? 0);

  const claimedAmount = formatCurrency(parsedJson?.amount);
  const itemId = item?.name;

  const attachmentNames = React.useMemo(() => {
    if (!parsedJson?.attachments) return [];
    return parsedJson.attachments
      .split(",")
      .map((a: string) => a.trim())
      .filter(Boolean);
  }, [parsedJson]);

  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b
      border-x-primary/20 border-b-primary/20
      shadow-sm border-primary bg-white rounded-xl"
    >
      <div className="p-4 flex flex-col gap-4">
        {/* Checkbox + Actions header */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(itemId);
              }}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Typography variant="mobileCardLabel">Select</Typography>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Categories / Types */}
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Expense Category</Typography>
            <Typography variant="mobileCardValue">
              {parsedJson?.custom_expense_category_name ||
                parsedJson?.expenseCategory ||
                "-"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Expense Type</Typography>
            <Typography variant="mobileCardValue">
              {parsedJson?.custom_expense_type ||
                parsedJson?.expenseType ||
                "-"}
            </Typography>
          </div>
        </div>

        {/* Date & Amount */}
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Expense Date</Typography>
            <Typography variant="mobileCardValue">
              {parsedJson?.expense_date
                ? formatToIndianDate(parsedJson.expense_date)
                : "-"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Claimed Amount</Typography>
            <Typography variant="mobileCardValue">{claimedAmount}</Typography>
          </div>
        </div>

        {/* Created Date & Attachemnt*/}
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Created Date</Typography>
            <Typography variant="mobileCardValue">
              {item?.creation
                ? formatToIndianDate(item.creation)
                : "-"}
            </Typography>
          </div>
          {attachmentNames.length > 0 && (
            <div className="flex text-right flex-col gap-1">
              <Typography variant="mobileCardLabel">Attachments</Typography>
              <Typography variant="mobileCardValue">
                {attachmentNames.length} file(s): {attachmentNames.join(", ")}
              </Typography>
            </div>
          )}
        </div>

        {/* Attachments */}

      </div>
    </div>
  );
};

// --- Draft Expense Desktop Row ---
const DraftExpenseTableRow: React.FC<{
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}> = ({ item, isSelected, onToggleSelect, onEdit, onDelete }) => {
  const itemId = item?.name;

  const parsedJson = React.useMemo(() => {
    if (item?.json && typeof item.json === "string") {
      try {
        return JSON.parse(item.json);
      } catch {
        return null;
      }
    }
    return item?.json || null;
  }, [item]);

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(parsedJson?.amount ?? 0);

  const attachmentNames = React.useMemo(() => {
    if (!parsedJson?.attachments) return null;
    return parsedJson.attachments
      .split(",")
      .map((a: string) => a.trim())
      .filter(Boolean);
  }, [parsedJson]);

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns: "48px 1fr 1fr 1fr 1fr 1fr 1fr 120px" }}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(itemId);
          }}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />
      </div>
      <Tooltip
        content={`${parsedJson?.custom_expense_category_name || parsedJson?.expenseCategory || ""}`}
        triggerClassName="w-full truncate min-w-0 block"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate block w-full"
        >
          {parsedJson?.custom_expense_category_name ||
            parsedJson?.expenseCategory ||
            "-"}
        </Typography>
      </Tooltip>
      <Tooltip
        content={
          parsedJson?.custom_expense_type || parsedJson?.expenseType || ""
        }
        triggerClassName="w-full truncate min-w-0 block"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate block w-full"
        >
          {parsedJson?.custom_expense_type || parsedJson?.expenseType || "-"}
        </Typography>
      </Tooltip>
      <Typography variant="bodySmall" className="font-medium text-center">
        {item?.creation
          ? formatToIndianDate(item.creation)
          : "-"}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {parsedJson?.expense_date
          ? formatToIndianDate(parsedJson.expense_date)
          : "-"}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedAmount}
      </Typography>
      <Tooltip content={attachmentNames?.join(", ") || "No attachments"}>
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate px-2"
        >
          {attachmentNames ? `${attachmentNames.length} file(s)` : "-"}
        </Typography>
      </Tooltip>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          title="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
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
    urlReferenceName || undefined,
  );

  const { data: expenseCategories } = useGetAllExpenseCategories();

  const [activeTab, setActiveTab] = React.useState<"expenses" | "draft" | "shared">(() => {
    const stored = localStorage.getItem("expenseActiveTab");
    if (stored === "expenses" || stored === "draft" || stored === "shared") return stored;
    return "draft";
  });
  const [selectedDraftIds, setSelectedDraftIds] = React.useState<Set<string>>(
    new Set(),
  );
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

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployee();
  const navigate = useNavigate();
  const { data: draftExpenses, isFetching: isFetchingDrafts } =
    useGetDraftExpenseClaims(currentEmployee?.name);
  const deleteDraftMutation = useDeleteDraftExpenseClaim();
  const { mutateAsync: submitExpenses, isPending: isSubmitting } =
    usePostExpenseClaim();
  const updateFileMutation = useUpdateFileAttachment();

  const [currentFilters, setCurrentFilters] = React.useState<
    Record<string, any>
  >({});

  const expenseCategoryOptions = React.useMemo(() => {
    if (!expenseCategories || !Array.isArray(expenseCategories)) {
      return [];
    }
    return expenseCategories.map((cat: any) => ({
      label: cat.category_name || cat.name,
      value: cat.category_name || cat.name,
    }));
  }, [expenseCategories]);

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
  };

  const closeModal = () => {
    setSelectedId(null);
    setSelectedStages([]);
    setSelectedSendBackUser(null);
    setSelectedCanEdit(false);
    setSelectedTodoStatus(null);
    setSelectedStatus(undefined);
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
    const status =
      item?.custom_allow_revoke === 1 &&
        item?.todo_status?.toLowerCase() === "cancelled" &&
        item?.reference_document?.docstatus === 2
        ? "Revoked"
        : item?.reference_document?.approval_status;

    return (
      <div
        onClick={() =>
          id && openModal(id, stages, sendBackUser, canEdit, todoStatus, status)
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

    return (
      <div
        onClick={() =>
          id && openModal(id, stages, sendBackUser, canEdit, todoStatus, status)
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

  const tableTitles =
    activeTab === "draft"
      ? [
        "",
        "Expense Category",
        "Expense Type",
        "Created Date",
        "Expense Date",
        "Claimed Amount",
        "Attachments",
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

  const tableColumnWidths =
    activeTab === "draft"
      ? ["48px", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "120px"]
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
                  {activeTab === "draft"
                    ? "Draft Expense Claims"
                    : activeTab === "shared"
                      ? "Shared Expense Claims"
                      : "My Expense Claims"}
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  {activeTab === "draft"
                    ? "View your draft expense claims"
                    : activeTab === "shared"
                      ? "Track and manage your shared expense claims"
                      : "Track and manage your expense claim requests"}
                </Typography>
              </div>
            ) : (
              <span></span>
            )}
          </div>

          {/* Toggle Tabs */}
          <div className="flex mt-3 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab("draft")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "draft"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Draft Expenses
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "expenses"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              My Expenses
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "shared"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Shared Expenses
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {currentEmployee?.name && activeTab === "expenses" && (
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
                    {
                      label: "Pending",
                      key: "Draft",
                      value: "Draft",
                      customAPIParams: { todo_status: "Open" },
                    },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                    {
                      label: "Revoked",
                      value: "Revoked",
                      excludeFieldFromFilters: true,
                      customAPIParams: {
                        todo_status: "Cancelled",
                      },
                      additionalFilters: {
                        docstatus: 2,
                        custom_allow_revoke: 1,
                      },
                    },
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
              // defaultFilters={{ approval_status: ["===", "Draft"] }}
              onFiltersChange={setCurrentFilters}
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={() => setRefetchAttendance(false)}
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

        {currentEmployee?.name && activeTab === "draft" && (
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {isFetchingDrafts ? (
              <div className="flex flex-col gap-3 px-4">
                {[1, 2, 3].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : draftExpenses && draftExpenses.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  {/* Select All Header Row - Desktop only */}
                  {isDesktop && (
                    <div
                      className="grid max-w-screen items-center gap-4 px-6 h-12 border-b border-gray-200 bg-gray-50"
                      style={{
                        gridTemplateColumns: "48px 1fr 1fr 1fr 1fr 1fr 120px",
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedDraftIds.size === draftExpenses.length &&
                            draftExpenses.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDraftIds(
                                new Set(draftExpenses.map((d: any) => d.name)),
                              );
                            } else {
                              setSelectedDraftIds(new Set());
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                      <div className="col-span-5 flex items-center">
                        <span className="text-sm font-medium text-gray-700">
                          Select All ({selectedDraftIds.size} selected)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Draft List */}
                  {draftExpenses.map((draft: any) => {
                    const isSelected = selectedDraftIds.has(draft.name);
                    const handleToggleSelect = (id: string) => {
                      setSelectedDraftIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) {
                          next.delete(id);
                        } else {
                          next.add(id);
                        }
                        return next;
                      });
                    };
                    const handleEdit = (editItem: any) => {
                      const parsedJson =
                        editItem?.json && typeof editItem.json === "string"
                          ? JSON.parse(editItem.json)
                          : editItem?.json;
                      if (parsedJson) {
                        const attachments = parsedJson?.attachments;
                        let attachReceipt = null;
                        if (attachments) {
                          const attachmentNames = attachments
                            .split(",")
                            .map((a: string) => a.trim())
                            .filter(Boolean);
                          if (attachmentNames.length > 0) {
                            attachReceipt = attachmentNames.map(
                              (name: string) => ({
                                name: name,
                                size: 4000,
                                url: name,
                                storage: "url",
                                originalName: name,
                              }),
                            );
                          }
                        }
                        navigate("/webapp/expenses-app/add-expense", {
                          state: {
                            expense: {
                              ...parsedJson,
                              attach_receipt: attachReceipt,
                              uid: parsedJson.uid,
                            },
                            expense_claim_name: editItem.name,
                            draft_document_name: editItem.name,
                            isEditingFromDetailsPage: false,
                          },
                        });
                      }
                    };
                    const handleDelete = (deleteItem: any) => {
                      setDeleteConfirmModal({
                        isOpen: true,
                        message:
                          "Are you sure you want to delete this draft expense?",
                        onConfirm: () => {
                          deleteDraftMutation.mutate(deleteItem.name);
                          setDeleteConfirmModal({
                            isOpen: false,
                            message: "",
                            onConfirm: () => { },
                          });
                        },
                      });
                    };
                    return isDesktop ? (
                      <DraftExpenseTableRow
                        key={draft.name}
                        item={draft}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ) : (
                      <DraftExpenseItem
                        key={draft.name}
                        item={draft}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>

                {/* Action Buttons for Selected */}
                {selectedDraftIds.size > 0 && (
                  <div className="flex justify-end gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200 mt-2">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setSelectedDraftIds(new Set())}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contain"
                      size="md"
                      bgColor="primary"
                      onClick={() => {
                        setSubmitConfirmModal({
                          isOpen: true,
                          count: selectedDraftIds.size,
                        });
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : `Submit Selected (${selectedDraftIds.size})`}
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      bgColor="error"
                      onClick={() => {
                        setDeleteConfirmModal({
                          isOpen: true,
                          message: `Are you sure you want to delete ${selectedDraftIds.size} selected draft(s)?`,
                          onConfirm: () => {
                            selectedDraftIds.forEach((id) => {
                              deleteDraftMutation.mutate(id);
                            });
                            setSelectedDraftIds(new Set());
                            setDeleteConfirmModal({
                              isOpen: false,
                              message: "",
                              onConfirm: () => { },
                            });
                          },
                        });
                      }}
                    >
                      Delete Selected ({selectedDraftIds.size})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4">
                <NoDataFound
                  title="No Draft Expenses"
                  subtitle="Your saved draft expense claims will appear here."
                />
              </div>
            )}
          </CardTable>
        )}

        {currentEmployee?.name && activeTab === "shared" && (
          <CardTable
            titles={[
              "Employee ID",
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
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={() => setRefetchAttendance(false)}
              refetchTrigger={refetchAttendance}
              isSearch={false}
              isFilter={false}
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

      <Modal
        isOpen={submitConfirmModal.isOpen}
        onClose={() => setSubmitConfirmModal({ isOpen: false, count: 0 })}
        size="sm"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Confirm Submit
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to submit {submitConfirmModal.count} selected
            draft(s)?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setSubmitConfirmModal({ isOpen: false, count: 0 })}
            >
              Cancel
            </Button>
            <Button
              size="md"
              bgColor="primary"
              onClick={async () => {
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
                  expenses: expensesToSubmit.map((exp: any) => {
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
                    console.log(
                      uid,
                      submitButton,
                      saveAndSubmit,
                      categoryTypeOptions,
                    );
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

                    return {
                      ...formattedExpense,
                      expense_type: exp.expenseType || exp.expense_type,
                      reimbursement_category:
                        exp.expenseCategory || exp.expenseCategory,
                    };
                  }),
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

                        selectedDrafts.forEach((draft: any, index: number) => {
                          const expenseClaimName = expenseClaimNames[index];
                          if (!expenseClaimName) return;

                          // Find files attached to this draft
                          fileUpdatePromises.push(
                            expenseService
                              .getFilesByAttachment(
                                "Draft Expense Claim",
                                draft.name,
                              )
                              .then((files: any[]) => {
                                files.forEach((file: any) => {
                                  updateFileMutation.mutate({
                                    fileName: file.name,
                                    data: {
                                      attached_to_doctype: "Expense Claim",
                                      attached_to_name: expenseClaimName,
                                    },
                                  });
                                });
                              }),
                          );
                        });

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
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesList;
