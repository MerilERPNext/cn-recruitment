import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, Clock, Loader2, Pencil } from "lucide-react";
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
import { generateSalarySlip } from "../../../services/ctcservice";
import type { SalarySlip, SalaryComponent } from "../../../types/ctc";

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
  docstatus === 1 ? "Submitted" : docstatus === 2 ? "Cancelled" : "Pending ";

const statusClass = (docstatus?: number) =>
  docstatus === 1
    ? "bg-primary-400 text-white"
    : docstatus === 2
      ? "bg-red-50 text-red-700"
      : "bg-yellow-100 text-yellow-700";

const StatusIcon = ({ docstatus }: { docstatus?: number }) =>
  docstatus === 1 ? (
    <Check className="h-3.5 w-3.5" />
  ) : docstatus === 2 ? (
    <X className="h-3.5 w-3.5" />
  ) : (
    <Clock className="h-3.5 w-3.5" />
  );

const fmtDate = (d?: string) => (d ? formatToIndianDate(d) : "—");

const fmtMoney = (n?: number, currency = "INR") =>
  n != null
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(n)
    : "—";

// Full Salary Structure Assignment document (resource API returns every field).
type AssignmentDoc = SalaryStructureAssignmentRow & {
  variable?: number;
  income_tax_slab?: string;
};

