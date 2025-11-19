import CardTable from "../../shared/CardTable";
import { StatusBadge } from "../../SalarySlip/Advances/StatusBadge";
import { useState } from "react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { formatCurrency } from "../../../utils/currencyFormatter";
import FrappeListView from "../../ListView";
import AdvanceDetailModal from "./AdvanceDetailModal";
import CustomDropdown from "../../shared/CustomDropdown";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const AdvanceExpenseList = () => {
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(
    null
  );
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployee();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
  };
  const openDetailModal = (id: string) => setSelectedAdvanceId(id);
  const closeDetailModal = () => setSelectedAdvanceId(null);

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedStatus}
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
      />
    </div>
  );

  const DesktopRow = ({ item }: any) => (
    <div
      className="grid gap-4 px-6 py-3 border-b border-gray-100 text-sm text-gray-700 items-center"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
    >
      <span>{item.employee_name}</span>
      <span>{formatToIndianDate(item.posting_date)}</span>
      <span>{item.company}</span>
      <span>{item.department}</span>
      <span>{formatCurrency(item.advance_amount)}</span>

      <div className="flex justify-start">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );

  const MobileRow = ({ item }: any) => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {formatCurrency(item.advance_amount)}
        </h3>
        <StatusBadge status={item.status} />
      </div>

      <p className="text-sm text-gray-600">
        <span className="font-medium">Employee:</span> {item.employee_name}
      </p>

      <p className="text-sm text-gray-600">
        <span className="font-medium">Date:</span>{" "}
        {formatToIndianDate(item.posting_date)}
      </p>

      <p className="text-sm text-gray-600">
        <span className="font-medium">Company:</span> {item.company}
      </p>

      <p className="text-sm text-gray-600">
        <span className="font-medium">Department:</span> {item.department}
      </p>
    </div>
  );

  const RowComponent = isDesktop ? DesktopRow : MobileRow;

  return (
    <div
      className="relative flex size-full flex-col md:p-6"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="flex justify-between items-center mb-2 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 pb-1">
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
          <FrappeListView
            doctype="Employee Advance"
            ItemComponent={RowComponent}
            onItemClick={(item) => openDetailModal(item.name)}
            isSearch={false}
            defaultFilters={{
              employee: currentEmployee?.name || "",
              custom_type: "Reimbursement / Expense Advance",
              ...(selectedStatus ? { status: selectedStatus } : {}),
            }}
            defaultFields={[
              "name",
              "employee_name",
              "posting_date",
              "company",
              "department",
              "advance_amount",
              "paid_amount",
              "pending_amount",
              "status",
            ]}
            pageSize={10}
            orderBy="creation desc"
            showPagination={true}
            infiniteScroll={true}
            refetchTrigger={refetchAttendance}
            onRefetchComplete={() => setRefetchAttendance(false)}
          />
        </CardTable>
      </div>

      {selectedAdvanceId && (
        <AdvanceDetailModal id={selectedAdvanceId} onClose={closeDetailModal} />
      )}
    </div>
  );
};

export default AdvanceExpenseList;
