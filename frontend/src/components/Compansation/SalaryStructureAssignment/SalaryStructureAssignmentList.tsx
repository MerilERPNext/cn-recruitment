import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { Typography } from "../../shared/atoms/Typography";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import DataListView from "../../DataListView";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import SalaryStructureAssignmentForm from "./SalaryStructureAssignmentForm";
import FrappeAPI from "../../../utils/frappeAPI";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import type { FetchParams } from "../../../services/customApiService";
import type { FrappePageResponse, FilterCondition } from "../../../types/frappe";
import type { SalaryStructureAssignmentRow } from "../../../services/salaryStructureAssignment";

const DOCTYPE = "Salary Structure Assignment";

const titles = [
  "Assignment",
  "Employee",
  "Salary Structure",
  "Payroll Period",
  "From Date",
  "Base",
  "Status",
];

const columnWidths = ["1.3fr", "1.4fr", "1.5fr", "1fr", "1fr", "1fr", "1fr"];
const gridCols = columnWidths.join(" ");

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  { sortable: true, field: "name", getValue: (i: SalaryStructureAssignmentRow) => i.name ?? "" },
  {
    sortable: true,
    field: "employee_name",
    getValue: (i: SalaryStructureAssignmentRow) => i.employee_name ?? i.employee ?? "",
  },
  {
    sortable: true,
    field: "salary_structure",
    getValue: (i: SalaryStructureAssignmentRow) => i.salary_structure ?? "",
  },
  {
    sortable: true,
    field: "custom_payroll_period",
    getValue: (i: SalaryStructureAssignmentRow) => i.custom_payroll_period ?? "",
  },
  { sortable: true, field: "from_date", getValue: (i: SalaryStructureAssignmentRow) => i.from_date ?? "" },
  { sortable: true, field: "base", getValue: (i: SalaryStructureAssignmentRow) => i.base ?? 0 },
  { sortable: true, field: "docstatus", getValue: (i: SalaryStructureAssignmentRow) => i.docstatus ?? 0 },
];

const FIELDS = [
  "name",
  "employee",
  "employee_name",
  "salary_structure",
  "from_date",
  "custom_payroll_period",
  "base",
  "currency",
  "company",
  "docstatus",
];

const statusLabel = (docstatus?: number) =>
  docstatus === 1 ? "Submitted" : docstatus === 2 ? "Cancelled" : "Draft";

const statusClass = (docstatus?: number) =>
  docstatus === 1
    ? "bg-green-50 text-green-700"
    : docstatus === 2
      ? "bg-red-50 text-red-700"
      : "bg-yellow-50 text-yellow-700";

const fmtDate = (d?: string) => (d ? formatToIndianDate(d) : "—");

// Resource-API backed fetcher that returns DataListView's paginated shape, so
// search / status filter / sorting / pagination all work through the wrapper.
const fetchAssignments = async (
  params: FetchParams,
): Promise<FrappePageResponse> => {
  const pageSize = (params.pageSize as number) ?? 10;
  const start = (params.pageParam as number) ?? 0;
  const search = ((params.searchTerm as string) ?? "").trim();
  const statusVal = (params.filters as Record<string, unknown> | undefined)
    ?.docstatus;
  const hasStatus =
    statusVal !== undefined && statusVal !== null && statusVal !== "";

  const filters: FilterCondition[] = [];
  if (hasStatus) filters.push(["docstatus", "=", Number(statusVal)]);
  if (search) filters.push(["employee_name", "like", `%${search}%`]);

  const res = await FrappeAPI.getDocumentList(DOCTYPE, {
    fields: FIELDS,
    filters,
    orderBy: (params.orderBy as string) || "modified desc",
    limit: pageSize,
    limitStart: start,
  });
  const data = res.data as SalaryStructureAssignmentRow[];

  // Total count (same conditions) for page numbers.
  const countFilters: Record<string, unknown> = {};
  if (hasStatus) countFilters.docstatus = Number(statusVal);
  if (search) countFilters.employee_name = ["like", `%${search}%`];
  const totalCount = await FrappeAPI.getDocumentCount(DOCTYPE, countFilters);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = start + data.length < totalCount;

  return {
    data: data as unknown as FrappePageResponse["data"],
    totalCount,
    hasNextPage,
    nextCursor: hasNextPage ? start + pageSize : undefined,
    pages: Array.from({ length: totalPages }, (_, i) => i + 1),
  };
};

