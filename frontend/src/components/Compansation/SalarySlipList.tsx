/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MoreVertical } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { FaRegEye } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
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
import FrappeListView from "../ListView";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import CustomDropdown from "../shared/CustomDropdown";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import SalarySlipPDFModal from "./SalarySlipPDFModal";

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

const SalarySlipsList = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

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

  // ---------------- FILTER ----------------
  const filter = useMemo(() => {
    const f: Record<string, string> = {};
  
    const employeeId = targetEmployeeId || user?.employee;
    if (employeeId) {
      f.employee = employeeId;
    }
  
    if (selectedPeriod) {
      f.custom_payroll_period = selectedPeriod; // optional backend support
    }
  
    return f;
  }, [targetEmployeeId, selectedPeriod, user?.employee]);
  

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
              <button
                onClick={() => setMaskSalary((prev) => !prev)}
                className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm"
                title={maskSalary ? "Show amount" : "Hide amount"}
              >
                {maskSalary ? (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Show Amount
                    </span>
                    <BsToggleOff className="w-6 h-6 text-gray-400" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Hide Amount
                    </span>
                    <BsToggleOn className="w-6 h-6 text-primary" />
                  </>
                )}
              </button>
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
        >
          <FrappeListView
            key={filtersKey}
            doctype="Salary Slip"
            ItemComponent={(props) => (
              <SalarySlipItem
                {...props}
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
            defaultFields={[
              "name",
              "employee",
              "employee_name",
              "start_date",
              "end_date",
              "gross_pay",
              "net_pay",
              "status",
              "posting_date",
            ]}
            searchFields={["employee", "status", "posting_date"]}
            infiniteScroll={false}
            showPagination={true}
            SkeletonComponent={CardSkeleton}
            isFilter={false}
            // defaultFilters={filter as any}
            defaultFilters={{
              status: "Submitted",
              ...filter,
            }}
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
              <div key={i} className="flex justify-between items-center ">
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
  // if (item.status.toLowerCase() !== "submitted") return null;

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
  // if (item.status.toLowerCase() !== "submitted") return null;

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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const printFormatMenuRef = usePrintFormatMenuOptions(
    item.name,
    item.employee,
  );

  return (
    <div className="border rounded-lg mb-3 bg-white">
      <div className="flex justify-between p-4 items-center border-b">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800">
            {item.employee_name}
          </span>
          <span className="flex flex-row gap-2 text-xs text-gray-600">
            <p>{formatToIndianDate(item.start_date)}</p>To
            <p>{formatToIndianDate(item.end_date)}</p>
          </span>
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

      <div className="text-sm text-gray-600 p-4">
        <div className="flex justify-between pb-2">
          <span className="font-medium text-gray-700">Gross Pay</span>
          <span className="font-semibold">
            {maskSalary ? (
              <span className="blur-sm text-gray-400">
                {formatCurrency("XX,XXX")}
              </span>
            ) : (
              formatCurrency2(item.gross_pay)
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Net Pay</span>
          <span className="text-blue-600 font-semibold">
            {maskSalary ? (
              <span className="blur-sm text-gray-400">
                {formatCurrency("XX,XXX")}
              </span>
            ) : (
              formatCurrency2(item.net_pay)
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

const SalarySlipItem = (props: any) => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? (
    <SalarySlipItemDesktop {...props} />
  ) : (
    <SalarySlipItemMobile {...props} />
  );
};

export default SalarySlipsList;
