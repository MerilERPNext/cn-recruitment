/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoreVertical } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { FaRegEye } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  useBenefitClaimPDF,
  useDownloadSalarySlipPDF,
  useOffCyclePaySlipPDF,
  usePayrollAdminRoles,
  useReleaseSalarySlip,
  useTDSPRintViewPDF,
} from "../../hooks/useSalaryDetails";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTaxSheetPayrollPriodsData } from "../../hooks/useTaxSheet";
import { useTargetEmployeeCompany } from "../../hooks/useTargetEmployeeCompany";
import { formatCurrency } from "../../utils/currency";
import formatToIndianDate from "../../utils/formatToIndianDate";
import DataListView from "../DataListView"; // ← replaced FrappeListView
import Button from "../shared/atoms/Button";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import CustomDropdown from "../shared/CustomDropdown";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import SalarySlipPDFModal from "./SalarySlipPDFModal";
import ShowHideButton from "./ui/ShowHideButton";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

// ---- Types ----
type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

type SalarySlipRecord = {
  name: string;
  employee: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  net_pay: number;
  status: string;
  posting_date: string;
  custom_month?: string;
  salary_slip_type?: string;
  [key: string]: any;
};

// Map the raw slip status to the badge shown in the list:
// draft/pending → "Pending" (yellow), submitted/released → "Approved" (green).
const getDisplayStatus = (status?: string): string => {
  const s = status?.toLowerCase().trim();
  if (s === "draft" || s === "pending") return "pending";
  if (s === "submitted" || s === "released" || s === "paid" || s === "approved")
    return "approved";
  return status || "";
};

const SALARY_SLIP_SEARCH_FIELDS = ["employee", "status", "posting_date"];
const SALARY_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: false,
  },
  {
    sortable: true,
    type: "string",
    field: "custom_month",
    getValue: (item: any) => item.custom_month ?? "",
  },
  {
    sortable: true,
    type: "string",
    field: "salary_slip_type",
    getValue: (item: any) => item.salary_slip_type ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "start_date",
    getValue: (item: any) => item.start_date ?? "",
  },

  {
    sortable: true,
    type: "date",
    field: "end_date",
    getValue: (item: any) => item.end_date ?? "",
  },
  {
    sortable: true,
    type: "number",
    field: "gross_pay",
    getValue: (item: any) => item.gross_pay ?? 0,
  },
  {
    sortable: true,
    type: "number",
    field: "net_pay",
    getValue: (item: any) => item.net_pay ?? 0,
  },
  {
    sortable: false,
  },
  {
    sortable: false,
  },
];

