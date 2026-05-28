import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { isActionEnabled } from "../../../utils/uiPermission";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import CreateLoanDialog from "./component/CreateLoanDailog";
import { LoantItem } from "./component/ListViewOfLoanForMobile";
import { LoanRow } from "./component/LoanListView";
import DataListView from "../../DataListView";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { Loan } from "./Type/loan";
import { createPortal } from "react-dom";
import { useGlobalStore } from "../../../hooks/useGlobalStore";

const titles = [
  "",
  "Loan Name",
  "Assigned To",
  "Loan Type",
  "Loan Amount",
  "Rate of Interest",
  "Standard Interest",
  "Created At",
  "EMI Type",
  "Tenure",
  "Start Date",
  "End Month",
  "Status",
  "Actions",
];

const columnWidths = [
  "0.1rem",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
];

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: false,
  },
  {
    sortable: true,
    field: "name",
    getValue: (item: Loan) => item.loan_name ?? "",
  },
  {
    sortable: true,
    field: "loan_product",
    getValue: (item: Loan) => item?.loan_type ?? "",
  },
  {
    sortable: true,
    field: "loan_amount",
    getValue: (item: Loan) => item?.loan_requested_amount ?? "",
  },
  {
    sortable: false,
  },
  {
    sortable: false,
  },
  {
    sortable: false,
  },
  {
    sortable: true,
    field: "repayment_periods",
    getValue: (item: Loan) => item.loan_tenure ?? 0,
  },
  {
    sortable: true,
    field: "custom_repayment_start_date",
    getValue: (item: Loan) => item.loan_start_date ?? 0,
  },
  {
    sortable: false,
  },
  {
    sortable: false,
  },
];

export default function LoansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();
  const { data: user, isFetching: userLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = user?.employee ?? "";
  const [loanId, setLoanId] = useState<string | null>(null);
  const handleEdit = (docname: string) => {
    setLoanId(docname);
    setIsDialogOpen(true);
  };

  // UI Permission check
  const { data: uiPermission } = useGetUiPermission("Compensation");
  const canCreateLoan = isActionEnabled(
    uiPermission,
    "create_loan",
    "My Loan Requests",
  );

  // Register action button in central SalarySlipApp
  const { setActionButtonConfig, setIsModalOpen } = useOutletContext<{
    setActionButtonConfig: (
      config: { label: string; onClick: () => void; disabled?: boolean } | null,
    ) => void;
    setIsModalOpen: (open: boolean) => void;
  }>();

  const navigate = useNavigate();
  const handleGoToLoanDetails = (loan_application: string) => {
    navigate(`/webapp/salary-slip-app/loan/${loan_application}`);
  };

  useEffect(() => {
    if (canCreateLoan) {
      setActionButtonConfig({
        label: "+ Request Loan",
        onClick: () => {
          setIsDialogOpen(true);
          setIsModalOpen(true);
        },
      });
    } else {
      setActionButtonConfig(null);
    }
    return () => setActionButtonConfig(null);
  }, [setActionButtonConfig, setIsModalOpen, canCreateLoan]);

  return (
    <>
      <div className="flex flex-col h-full bg-app font-brand">
        {/* ── Top bar ──────────────────────────────────────────────────────────── */}
        <div className="bg-white border-b mb-6 border-gray-100 sticky top-0 z-10 w-full">
          {/* Desktop top bar (hidden on mobile) */}
          {isDesktop && (
            <div className="sm:flex items-center justify-between h-[52px] px-7">
              <span className="font-bold text-[17px] text-text-title tracking-tight">My Loan Requests</span>
              <div className="flex items-center gap-3.5">
                {/* No other buttons inside header */}
              </div>
            </div>
          )}

          {/* Mobile top bar (hidden on sm+) */}
          {!isDesktop && (
            <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[16px] text-text-title tracking-tight">My Loan Requests</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto md:px-4 pb-10 md:pb-20">
          <div className="max-w-screen">
            <CardTable
              titles={titles}
              columnWidths={columnWidths}
              columnSortConfig={COLUMN_SORT_CONFIG}
            >
              <DataListView
                queryKey={["loan-requests", employeeId]}
                customAPI={{
                  method:
                    "cn_indian_payroll.cn_indian_payroll.overrides.loan_dashboard.print_loan_dashboard",
                  params: {
                    employee: employeeId,
                  },
                }}
                ItemComponent={(props: { item: Loan }) => {
                  if (
                    !props?.item?.todo_list ||
                    props?.item?.todo_list?.length === 0
                  ) {
                    return null;
                  }
                  return isDesktop ? (
                    <LoanRow
                      loan={props?.item}
                      handleEdit={handleEdit}
                      employeeId={employeeId}
                      columnWidths={columnWidths}
                    />
                  ) : (
                    <LoantItem
                      item={props?.item}
                      handleEdit={handleEdit}
                      onClick={() =>
                        handleGoToLoanDetails(props?.item.loan_name)
                      }
                    />
                  );
                }}
                SkeletonComponent={CardSkeleton}
                refetchTrigger={refetchAttendance}
                onRefetchComplete={() => setRefetchAttendance(false)}
                onItemClick={(data) => {
                  console.log(data);
                }}
                isSearch={true}
                isFilter={true}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: [
                      {
                        label: "Pending",
                        key: "Open",
                        value: "Open",
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
                ]}
                pageSize={10}
                isLoading={userLoading}
                showRefreshButton={false}
                infiniteScroll={false}
                loadMorePagination={false}
                showPagination={true}
              />
            </CardTable>
          </div>
        </div>
      </div>

      {isDialogOpen &&
        createPortal(
          <CreateLoanDialog
            loanId={loanId}
            isOpen={isDialogOpen}
            onClose={() => {
              setIsDialogOpen(false);
              setLoanId(null);
              setIsModalOpen(false);
            }}
          />,
          document.body,
        )}
    </>
  );
}