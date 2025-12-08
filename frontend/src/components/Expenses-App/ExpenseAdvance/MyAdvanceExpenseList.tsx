import CardTable from "../../shared/CardTable";
import { useState } from "react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { formatCurrency } from "../../../utils/currencyFormatter";
import AdvanceDetailModal from "./AdvanceDetailModal";
import CustomDropdown from "../../shared/CustomDropdown";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import DataListView from "../../DataListView";
import { ApprovalStage } from "../../../types/expenseAdvance";
import Tooltip from "../../shared/Tooltip";
import Badge from "../../shared/Badge";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const MyAdvanceExpenseList = () => {
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(
    null
  );
  const [selectedStages, setSelectedStages] = useState<ApprovalStage[]>([]);

  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployee();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchAttendance(true);
  };

  const openDetailModal = (id: string, stages: ApprovalStage[]) => {
    setSelectedStages(stages);
    setTimeout(() => setSelectedAdvanceId(id), 0);
  };

  const closeDetailModal = () => {
    setSelectedAdvanceId(null);
    setSelectedStages([]);
  };

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedStatus}
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
      />
    </div>
  );

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
        className="grid gap-4 px-6 py-3 border-b border-gray-100 text-sm text-gray-700 items-center"
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
      >
        <span>{doc.employee_name}</span>
        <span>{formatToIndianDate(doc.posting_date)}</span>
        <span>{doc.company}</span>
        <span>{doc.department}</span>
        <span>{formatCurrency(doc.advance_amount)}</span>
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
    );
  };

  const MobileRow = ({ item }: any) => {
    const doc = item.reference_document;
    const status = getStatus(item?.reference_document?.status);

    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-3">
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

        <p className="text-sm text-gray-600">
          <span className="font-medium">Employee:</span> {doc.employee_name}
        </p>

        <p className="text-sm text-gray-600">
          <span className="font-medium">Date:</span>{" "}
          {formatToIndianDate(doc.posting_date)}
        </p>

        <p className="text-sm text-gray-600">
          <span className="font-medium">Company:</span> {doc.company}
        </p>

        <p className="text-sm text-gray-600">
          <span className="font-medium">Department:</span> {doc.department}
        </p>
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

  return (
    <div
      className="relative flex size-full flex-col md:p-6"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="flex justify-between items-center mb-2 border-b border-gray-200">
        <h2 className="base-title md:module-title font-semibold text-gray-800 pb-1">
          My Advance Expenses
        </h2>

        <div className="flex items-center space-x-3 pb-1">
          <FilterDropdowns />
        </div>
      </div>
      <div className=" rounded-lg bg-white h-full px-0 md:pt-2 pt-0 mb-20">
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
            queryKey={["employee-advance", selectedStatus]}
            customAPI={{
              method: "cn_leave_shift_managment.api.get_open_approval_todos",
              params: {
                doctype: "Employee Advance",
                employee: currentEmployee?.name,
                status: selectedStatus,
              },
            }}
            defaultFilters={{
              custom_type: "Reimbursement / Expense Advance",
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
            refetchTrigger={refetchAttendance}
            onRefetchComplete={() => setRefetchAttendance(false)}
            isSearch={false}
            isFilter={false}
            showRefreshButton={false}
            orderBy="creation desc"
            pageSize={10}
            infiniteScroll={true}
            showPagination={true}
            loadMorePagination={false}
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
