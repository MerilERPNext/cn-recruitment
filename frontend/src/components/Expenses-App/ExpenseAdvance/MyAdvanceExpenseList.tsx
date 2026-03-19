/* eslint-disable @typescript-eslint/no-explicit-any */
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { useState } from "react";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { ApprovalStage } from "../../../types/expenseAdvance";
import { formatCurrency } from "../../../utils/currencyFormatter";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import DataListView from "../../DataListView";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceDetailModal from "./AdvanceDetailModal";

const MyAdvanceExpenseList = () => {
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(
    null,
  );
  const [selectedStages, setSelectedStages] = useState<ApprovalStage[]>([]);

  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployee();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const openDetailModal = (id: string, stages: ApprovalStage[]) => {
    setSelectedStages(stages);
    setTimeout(() => setSelectedAdvanceId(id), 0);
  };

  const closeDetailModal = () => {
    setSelectedAdvanceId(null);
    setSelectedStages([]);
  };

  const DesktopRow = ({ item }: any) => {
    const doc = item.reference_document;

    return (
      <div
        className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}
      >

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
            users={
              item?.reference_document?.status === "Draft"
                ? item?.allocated_to
                : undefined
            }
            roles={
              item?.reference_document?.status === "Draft"
                ? item?.allocated_roles
                : undefined
            }
            position="left"
          >
            <StatusBadge status={item?.reference_document?.status} />
          </AllocatedToTooltip>
        </div>
      </div>
    );
  };

  const MobileRow = ({ item }: any) => {
    const doc = item.reference_document;

    return (
      <div
        className="cursor-pointer border-t-4 border-x border-b
        border-x-primary/20 border-b-primary/20
        shadow-sm border-primary bg-white rounded-xl mb-3"
      >
        <div className="p-4 flex flex-col gap-3 w-full">
          {/* Header */}
          <div className="flex items-start justify-between">
            <MobileAllocatedTo
              users={item?.username ? [item.username] : []}
              roles={item?.allocated_roles}
              username={item?.username}
              allocated_to={item?.allocated_to}
              hasPendingStatus={doc?.status === "Draft"}
            />
            <AllocatedToTooltip
              users={doc?.status === "Draft" ? item?.allocated_to : undefined}
              roles={
                doc?.status === "Draft" ? item?.allocated_roles : undefined
              }
              position="left"
            >
              <StatusBadge status={doc?.status} />
            </AllocatedToTooltip>
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
        </div>
      </div>
    );
  };

  const RowWrapper = ({ item }: any) => {
    const doc = item.reference_document;
    const id = doc.name;
    const stages = item.approval_stages_status || [];

    return (
      <div
        onClick={() => openDetailModal(id, stages)}
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

    return (
      <NoDataFound title={message.title} subtitle={message.description} />
    );
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
            "Advance Category",
            "Advance Policy",
            "Posting Date",
            "Advance Amount",
            "Status",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr"]}
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
              status: ["!=", "Cancelled"],
            }}
            SkeletonComponent={CardSkeleton}
            ItemComponent={RowWrapper}
            isSearch={true}
            isFilter={true}
            filterFields={[
              {
                fieldname: "status",
                label: "Status",
                fieldtype: "Select",
                options: ["Pending", "Approved", "Rejected"],
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

      {selectedAdvanceId && (
        <AdvanceDetailModal
          id={selectedAdvanceId}
          onClose={closeDetailModal}
          selectedStages={selectedStages}
        />
      )}
    </div>
  );
};

export default MyAdvanceExpenseList;
