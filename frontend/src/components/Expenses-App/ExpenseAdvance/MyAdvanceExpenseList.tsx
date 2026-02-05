/* eslint-disable @typescript-eslint/no-explicit-any */
import CardTable from "../../shared/CardTable";
import { useState } from "react";
import { formatCurrency } from "../../../utils/currencyFormatter";
import AdvanceDetailModal from "./AdvanceDetailModal";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import DataListView from "../../DataListView";
import { ApprovalStage } from "../../../types/expenseAdvance";
import Tooltip from "../../shared/Tooltip";
import Badge from "../../shared/Badge";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Link } from "react-router-dom";
import StatusBadge from "../../shared/atoms/statusBadge";
import { FileText } from "lucide-react";

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

  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();
    if (status === "draft")
      return { label: "Pending", statusColor: "bg-yellow-100 text-yellow-800" };
    if (status === "approved")
      return { label: "Approved", statusColor: "bg-green-100 text-green-800" };
    if (status === "cancelled")
      return { label: "Cancelled", statusColor: "bg-red-100 text-red-800" };
    return {
      label: rawStatus || "Unknown",
      statusColor: "bg-gray-100 text-gray-800",
    };
  };

  const DesktopRow = ({ item }: any) => {
    const doc = item.reference_document;
    const status = getStatus(item?.reference_document?.status);

    return (
      <div
        className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
      >
        <Link
          to={`/webapp/employee-profile?target_user=${doc?.employee}`}
          target="_blank"
        >
          <Typography
            variant="bodySmall"
            className="font-medium text-center truncate"
          >
            <WrapperHoverCard employeeId={doc.employee}>
              {doc.employee_name}
            </WrapperHoverCard>
          </Typography>
        </Link>
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(doc.posting_date)}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {doc.company}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {doc.department}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatCurrency(doc.advance_amount)}
        </Typography>
        <div className="flex items-center justify-center">
          <Tooltip
            content={
              status?.label === "Pending"
                ? `Allocated to : ${item?.allocated_to}`
                : ""
            }
          >
            {/* <Badge
              size="md"
              backgroundColor={status?.statusColor}
              label={status?.label || ""}
            /> */}
            <StatusBadge status={item?.reference_document?.status} />
          </Tooltip>
        </div>
      </div>
    );
  };

  const MobileRow = ({ item }: any) => {
    const doc = item.reference_document;
    const status = getStatus(item?.reference_document?.status);

    return (
      <div className=" rounded-2xl shadow-sm p-4 border-t-4 border-primary mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {formatCurrency(doc.advance_amount)}
          </h3>
          <div className="flex justify-start">
            <Tooltip
              content={status?.label === "Pending" ? item?.allocated_to : ""}
            >
              <Badge
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex  justify-between ">
            <Link
              to={`/webapp/employee-profile?target_user=${doc?.employee}`}
              target="_blank"
            >
              <div className="flex flex-col">
                <span className="card-subtitle-sm uppercase">Employee</span>
                <Typography
                  variant="body"
                  className="leading-[13px]  font-semibold"
                >
                  {doc.employee_name}
                </Typography>
              </div>
            </Link>

            <div className="flex flex-col mt-2">
              <span className="card-subtitle-sm uppercase text-right">
                Date
              </span>
              <Typography
                variant="body"
                className="leading-[13px]  font-semibold"
              >
                {formatToIndianDate(doc.posting_date)}
              </Typography>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex flex-col mt-2">
              <span className="card-subtitle-sm uppercase">Company</span>
              <Typography
                variant="body"
                className="leading-[13px]  font-semibold"
              >
                {doc.company}
              </Typography>
            </div>

            <div className="flex flex-col mt-2">
              <span className="card-subtitle-sm uppercase">Department</span>
              <Typography
                variant="body"
                className="leading-[13px]  font-semibold"
              >
                {doc.department}
              </Typography>
            </div>
          </div>
          <div>
            <div className="h-[1px] w-full bg-gray-100 my-3" />
            <Typography className="text-gray-300 text-sm mb-3">
              Last Updated on{" "}
              {formatToIndianDate(item?.reference_document?.modified)}
            </Typography>
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
          description: "You have no pending advance expense requests."
        },
        Approved: {
          title: "No Approved Advances",
          description: "You have no approved advance requests."
        },
        Rejected: {
          title: "No Rejected Advances",
          description: "You have no rejected advance requests."
        }
      };

      return messages[status] || {
        title: "No Advance Requests",
        description: "No advance requests match your filters."
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

  return (
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            {isDesktop ? (
              <Typography variant="h4">My Advance Expenses</Typography>
            ) : null}
            <Typography variant="bodySmall" color="body2">
              Track and manage your advance expense requests
            </Typography>
          </div>
        </div>
        <div className="px-4">
          <CardTable
            titles={[
              "Employee",
              "Posting Date",
              "Company",
              "Department",
              "Advance Amount",
              "Status",
            ]}
            columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]}
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
                status: "Pending",
              }}
              ItemComponent={RowWrapper}
              SkeletonComponent={() => (
                <div className="rounded-xl bg-gray-100 animate-pulse my-4">
                  <div className="px-4 py-2 flex justify-between">
                    <div>
                      <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-gray-300 rounded"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
                  </div>
                </div>
              )}
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
              noRecordsScreen={noRecordsScreen}
              refetchTrigger={refetchAttendance}
              onRefetchComplete={() => setRefetchAttendance(false)}
              showRefreshButton={false}
              orderBy="creation desc"
              pageSize={10}
              infiniteScroll={true}
              showPagination={true}
              loadMorePagination={false}
            />
          </CardTable>
        </div>
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
