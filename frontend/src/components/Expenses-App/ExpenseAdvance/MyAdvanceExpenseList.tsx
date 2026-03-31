/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { ApprovalStage } from "../../../types/expenseAdvance";
import { formatCurrency } from "../../../utils/currencyFormatter";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import DataListView from "../../DataListView";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import CardTable from "../../shared/CardTable";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceDetailModal from "./AdvanceDetailModal";

const MyAdvanceExpenseList = () => {
  const [selectedAdvance, setSelectedAdvance] = useState<{
    id: string;
    status: string;
  } | null>(null);
  const [selectedStages, setSelectedStages] = useState<ApprovalStage[]>([]);

  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: currentUser } = useCurrentUser();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlRequestId = searchParams.get("requestId");
  const urlReferenceName = searchParams.get("reference_name");

  const { data: todoData } = useGetToDoWithReferenceDoc(
    urlRequestId || undefined,
    urlReferenceName || undefined,
  );

  const revokeEventMutation = useRevokeEvent();
  const loading = useLoadingOverlay();

  const openDetailModal = (
    id: string,
    stages: ApprovalStage[],
    status: string,
  ) => {
    setSelectedStages(stages);
    setTimeout(() => {
      setSelectedAdvance({ id, status });
      setSearchParams({ reference_name: id });
    }, 0);
  };

  const closeDetailModal = () => {
    setSelectedAdvance(null);
    setSelectedStages([]);
    if (urlRequestId || urlReferenceName) {
      setSearchParams({});
    }
  };

  const documentIdToOpen =
    selectedAdvance?.id ||
    urlReferenceName ||
    todoData?.reference_name ||
    todoData?.reference_document?.name;

  /** Determine action permissions for a todo item */
  const getActionFlags = (item: any) => {
    const canEdit =
      item?.can_edit === true &&
      currentUser?.name?.toLowerCase() === item?.send_back_user?.toLowerCase();

    const canRevoke = !(
      item?.custom_allow_revoke === 1 &&
      item?.todo_status?.toLowerCase() === "cancelled" &&
      item?.reference_document?.docstatus === 2
    );

    return { canEdit, canRevoke };
  };

  /** Navigate to the advance form in edit mode with pre-filled data */
  const handleEditClick = (item: any) => {
    navigate("/webapp/expenses-app/new-expense-advance", {
      state: { advanceData: item.reference_document },
    });
  };

  /** Revoke an advance */
  const handleRevokeClick = (item: any) => {
    if (!item?.todo_id) return;
    loading?.show("Revoking Advance...");
    revokeEventMutation.mutate(
      {
        docname: item?.reference_name,
        doctype: item?.reference_type,
        todo: item?.todo_id,
      },
      {
        onSuccess: () => {
          setTimeout(() => setRefetchAttendance(true), 2000);
          toast.success("Advance Revoked Successfully!");
        },
        onError: (error) => {
          toast.error(errorResponseFormater(error));
        },
        onSettled: () => loading?.hide(),
      },
    );
  };

  const DesktopRow = ({ item }: any) => {
    const doc = item.reference_document;
    const { canEdit, canRevoke } = getActionFlags(item);
    console.log("Rendering DesktopRow for doc:", { canEdit, canRevoke });

    return (
      <div
        className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
      >
        <Typography variant="bodySmall" className="font-medium text-center">
          {doc.name}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {doc.custom_advance_type}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {doc.custom_advance_policy}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(doc.posting_date)}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatCurrency(doc.advance_amount)}
        </Typography>
        <div className="flex items-center justify-center">
          <AllocatedToTooltip
            users={item?.allocated_to}
            roles={item?.allocated_roles}
            allocated_to_user={item?.allocated_to_user}
            position="left"
          >
            <StatusBadge
              status={
                item?.custom_allow_revoke === 1 &&
                item?.todo_status?.toLowerCase() === "cancelled" &&
                item?.reference_document?.docstatus === 2
                  ? "Revoked"
                  : item?.reference_document?.custom_final_status
              }
            />
          </AllocatedToTooltip>
        </div>
        {/* Actions column — stop propagation so click doesn't open detail modal */}
        <div
          className="flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <MyApprovalActionPill
            isPending={doc?.custom_final_status === "Pending"}
            canEdit={canEdit}
            onEdit={() => handleEditClick(item)}
            canRevoke={canRevoke}
            // canRevoke={item?.custom_allow_revoke === 1 && !(item?.todo_status?.toLowerCase() === "cancelled" && item?.reference_document?.docstatus === 2)}
            revokeLoading={revokeEventMutation.isPending}
            onRevoke={() => handleRevokeClick(item)}
          />
        </div>
      </div>
    );
  };

  const MobileRow = ({ item }: any) => {
    const doc = item.reference_document;
    const { canEdit, canRevoke } = getActionFlags(item);

    return (
      <div
        className="cursor-pointer border-t-4 border-x border-b
        border-x-primary/20 border-b-primary/20
        shadow-sm border-primary bg-white rounded-xl mb-3"
      >
        <div className="p-4 flex flex-col gap-3 w-full">
          {/* Header */}
          <div className="flex items-start justify-between">
            {isDesktop ? (
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
                      : item?.reference_document?.custom_final_status
                  }
                />
              </AllocatedToTooltip>
            ) : (
              <>
                <MobileAllocatedTo
                  users={item?.allocated_to}
                  roles={item?.allocated_roles}
                  username={item?.username}
                  role={item?.role}
                  align="left"
                />
                <StatusBadge
                  status={
                    item?.custom_allow_revoke === 1 &&
                    item?.todo_status?.toLowerCase() === "cancelled" &&
                    item?.reference_document?.docstatus === 2
                      ? "Revoked"
                      : item?.reference_document?.custom_final_status
                  }
                />
              </>
            )}
          </div>

          {/* Amount & Department */}
          <div className="flex justify-between w-full">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">
                Advance Category
              </Typography>
              <Typography variant="mobileCardValue">
                {doc?.custom_advance_type}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Advance Amount</Typography>
              <Typography variant="mobileCardValue">
                {formatCurrency(doc?.advance_amount)}
              </Typography>
            </div>
          </div>

          {/* Company & Posting Date */}
          <div className="flex justify-between w-full">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Advance Policy</Typography>
              <Typography variant="mobileCardValue">
                {doc?.custom_advance_policy}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Posting Date</Typography>
              <Typography variant="mobileCardValue">
                {formatToIndianDate(doc?.posting_date)}
              </Typography>
            </div>
          </div>

          {/* Action Buttons — stop propagation to prevent opening detail modal */}
          {(canEdit || canRevoke) && (
            <div onClick={(e) => e.stopPropagation()}>
              <MyApprovalActionPill
                variant="buttons"
                isPending={doc?.custom_final_status === "Pending"}
                canEdit={canEdit}
                onEdit={() => handleEditClick(item)}
                canRevoke={canRevoke}
                revokeLoading={revokeEventMutation.isPending}
                onRevoke={() => handleRevokeClick(item)}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const RowWrapper = ({ item }: any) => {
    const doc = item.reference_document;
    const id = doc.name;
    const stages = item.approval_stages_status || [];

    const status =
      item?.custom_allow_revoke === 1 &&
      item?.todo_status?.toLowerCase() === "cancelled" &&
      item?.reference_document?.docstatus === 2
        ? "Revoked"
        : item?.reference_document?.custom_final_status;

    return (
      <div
        onClick={() => openDetailModal(id, stages, status)}
        className="cursor-pointer"
      >
        {isDesktop ? <DesktopRow item={item} /> : <MobileRow item={item} />}
      </div>
    );
  };

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status;
      const messages: Record<string, { title: string; description: string }> = {
        Pending: {
          title: "No Pending Advances",
          description: "You have no pending advance expense requests.",
        },
        Approved: {
          title: "No Approved Advances",
          description: "You have no approved advance requests.",
        },
        Rejected: {
          title: "No Rejected Advances",
          description: "You have no rejected advance requests.",
        },
      };

      return (
        messages[status] || {
          title: "No Advance Requests",
          description: "No advance requests match your filters.",
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
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">My Advance Expenses</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your advance expense requests
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={[
            "Advance ID",
            "Advance Category",
            "Advance Policy",
            "Posting Date",
            "Advance Amount",
            "Status",
            "ACTIONS",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]}
        >
          <DataListView
            queryKey={["employee-advance"]}
            customAPI={{
              method: "cn_leave_shift_managment.api.get_open_approval_todos",
              params: {
                doctype: "Employee Advance",
                employee: currentEmployee?.name,
              },
            }}
            defaultFilters={{
              custom_type: "Reimbursement / Expense Advance",
            }}
            SkeletonComponent={CardSkeleton}
            ItemComponent={RowWrapper}
            isSearch={true}
            isFilter={true}
            filterFields={[
              {
                fieldname: "custom_final_status",
                label: "Status",
                fieldtype: "Select",
                options: [
                  {
                    label: "Pending",
                    key: "Pending",
                    value: "Pending",
                    customAPIParams: { todo_status: "Open" },
                  },
                  {
                    label: "Approved",
                    key: "Approved",
                    value: "Approved",
                  },
                  {
                    label: "Rejected",
                    key: "Rejected",
                    value: "Rejected",
                  },
                ],
                emptyValueConfig: {
                  filterValue: ["!=", "Cancelled"],
                },
              },
            ]}
            orderBy="posting_date desc"
            noRecordsScreen={noRecordsScreen}
            refetchTrigger={refetchAttendance}
            onRefetchComplete={() => setRefetchAttendance(false)}
            showRefreshButton={false}
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
          />
        </CardTable>
      </div>

      {documentIdToOpen && (
        <AdvanceDetailModal
          id={documentIdToOpen}
          onClose={closeDetailModal}
          selectedStages={selectedStages}
          status={selectedAdvance?.status}
        />
      )}
    </div>
  );
};

export default MyAdvanceExpenseList;