// ---- Main Component ----
const SalarySlipsList = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: currentUser } = useCurrentUser();

  // When viewing another employee (switch user), the salary-slip payload must
  // carry the TARGET user's company, not the logged-in user's.
  const { targetCompany } = useTargetEmployeeCompany();
  const effectiveCompany = targetEmployeeId ? targetCompany : user?.company;

  // Payroll admins (who can also release draft salary slips). The allowed roles
  // are configured in Payroll Settings and fetched via API. Plain employees
  // only ever see submitted slips.
  const { data: payrollAdminRoles = [] } = usePayrollAdminRoles(user?.employee);
  // A payroll admin holds the "Payroll Admin" role OR any role configured in
  // Payroll Settings. The role fallback ensures admins are detected even when
  // the Payroll Settings list is empty (otherwise everyone is treated as a
  // plain employee — drafts hidden and no Release button).
  const isPayrollAdmin =
    currentUser?.roles?.some((r) =>
      ["Payroll Admin", ...payrollAdminRoles].includes(r.role),
    ) ?? false;

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [maskSalary, setMaskSalary] = useState(true);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [modalHtmlContent, setModalHtmlContent] = useState<string>("");

  const [selectedSalarySlip, setSelectedSalarySlip] = useState<{
    salary_slip_id: string;
    date: string;
  } | null>(null);

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company || null,
  ) as {
    data: PayrollPeriod[] | undefined;
  };

  // ✅ Auto select current payroll period
  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;

    const today = new Date();

    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      return today >= start && today <= end;
    });

    setSelectedPeriod(matchedPeriod?.name || payrollPeriods[0].name);
  }, [payrollPeriods, selectedPeriod]);


  // ---------------- PDF HOOKS ----------------
  const { mutate: downloadType1 } = useDownloadSalarySlipPDF({
    onSuccess: (data) => {
      const html = data.response;
      if (html) {
        setModalHtmlContent(html);
        setPdfModalOpen(true);
      } else alert("No HTML found for Regular Payslip!");
    },
  });

  const { mutate: downloadType2, isPending: isDownloading2 } =
    useTDSPRintViewPDF({
      onSuccess: (data) => {
        const html = data.response;
        if (html) {
          setModalHtmlContent(html);
          setPdfModalOpen(true);
        } else alert("No HTML found for TDS Sheet!");
      },
    });

  const { mutate: downloadType3, isPending: isDownloading3 } =
    useBenefitClaimPDF({
      onSuccess: (data) => {
        const html = data.response;
        if (html) {
          setModalHtmlContent(html);
          setPdfModalOpen(true);
        } else alert("No HTML found for Benefit Payslip!");
      },
    });

  const { mutate: downloadType4, isPending: isDownloading4 } =
    useOffCyclePaySlipPDF({
      onSuccess: (data) => {
        const html = data.response;
        if (html) {
          setModalHtmlContent(html);
          setPdfModalOpen(true);
        } else alert("No HTML found for Off Cycle Payslip!");
      },
    });

  const isDownloading = isDownloading2 || isDownloading3 || isDownloading4;

  // ---------------- RELEASE (submit draft) ----------------
  const { mutate: releaseSlip, isPending: isReleasing } = useReleaseSalarySlip({
    onSuccess: () => {
      // Refresh the list so the released slip moves from Draft to Paid
      setFiltersKey((prev) => prev + 1);
    },
    onError: (error: any) => {
      // Surface the real Frappe validation message (from `_server_messages`),
      // e.g. "Please assign a Salary Structure for Employee Archana Kumari…"
      // instead of the generic "Request failed with status code 417".
      toast.error(
        errorResponseFormater(
          error,
          "Failed to release salary slip. Please try again.",
        ),
      );
    },
  });

  const handleReleaseSalarySlip = (e: React.MouseEvent, salary_slip_id: string) => {
    e.stopPropagation();
    if (toast.success("Release this salary slip?")) {
      releaseSlip(salary_slip_id);
    }
  };

  const handleGoToSalarySlip = (salaryId: string, startDate?: string) => {
    if (isDesktop) {
      setSelectedSalarySlip({
        salary_slip_id: salaryId,
        date: startDate ? formatToIndianDate(startDate) : "",
      });
      setPdfModalOpen(true);
    } else {
      const encodedId = encodeURIComponent(salaryId);
      navigate(`/webapp/salary-slip-app/salary-slip-list/${encodedId}`);
    }
  };

  const handleViewPDF = (
    type: "regular" | "tds" | "benefit" | "offcycle",
    salary_slip_id: string,
    salaryDate?: string,
  ) => {
    setModalHtmlContent("");
    setSelectedSalarySlip({
      salary_slip_id: salary_slip_id,
      date: salaryDate || "",
    });

    switch (type) {
      case "regular":
        downloadType1(salary_slip_id);
        break;
      case "tds":
        downloadType2(salary_slip_id);
        break;
      case "benefit":
        downloadType3(salary_slip_id);
        break;
      case "offcycle":
        downloadType4(salary_slip_id);
        break;
    }
  };

  const handleDownloadType1 = (e: React.MouseEvent, salary_slip_id: string) => {
    e.stopPropagation();
    handleViewPDF("regular", salary_slip_id);
  };
  const handleDownloadType2 = (e: React.MouseEvent, salary_slip_id: string) => {
    e.stopPropagation();
    handleViewPDF("tds", salary_slip_id);
  };
  const handleDownloadType3 = (e: React.MouseEvent, salary_slip_id: string) => {
    e.stopPropagation();
    handleViewPDF("benefit", salary_slip_id);
  };
  const handleDownloadType4 = (e: React.MouseEvent, salary_slip_id: string) => {
    e.stopPropagation();
    handleViewPDF("offcycle", salary_slip_id);
  };


  return (
    <div className="flex flex-col h-full bg-app font-brand">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7">
            <span className="font-bold text-[17px] text-text-title tracking-tight">Salary Slip</span>
            <div className="flex items-center gap-3.5">
              <ShowHideButton
                showAmount={maskSalary}
                onToggleAmount={() => setMaskSalary((prev) => !prev)}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-text-body2">Payroll Period</span>
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSelectedPeriod(e.target.value)
                  }
                  options={
                    payrollPeriods?.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })) || []
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">Salary Slip</span>
              <div className="flex items-center gap-2">
                <ShowHideButton
                  showAmount={maskSalary}
                  onToggleAmount={() => setMaskSalary((prev) => !prev)}
                />
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSelectedPeriod(e.target.value)
                  }
                  options={
                    payrollPeriods?.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })) || []
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pt-3 md:pt-4 pb-5 md:pb-20">
        <CardTable
          titles={[
            "Employee",
            "Salary Month",
            "Type",
            "Start Date",
            "End Date",
            "Gross Pay",
            "Net Pay",
            "Status",
            "Actions",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]}
          columnSortConfig={SALARY_SORT_CONFIG}
        >

          {!selectedPeriod ? (
            <div className="flex items-center justify-center py-10 text-sm text-text-body2">
              Select a payroll period to view salary slips.
            </div>
          ) : (
            <DataListView<SalarySlipRecord>
              key={filtersKey}
              queryKey={[
                "salary-slips",
                selectedPeriod,
                targetEmployeeId || user?.employee || "",
                effectiveCompany || "",
                String(filtersKey),
              ]}
              customAPI={{
                method: "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_slip_list.salary_slip_list_admin_view",
                params: {
                  doctype: "Salary Slip",
                  employee: targetEmployeeId || user?.employee,
                  company: effectiveCompany,
                  payroll_period: selectedPeriod,
                },
              }}
              defaultFilters={{
                status: "Submitted",
              }}

              ItemComponent={({ item }) => {
                // Employees only see released slips; payroll admins see both
                // Pending (draft) and Released slips.
                if (!isPayrollAdmin && item.status !== "Released") return null;
                return (
                  <SalarySlipItem
                    item={item}
                    maskSalary={maskSalary}
                    onDownloadType1={handleDownloadType1}
                    onDownloadType2={handleDownloadType2}
                    onDownloadType3={handleDownloadType3}
                    onDownloadType4={handleDownloadType4}
                    onViewPDF={handleGoToSalarySlip}
                    isDownloading={isDownloading}
                    isPayrollAdmin={isPayrollAdmin}
                    onRelease={handleReleaseSalarySlip}
                    isReleasing={isReleasing}
                  />
                );
              }}
              isSearch={true}
              pageSize={10}
              searchFields={SALARY_SLIP_SEARCH_FIELDS}
              infiniteScroll={false}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              isFilter={false}
            />
          )}
        </CardTable>
      </div>

      {/* PDF Modal */}
      {selectedSalarySlip && (
        <SalarySlipPDFModal
          isOpen={pdfModalOpen}
          onClose={() => {
            setPdfModalOpen(false);
            setSelectedSalarySlip(null);
            setModalHtmlContent("");
          }}
          salarySlipName={selectedSalarySlip?.salary_slip_id || ""}
          salarySlipDate={selectedSalarySlip?.date || ""}
          htmlContent={modalHtmlContent}
        />
      )}
    </div>
  );
};