const StatusBadge = ({ docstatus }: { docstatus?: number }) => (
  <span
    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(
      docstatus,
    )}`}
  >
    {statusLabel(docstatus)}
  </span>
);

const EmployeeName = ({ item }: { item: SalaryStructureAssignmentRow }) => (
  <WrapperHoverCard employeeId={item.employee}>
    <span className="cursor-pointer font-medium text-primary hover:underline">
      {item.employee_name || item.employee}
    </span>
  </WrapperHoverCard>
);

const DesktopRow = ({ item }: { item: SalaryStructureAssignmentRow }) => (
  <div
    className="grid items-center gap-4 px-6 h-14 border-b border-gray-50 hover:bg-primary/10"
    style={{ gridTemplateColumns: gridCols }}
  >
    <Typography variant="bodySmall" className="truncate text-center font-medium">
      {item.name}
    </Typography>
    <div className="flex justify-center">
      <EmployeeName item={item} />
    </div>
    <Typography variant="bodySmall" className="truncate text-center">
      {item.salary_structure}
    </Typography>
    <Typography variant="bodySmall" className="text-center">
      {item.custom_payroll_period || "—"}
    </Typography>
    <Typography variant="bodySmall" className="text-center">
      {fmtDate(item.from_date)}
    </Typography>
    <Typography variant="bodySmall" className="text-center">
      {item.base != null ? item.base : "—"}
    </Typography>
    <div className="flex justify-center">
      <StatusBadge docstatus={item.docstatus} />
    </div>
  </div>
);

const MobileCard = ({ item }: { item: SalaryStructureAssignmentRow }) => (
  <div className="mx-3 mb-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <Typography variant="bodyMedium" className="font-semibold">
        {item.name}
      </Typography>
      <StatusBadge docstatus={item.docstatus} />
    </div>
    <div className="mt-2 space-y-1 text-sm text-gray-600">
      <div>
        <EmployeeName item={item} />
      </div>
      <p>Structure: {item.salary_structure}</p>
      <p>Period: {item.custom_payroll_period || "—"}</p>
      <p>From: {fmtDate(item.from_date)}</p>
      {item.base != null && <p>Base: {item.base}</p>}
    </div>
  </div>
);

const Row = ({ item }: { item: SalaryStructureAssignmentRow }) => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? <DesktopRow item={item} /> : <MobileCard item={item} />;
};

export default function SalaryStructureAssignmentList() {
  const { isDesktop } = useScreenSize();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { setActionButtonConfig, setIsModalOpen } = useOutletContext<{
    setActionButtonConfig: (
      config: { label: string; onClick: () => void; disabled?: boolean } | null,
    ) => void;
    setIsModalOpen: (open: boolean) => void;
  }>();

  useEffect(() => {
    setActionButtonConfig({
      label: "+ Add Salary Structure Assignment",
      onClick: () => {
        setIsFormOpen(true);
        setIsModalOpen(true);
      },
    });
    return () => setActionButtonConfig(null);
  }, [setActionButtonConfig, setIsModalOpen]);

  const list = (
    <DataListView<SalaryStructureAssignmentRow>
      queryKey={["salary-structure-assignments-list"]}
      fetchFunction={fetchAssignments}
      ItemComponent={Row}
      isSearch
      isFilter
      filterFields={[
        {
          fieldname: "docstatus",
          label: "Status",
          fieldtype: "Select",
          options: [
            { label: "Draft", value: "0" },
            { label: "Submitted", value: "1" },
            { label: "Cancelled", value: "2" },
          ],
        },
      ]}
      searchFields={["employee_name"]}
      pageSize={10}
      orderBy="modified desc"
      showPagination
      infiniteScroll={false}
      SkeletonComponent={CardSkeleton}
    />
  );

  return (
    <>
      <div className="flex flex-col h-full bg-app font-brand">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
          <div className="flex items-center justify-between h-[52px] px-4 md:px-7">
            <span className="font-bold text-[16px] md:text-[17px] text-text-title tracking-tight">
              Salary Structure Assignments
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto md:px-4 pb-20 pt-3 md:pt-4">
          {isDesktop ? (
            <CardTable
              titles={titles}
              columnWidths={columnWidths}
              columnSortConfig={COLUMN_SORT_CONFIG}
            >
              {list}
            </CardTable>
          ) : (
            list
          )}
        </div>
      </div>

      {isFormOpen &&
        createPortal(
          <SalaryStructureAssignmentForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setIsModalOpen(false);
            }}
          />,
          document.body,
        )}
    </>
  );
}
