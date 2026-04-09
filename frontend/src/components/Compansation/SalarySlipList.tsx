/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoreVertical } from "lucide-react";
import type React from "react";
import { useEffect,  useRef, useState } from "react";
import { FaRegEye } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import {
  useBenefitClaimPDF,
  useDownloadSalarySlipPDF,
  useOffCyclePaySlipPDF,
  usePrintFormatMenuOptions,
  useTDSPRintViewPDF,
} from "../../hooks/useSalaryDetails";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTaxSheetPayrollPriodsData } from "../../hooks/useTaxSheet";
import { formatCurrency } from "../../utils/currency";
import formatToIndianDate from "../../utils/formatToIndianDate";
import DataListView from "../DataListView"; // ← replaced FrappeListView
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import CustomDropdown from "../shared/CustomDropdown";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import SalarySlipPDFModal from "./SalarySlipPDFModal";
import ShowHideButton from "./ui/ShowHideButton";

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
  [key: string]: any;
};

const SALARY_SLIP_SEARCH_FIELDS = ["employee", "status", "posting_date"];
 const SALARY_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: false,
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
  ];

// ---- Main Component ----
const SalarySlipsList = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: user } = useCurrentEmployeeAllDetails(undefined, undefined, ["employee", "company"]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [maskSalary, setMaskSalary] = useState(true);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [modalHtmlContent, setModalHtmlContent] = useState<string>("");

  const [selectedSalarySlip, setSelectedSalarySlip] = useState<{
    name: string;
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

  // ✅ Refresh list on filter change
  useEffect(() => {
    setFiltersKey((prev) => prev + 1);
  }, [selectedPeriod, targetEmployeeId]);

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

  const handleGoToSalarySlip = (salaryId: string, startDate?: string) => {
    if (isDesktop) {
      setSelectedSalarySlip({
        name: salaryId,
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
    salarySlipName: string,
    salaryDate?: string,
  ) => {
    setModalHtmlContent("");
    setSelectedSalarySlip({
      name: salarySlipName,
      date: salaryDate || "",
    });

    switch (type) {
      case "regular":
        downloadType1(salarySlipName);
        break;
      case "tds":
        downloadType2(salarySlipName);
        break;
      case "benefit":
        downloadType3(salarySlipName);
        break;
      case "offcycle":
        downloadType4(salarySlipName);
        break;
    }
  };

  const handleDownloadType1 = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    handleViewPDF("regular", name);
  };
  const handleDownloadType2 = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    handleViewPDF("tds", name);
  };
  const handleDownloadType3 = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    handleViewPDF("benefit", name);
  };
  const handleDownloadType4 = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    handleViewPDF("offcycle", name);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop && (
              <div>
                <Typography variant="h4">Salary Slip</Typography>
                <Typography variant="bodySmall" color="body2">
                  View and download your salary slips here.
                </Typography>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 w-full md:w-auto">
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
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={[
            "Employee",
            "Start Date",
            "End Date",
            "Gross Pay",
            "Net Pay",
            "Actions",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]}
          columnSortConfig={SALARY_SORT_CONFIG}
        >
      
          <DataListView<SalarySlipRecord>
            key={filtersKey}
            queryKey={["salary-slips", String(filtersKey)]}
            customAPI={{
              method: "cn_indian_payroll.cn_indian_payroll.overrides.salary_silip.get_salary_slips",
              params: {
                doctype: "Salary Slip",
                employee: targetEmployeeId || user?.employee,
                payroll_period: selectedPeriod,
              },
            }}
            defaultFilters={{
              status: "Submitted",
            }}
            
            ItemComponent={({ item }) => (
              <SalarySlipItem
                item={item}
                maskSalary={maskSalary}
                onDownloadType1={handleDownloadType1}
                onDownloadType2={handleDownloadType2}
                onDownloadType3={handleDownloadType3}
                onDownloadType4={handleDownloadType4}
                onViewPDF={handleGoToSalarySlip}
                isDownloading={isDownloading}
              />
            )}
            isSearch={true}
            pageSize={10}
            searchFields={SALARY_SLIP_SEARCH_FIELDS}
            infiniteScroll={false}
            showPagination={true}
            SkeletonComponent={CardSkeleton}
            isFilter={false}
          />
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
          salarySlipName={selectedSalarySlip?.name || ""}
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
  isDownloading,
  onType1,
  onType2,
  onType3,
  onType4,
  onShowPrintFormatMenu,
}: any) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const printFormatMenuRef = onShowPrintFormatMenu?.data;

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
          (item, i) =>
            printFormatMenuRef?.[item.key] === 1 && (
              <div key={i} className="flex justify-between items-center">
                <button
                  onClick={(e) => {
                    setOpen(false);
                    item.fn(e, itemName);
                  }}
                  className="flex items-center gap-2 text-sm hover:bg-blue-100 px-2 py-1 rounded-md w-full text-left"
                >
                  <Button className="p-2 border rounded" bgColor="none">
                    <FaRegEye className="w-4 h-4 text-primary" />
                  </Button>
                  {item.label}
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

  const printFormatMenuRef = usePrintFormatMenuOptions(
    item.name,
    item.employee,
  );

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
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
        <DownloadMenu
          itemName={item.name}
          isDownloading={isDownloading}
          onType1={onDownloadType1}
          onType2={onDownloadType2}
          onType3={onDownloadType3}
          onType4={onDownloadType4}
          onShowPrintFormatMenu={printFormatMenuRef}
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

  const printFormatMenuRef = usePrintFormatMenuOptions(
    item.name,
    item.employee,
  );

  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b mt-2
        border-x-primary/20 border-b-primary/20 
        shadow-sm border-primary bg-white rounded-xl"
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Header: Employee Name + Actions */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Employee</Typography>
            <Typography variant="mobileCardValue">
              {item.employee_name}
            </Typography>
          </div>
          <DownloadMenu
            itemName={item.name}
            isDownloading={isDownloading}
            onType1={onDownloadType1}
            onType2={onDownloadType2}
            onType3={onDownloadType3}
            onType4={onDownloadType4}
            onShowPrintFormatMenu={printFormatMenuRef}
          />
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