// ---------------- DOWNLOAD MENU ----------------
const DownloadMenu = ({
  itemName,
  item,
  isDownloading,
  onType1,
  onType2,
  onType3,
  onType4,
}: any) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="relative">
      <button
        ref={menuRef}
        onClick={() => setOpen(!open)}
        disabled={isDownloading}
        className="my-btn-icon disabled:cursor-not-allowed"
        title="Download Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <ContextualPopup
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={menuRef}
        className="w-60 p-2"
      >
        {[
          {
            label: "Regular Payslip",
            fn: onType1,
            key: "regular_payslip_exists",
          },
          { label: "TDS Sheet", fn: onType2, key: "tds_payslip_exists" },
          {
            label: "Benefit Payslip",
            fn: onType3,
            key: "benefit_payslip_exists",
          },
          {
            label: "Off Cycle Payslip",
            fn: onType4,
            key: "off_payslip_exists",
          },
        ].map(
          (menuItem, i) =>
            item?.[menuItem.key] === 1 && (
              <div key={i} className="flex justify-between items-center">
                <button
                  onClick={(e) => {
                    setOpen(false);
                    menuItem.fn(e, itemName);
                  }}
                  className="flex items-center gap-2 text-sm hover:bg-blue-100 px-2 py-1 rounded-md w-full text-left"
                >
                  <Button className="p-2 border rounded" bgColor="none">
                    <FaRegEye className="w-4 h-4 text-primary" />
                  </Button>
                  {menuItem.label}
                </button>
              </div>
            ),
        )}
      </ContextualPopup>
    </div>
  );
};