interface AssignmentDetail {
  loading: boolean;
  error?: boolean;
  row: SalaryStructureAssignmentRow;
  doc?: AssignmentDoc;
  slip?: SalarySlip | null;
}

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
    className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ${statusClass(
      docstatus,
    )}`}
  >
    <StatusIcon docstatus={docstatus} />
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

const DesktopRow = ({
  item,
  onView,
}: {
  item: SalaryStructureAssignmentRow;
  onView: (item: SalaryStructureAssignmentRow) => void;
}) => (
  <div
    className="grid items-center gap-4 px-6 h-14 border-b border-gray-50 hover:bg-primary/10 cursor-pointer"
    style={{ gridTemplateColumns: gridCols }}
    onClick={() => onView(item)}
  >
    <Typography variant="bodySmall" className="truncate text-center font-medium">
      {item.name}
    </Typography>
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
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

const MobileCard = ({
  item,
  onView,
}: {
  item: SalaryStructureAssignmentRow;
  onView: (item: SalaryStructureAssignmentRow) => void;
}) => (
  <div
    className="mx-3 mb-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    onClick={() => onView(item)}
  >
    <div className="flex items-center justify-between">
      <Typography variant="bodyMedium" className="font-semibold">
        {item.name}
      </Typography>
      <StatusBadge docstatus={item.docstatus} />
    </div>
    <div className="mt-2 space-y-1 text-sm text-gray-600">
      <div onClick={(e) => e.stopPropagation()}>
        <EmployeeName item={item} />
      </div>
      <p>Structure: {item.salary_structure}</p>
      <p>Period: {item.custom_payroll_period || "—"}</p>
      <p>From: {fmtDate(item.from_date)}</p>
      {item.base != null && <p>Base: {item.base}</p>}
    </div>
  </div>
);

const Row = ({
  item,
  onView,
}: {
  item: SalaryStructureAssignmentRow;
  onView: (item: SalaryStructureAssignmentRow) => void;
}) => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? (
    <DesktopRow item={item} onView={onView} />
  ) : (
    <MobileCard item={item} onView={onView} />
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
      {label}
    </Typography>
    <Typography variant="bodySmall" className="font-semibold text-gray-900">
      {value ?? "—"}
    </Typography>
  </div>
);

const ComponentTable = ({
  rows,
  currency,
  amountClass,
}: {
  rows: SalaryComponent[];
  currency?: string;
  amountClass: string;
}) => {
  if (!rows || rows.length === 0) {
    return (
      <Typography variant="bodySmall" className="text-gray-500">
        None.
      </Typography>
    );
  }
  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
          <tr>
            <th className="px-4 py-2 text-left">Component</th>
            <th className="px-4 py-2 text-right">Monthly</th>
            <th className="px-4 py-2 text-right">Annual</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-150 text-gray-900">
          {rows.map((c, idx) => (
            <tr key={`${c.component}-${idx}`} className="hover:bg-gray-50/50">
              <td className="px-4 py-2 font-medium">{c.component}</td>
              <td className="px-4 py-2 text-right text-gray-900">
                {fmtMoney(c.amount, currency)}
              </td>
              <td className={`px-4 py-2 text-right font-semibold ${amountClass}`}>
                {fmtMoney(c.annual_amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AssignmentDetailDrawer = ({
  detail,
  isDesktop,
  onClose,
  onEdit,
}: {
  detail: AssignmentDetail;
  isDesktop: boolean;
  onClose: () => void;
  onEdit: (doc: AssignmentDoc) => void;
}) => {
  const { loading, error, row, doc, slip } = detail;
  const currency = doc?.currency || row.currency || "INR";
  // Only Draft (docstatus 0) assignments can be edited in Frappe.
  const isDraft = (doc?.docstatus ?? row.docstatus) === 0;

  const components: SalaryComponent[] = [
    ...(slip?.earning_part_of_ctc ?? []),
    ...(slip?.deduction_part_of_ctc ?? []),
  ];
  const earnings = components.filter((c: SalaryComponent) => c.type !== "Deduction");
  const deductions = components.filter((c: SalaryComponent) => c.type === "Deduction");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`bg-white flex flex-col w-full ${
          isDesktop ? "max-w-[600px]" : ""
        } shadow-lg relative h-screen z-10`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <Typography variant="subheading" color="body1" className="font-bold text-lg">
              {row.name}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500 text-xs">
              {row.employee_name || row.employee} — {row.salary_structure}
            </Typography>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl p-2"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading CTC details…
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-20 text-red-500">
              Unable to load CTC details.
            </div>
          ) : (
            <>
              {/* Overview */}
              <div className="grid grid-cols-2 gap-4 border border-gray-200 p-4 rounded-xl bg-gray-50/50">
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Status
                  </Typography>
                  <StatusBadge docstatus={doc?.docstatus ?? row.docstatus} />
                </div>
                <Field
                  label="Employee"
                  value={`${row.employee_name || ""} (${row.employee})`}
                />
                <Field label="Salary Structure" value={row.salary_structure} />
                <Field
                  label="Payroll Period"
                  value={doc?.custom_payroll_period || row.custom_payroll_period}
                />
                <Field label="From Date" value={fmtDate(doc?.from_date || row.from_date)} />
                <Field label="Income Tax Slab" value={doc?.income_tax_slab} />
                <Field label="Base" value={fmtMoney(doc?.base ?? row.base, currency)} />
                <Field label="Variable" value={fmtMoney(doc?.variable, currency)} />
                <Field label="Currency" value={currency} />
                <Field label="Company" value={doc?.company || row.company} />
              </div>

              {/* CTC Summary */}
              {slip && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Annual CTC</p>
                    <p className="font-bold text-blue-700">
                      {fmtMoney(slip.annual_ctc, currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Total Deductions</p>
                    <p className="font-bold text-red-700">
                      {fmtMoney(slip.total_deduction, currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Net Pay</p>
                    <p className="font-bold text-green-700">
                      {fmtMoney(
                        typeof slip.net_pay === "number"
                          ? slip.net_pay
                          : slip.net_pay?.[0]?.annual_amount,
                        currency
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Earnings */}
              <div className="space-y-2">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Earnings
                </Typography>
                <ComponentTable
                  rows={earnings}
                  currency={currency}
                  amountClass="text-green-700"
                />
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Deductions
                </Typography>
                <ComponentTable
                  rows={deductions}
                  currency={currency}
                  amountClass="text-red-700"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {!loading && !error && isDraft && doc && (
            <button
              onClick={() => onEdit(doc)}
              className="px-4 py-2 text-sm rounded-lg bg-primary-400 text-white font-medium hover:bg-primary-500 transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" /> Edit Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function SalaryStructureAssignmentList() {
  const { isDesktop } = useScreenSize();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<AssignmentDoc | null>(
    null,
  );
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);

  const { setActionButtonConfig, setIsModalOpen } = useOutletContext<{
    setActionButtonConfig: (
      config: { label: string; onClick: () => void; disabled?: boolean } | null,
    ) => void;
    setIsModalOpen: (open: boolean) => void;
  }>();

  // Open the side drawer and load the full assignment plus the employee's
  // computed salary slip, so every CTC component shows its actual amount
  // (not the raw Salary Structure formula).
  const openDetail = async (row: SalaryStructureAssignmentRow) => {
    setDetail({ loading: true, row });
    setIsModalOpen(true);
    try {
      const [doc, slip] = await Promise.all([
        FrappeAPI.getDocument(DOCTYPE, row.name) as Promise<AssignmentDoc>,
        row.employee
          ? generateSalarySlip(row.employee).catch(() => null)
          : Promise.resolve(null),
      ]);
      setDetail({ loading: false, row, doc, slip });
    } catch {
      setDetail({ loading: false, error: true, row });
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setIsModalOpen(false);
  };

  // Edit a draft assignment: close the detail drawer and open the form
  // pre-filled with the full document.
  const openEdit = (doc: AssignmentDoc) => {
    setDetail(null);
    setEditAssignment(doc);
    setIsFormOpen(true);
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditAssignment(null);
    setIsModalOpen(false);
  };

  const ItemComponent = useMemo(
    () =>
      ({ item }: { item: SalaryStructureAssignmentRow }) => (
        <Row item={item} onView={openDetail} />
      ),
    // openDetail is stable for the component lifetime (only uses setters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    setActionButtonConfig({
      label: "+ Add Salary Structure Assignment",
      onClick: () => {
        setEditAssignment(null);
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
      ItemComponent={ItemComponent}
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
            onClose={closeForm}
            assignment={editAssignment}
          />,
          document.body,
        )}

      {detail &&
        createPortal(
          <AssignmentDetailDrawer
            detail={detail}
            isDesktop={isDesktop}
            onClose={closeDetail}
            onEdit={openEdit}
          />,
          document.body,
        )}
    </>
  );
}
