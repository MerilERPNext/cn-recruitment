/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { ApiAdvance, UiAdvance } from "../../../types/employeeAttendance";
import { formatCurrency } from "../../../utils/currency";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { isActionEnabled } from "../../../utils/uiPermission";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceForm from "./AdvanceForm";
import InstallmentsList from "./InstallmentsList";
import Modal from "./commonModal";
import ShowHideButton from "../ui/ShowHideButton";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { queryClient } from "../../../providers/QueryProvider";
import DataListView from "../../DataListView"; // ← adjust path as needed

// ─── mapAdvanceData helper ────────────────────────────────────────────────────
const mapAdvanceData = (apiData: ApiAdvance[]): UiAdvance[] => {
  if (!Array.isArray(apiData)) return [];
  return apiData.map((a) => ({
    name: a.advance_type,
    docname: a.name,
    can_edit: a.can_edit,
    allocated_to: a.allocated_to,
    allocated_to_roles: a.allocated_to_roles,
    allocated_to_user: a.allocated_to_user,
    amount: a.total_advance_amount,
    numberOfDeductions: a.total_paid_amount,
    startDate: a.start_date,
    endDate: a.end_date,
    advanceStatus: a.status,
    employee_name: a.employee_name,
    todo:
      Array.isArray(a.todo_list) && a.todo_list.length > 0
        ? a.todo_list[0]
        : null,
    installments: Array.isArray(a.repayments)
      ? a.repayments.map((r) => ({
          installmentNo: r.idx,
          installmentDate: r.payment_date,
          openingBalance: r.balance_amount,
          installmentAmount: r.payment_amount,
          principalBalance: r.deducted,
        }))
      : [],
  }));
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdvancesList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [selectedAdvance, setSelectedAdvance] = useState<UiAdvance | null>(null);
  const [showInstallments, setShowInstallments] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [editAdvanceId, setEditAdvanceId] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const { isDesktop } = useScreenSize();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  // Register action button in central SalarySlipApp
  const { setActionButtonConfig, setIsModalOpen } = useOutletContext<{
    setActionButtonConfig: (
      config: { label: string; onClick: () => void; disabled?: boolean } | null,
    ) => void;
    setIsModalOpen: (open: boolean) => void;
  }>();

  // UI Permission check
  const { data: uiPermission } = useGetUiPermission("Compensation");
  const canCreateAdvance = isActionEnabled(uiPermission, "create_advance", "My Advances");

  useEffect(() => {
    if (canCreateAdvance) {
      setActionButtonConfig({
        label: "+ Request Advance",
        onClick: () => {
          setShowAdvanceForm(true);
          setIsModalOpen(true);
        },
      });
    } else {
      setActionButtonConfig(null);
    }
    return () => setActionButtonConfig(null);
  }, [setActionButtonConfig, setIsModalOpen, canCreateAdvance]);

  useEffect(() => {
    if (refetchAttendance) {
      setRefetchTrigger((prev) => prev + 1);
      setRefetchAttendance(false);
    }
  }, [refetchAttendance, setRefetchAttendance]);

  const handleEdit = (docname: string) => {
    setEditAdvanceId(docname);
    setShowAdvanceForm(true);
  };

  const handleViewInstallments = (advance: UiAdvance) => {
    setSelectedAdvance(advance);
    setShowInstallments(true);
  };

  const handleBackToAdvances = () => {
    setShowInstallments(false);
    setSelectedAdvance(null);
  };

  const handleCloseModal = () => {
    setShowAdvanceForm(false);
    setEditAdvanceId(null);
    setIsModalOpen(false);
  };

  const handleRefetch = () => {
    setTimeout(() => setRefetchTrigger((prev) => prev + 1), 1500);
    queryClient.invalidateQueries({ queryKey: ["advances"] });
  };

  // ── Show InstallmentsList view ──────────────────────────────────────────────
  if (showInstallments && selectedAdvance) {
    return (
      <InstallmentsList
        advance={selectedAdvance}
        onBack={handleBackToAdvances}
        maskAmounts={maskAmounts}
        onToggleMask={() => setMaskAmounts(!maskAmounts)}
      />
    );
  }
   const PERQUISITE_SORT_CONFIG: ColumnSortConfig[] = [
    {
      sortable: true,
      type: "string",
      field: "name",
      getValue: (item: any) =>
        item.advance.name ?? "",
    },

          {
            sortable: true,
            type: "string",
            field: "advance_amount",
            getValue: (item: any) =>
              item?.advance.amount ?? "",
          },
          {
            sortable: true,
            type: "number",
            field: "numberOfDeductions",
            getValue: (item: any) =>
              item?.advance.numberOfDeductions ?? 0,
          },
          {
            sortable: true,
            type: "date",
            field: "start_date",
            getValue: (item: any) =>
              item?.advance.startDate ?? "",
          },
          {
            sortable: true,
            type: "date",
            field: "posting_date",
            getValue: (item: any) =>
              item?.advance.endDate ?? "",
          },
          {
            sortable: false,

          },
          {
            sortable: false, // Actions
          },
        ];

  const titles = [
    "Advance Name",
    "Amount",
    "Deductions",
    "Start Date",
    "End Date",
    "Status",
    "Actions",
  ];
  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  // ── customAPI config — only build when employeeId is ready ──────────────────
  const customAPI = employeeId
    ? {
        method:
          "cn_indian_payroll.cn_indian_payroll.overrides.employee_advance.get_advance_dashboard",
        params: { employee: employeeId },
      }
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ===== Header ===== */}
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between max-sm:mb-2">
            {isDesktop ? (
              <div>
                <Typography variant="h4">My Advance Request</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your advance requests
                </Typography>
              </div>
            ) : (
              <span></span>
            )}
            <ShowHideButton
              showAmount={maskAmounts}
              onToggleAmount={() => setMaskAmounts((prev) => !prev)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto md:px-4 pb-4">
          <CardTable titles={titles} columnWidths={columnWidths} columnSortConfig={PERQUISITE_SORT_CONFIG}>
            <>
              {!customAPI ? (
                <CardSkeleton />
              ) : (
                <DataListView<UiAdvance>
                  queryKey={["advances", employeeId]}
                  customAPI={customAPI}
                  isSearch={true}
                  isFilter={false}
                  showPagination={true}
                  pageSize={10}
                  SkeletonComponent={CardSkeleton}
                  refetchTrigger={refetchTrigger}
                  onRefetchComplete={() => setRefetchTrigger(0)}
                  clientFilterFn={(rawData) => {
                    return mapAdvanceData(rawData as unknown as ApiAdvance[]);
                  }}
                  noRecordsScreen={
                    <NoDataFound
                      title="No Advance Records"
                      subtitle="You have not requested any advance yet."
                    />
                  }
                  renderItem={(item: UiAdvance, index: number) =>
                    isDesktop ? (
                      <AdvanceDesktopRow
                        key={`${item.name}-${index}`}
                        advance={item}
                        maskAmounts={maskAmounts}
                        handleEdit={handleEdit}
                        handleViewInstallments={handleViewInstallments}
                        handleRefetch={handleRefetch}
                      />
                    ) : (
                      <AdvanceMobileRow
                        key={`${item.name}-${index}`}
                        advance={item}
                        maskAmounts={maskAmounts}
                        handleEdit={handleEdit}
                        handleViewInstallments={handleViewInstallments}
                        handleRefetch={handleRefetch}
                      />
                    )
                  }
                />
              )}
            </>
          </CardTable>
        </div>

        {showAdvanceForm && (
          <Modal onClose={handleCloseModal}>
            <AdvanceForm
              docname={editAdvanceId}
              user={user}
              onClose={handleCloseModal}
            />
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdvancesList;

// ─── Per-row sub-components ───────────────────────────────────────────────────

type AdvanceRowProps = {
  advance: UiAdvance;
  maskAmounts: boolean;
  handleEdit: (docname: string) => void;
  handleViewInstallments: (advance: UiAdvance) => void;
  handleRefetch: () => void;
};

const AmountEntry = ({
  label,
  value,
  maskAmounts,
}: {
  label: string;
  value: number;
  maskAmounts: boolean;
}) => (
  <div className="flex items-start justify-between">
    <div className="flex flex-col gap-1">
      <Typography variant="mobileCardLabel">{label}</Typography>
    </div>
    <div className="flex flex-col gap-1 text-right">
      {maskAmounts ? (
        <Typography
          variant="mobileCardValue"
          className="blur-sm select-none text-gray-400"
        >
          {formatCurrency(0).replace("0", "XX,XXX")}
        </Typography>
      ) : (
        <Typography variant="mobileCardValue">
          {formatCurrency(value)}
        </Typography>
      )}
    </div>
  </div>
);

const AdvanceDesktopRow = ({
  advance,
  maskAmounts,
  handleEdit,
  handleViewInstallments,
  handleRefetch,
}: AdvanceRowProps) => {
  const { data: currentUser } = useCurrentUser();
  const todo = advance.todo ?? null;
  const canRevoke = todo?.custom_allow_revoke === 1;
  const canEdit =
    todo?.can_edit === true &&
    currentUser?.name?.toLowerCase() === todo?.send_back_user?.toLowerCase();

  const loading = useLoadingOverlay();
  const revokeEventMutation = useRevokeEvent();

  const handleRevokeClick = () => {
    if (!todo?.todo_id) return;
    loading?.show("Revoking Request...");
    revokeEventMutation.mutate(
      {
        docname: todo.reference_name,
        doctype: todo.reference_type,
        todo: todo.todo_id,
      },
      {
        onSuccess: () => {
          handleRefetch();
          toast.success("Advance Request Revoked Successfully!");
        },
        onError: (error) => {
          toast.error(errorResponseFormater(error));
        },
        onSettled: () => loading?.hide(),
      },
    );
  };

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
      onClick={() => handleViewInstallments(advance)}
    >
      <Typography variant="bodySmall" className="font-medium text-center">
        {advance.name}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {maskAmounts ? (
          <span className="blur-sm select-none text-gray-400">
            {formatCurrency("XX,XXX")}
          </span>
        ) : (
          <span>{formatCurrency(advance.amount)}</span>
        )}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {maskAmounts ? (
          <span className="blur-sm select-none text-gray-400">
            {formatCurrency("XX,XXX")}
          </span>
        ) : (
          <span>{formatCurrency(advance.numberOfDeductions)}</span>
        )}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(advance.startDate)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(advance.endDate)}
      </Typography>

      <div className="flex items-center justify-center">
        <AllocatedToTooltip
          users={todo?.allocated_to}
          roles={todo?.allocated_roles}
          role={todo?.role ?? ""}
          position="left"
        >
          <StatusBadge status={advance.advanceStatus} />
        </AllocatedToTooltip>
      </div>

      <div className="flex items-center justify-center">
        <MyApprovalActionPill
          isPending={advance.advanceStatus === "Pending"}
          canRevoke={canRevoke}
          canEdit={canEdit}
          onRevoke={handleRevokeClick}
          onEdit={() => handleEdit(advance.docname)}
          isResubmit={canEdit}
        />
      </div>
    </div>
  );
};

const AdvanceMobileRow = ({
  advance,
  maskAmounts,
  handleEdit,
  handleViewInstallments,
  handleRefetch,
}: AdvanceRowProps) => {
  const { data: currentUser } = useCurrentUser();
  const todo = advance.todo ?? null;
  const canRevoke = todo?.custom_allow_revoke === 1;
  const canEdit =
    todo?.can_edit === true &&
    currentUser?.name?.toLowerCase() === todo?.send_back_user?.toLowerCase();

  const loading = useLoadingOverlay();
  const revokeEventMutation = useRevokeEvent();

  const handleRevokeClick = () => {
    if (!todo?.todo_id) return;
    loading?.show("Revoking Request...");
    revokeEventMutation.mutate(
      {
        docname: todo.reference_name,
        doctype: todo.reference_type,
        todo: todo.todo_id,
      },
      {
        onSuccess: () => {
          handleRefetch();
          toast.success("Advance Request Revoked Successfully!");
        },
        onError: (error) => {
          toast.error(errorResponseFormater(error));
        },
        onSettled: () => loading?.hide(),
      },
    );
  };

  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b mt-2 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl"
      onClick={() => handleViewInstallments(advance)}
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Advance Name</Typography>
            <Typography variant="mobileCardValue">{advance.name}</Typography>
          </div>
          <StatusBadge status={advance.advanceStatus} />
        </div>

        <AmountEntry
          label="Total Amount"
          value={advance.amount}
          maskAmounts={maskAmounts}
        />
        <AmountEntry
          label="Deduction Amount"
          value={advance.numberOfDeductions}
          maskAmounts={maskAmounts}
        />

        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Duration</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(advance.startDate)} to{" "}
              {formatToIndianDate(advance.endDate)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Installments</Typography>
            <Typography variant="mobileCardValue">
              {advance.installments.length}
            </Typography>
          </div>
        </div>

        <MobileAllocatedTo
          users={advance.allocated_to}
          roles={advance.allocated_to_roles}
        />

        <MyApprovalActionPill
          variant="buttons"
          isPending={advance.advanceStatus === "Pending"}
          canRevoke={canRevoke}
          canEdit={canEdit}
          onRevoke={handleRevokeClick}
          onEdit={() => handleEdit(advance.docname)}
          isResubmit={canEdit}
        />
      </div>
    </div>
  );
};