// ---------------- ITEM COMPONENTS ----------------
const SalarySlipItemDesktop = ({
  item,
  maskSalary,
  onDownloadType1,
  onDownloadType2,
  onDownloadType3,
  onDownloadType4,
  isDownloading,
  isPayrollAdmin,
  onRelease,
  isReleasing,
}: any) => {
  const formatCurrency2 = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const formatToIndianDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}-${date.getFullYear()}`;
  };


  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
    >
      <Link
        to={`/webapp/employee-profile?target_user=${item.employee}`}
        target="_blank"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          <WrapperHoverCard employeeId={item.employee}>
            {item.employee_name}
          </WrapperHoverCard>
        </Typography>
      </Link>

      <Typography variant="bodySmall" className="font-medium text-center">
        {item.custom_month || "-"}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {item.salary_slip_type || "-"}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item.start_date)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item.end_date)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {maskSalary ? (
          <span className="blur-sm text-gray-400">₹XX,XXX</span>
        ) : (
          formatCurrency2(item.gross_pay)
        )}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {maskSalary ? (
          <span className="blur-sm text-gray-400">
            {formatCurrency("XX,XXX")}
          </span>
        ) : (
          formatCurrency2(item.net_pay)
        )}
      </Typography>

      <div className="flex items-center justify-center">
        <StatusBadge status={getDisplayStatus(item.status)} />
      </div>

      <div className="flex items-center justify-center gap-2">
        {isPayrollAdmin && item.status === "Pending" && (
          <Button
            onClick={(e: React.MouseEvent) => onRelease(e, item.salary_slip_id)}
            disabled={isReleasing}
            className="px-3 py-1 text-xs rounded disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isReleasing ? "Releasing..." : "Release"}
          </Button>
        )}
        <DownloadMenu
          itemName={item.salary_slip_id}
          item={item}
          isDownloading={isDownloading}
          onType1={onDownloadType1}
          onType2={onDownloadType2}
          onType3={onDownloadType3}
          onType4={onDownloadType4}
        />
      </div>
    </div>
  );
};

const SalarySlipItemMobile = ({
  item,
  maskSalary,
  onDownloadType1,
  onDownloadType2,
  onDownloadType3,
  onDownloadType4,
  isDownloading,
  isPayrollAdmin,
  onRelease,
  isReleasing,
}: any) => {
  const formatCurrency2 = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const formatToIndianDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}-${date.getFullYear()}`;
  };


  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b mt-2
        border-x-primary/20 border-b-primary/20 
        shadow-sm border-primary bg-white rounded-xl"
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Header: Employee Name + Actions */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <Typography variant="mobileCardLabel">Employee</Typography>
            <Typography variant="mobileCardValue">
              {item.employee_name}
            </Typography>
            <StatusBadge status={getDisplayStatus(item.status)} />
          </div>
          <div className="flex items-center gap-2">
            {isPayrollAdmin && item.status === "Pending" && (
              <Button
                onClick={(e: React.MouseEvent) =>
                  onRelease(e, item.salary_slip_id)
                }
                disabled={isReleasing}
                className="px-3 py-1 text-xs rounded disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReleasing ? "Releasing..." : "Release"}
              </Button>
            )}
            <DownloadMenu
              itemName={item.salary_slip_id}
              item={item}
              isDownloading={isDownloading}
              onType1={onDownloadType1}
              onType2={onDownloadType2}
              onType3={onDownloadType3}
              onType4={onDownloadType4}
            />
          </div>
        </div>

        {/* Extra Info Row */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Salary Month</Typography>
            <Typography variant="mobileCardValue">
              {item.custom_month || "-"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Type</Typography>
            <Typography variant="mobileCardValue">
              {item.salary_slip_type || "-"}
            </Typography>
          </div>
        </div>

        {/* Duration Row */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Duration</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(item.start_date)} to{" "}
              {formatToIndianDate(item.end_date)}
            </Typography>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Gross Pay</Typography>
            <Typography variant="mobileCardValue">
              {maskSalary ? (
                <span className="blur-sm select-none text-gray-400">
                  {formatCurrency("XX,XXX")}
                </span>
              ) : (
                formatCurrency2(item.gross_pay)
              )}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Net Pay</Typography>
            <Typography variant="mobileCardValue" className="text-blue-600">
              {maskSalary ? (
                <span className="blur-sm select-none text-gray-400">
                  {formatCurrency("XX,XXX")}
                </span>
              ) : (
                formatCurrency2(item.net_pay)
              )}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Responsive wrapper — DataListView passes { item } to ItemComponent ----
const SalarySlipItem = (props: any) => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? (
    <SalarySlipItemDesktop {...props} />
  ) : (
    <SalarySlipItemMobile {...props} />
  );
};

export default SalarySlipsList;