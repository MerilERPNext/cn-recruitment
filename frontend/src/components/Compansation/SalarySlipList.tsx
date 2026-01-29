/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useEffect, useState, useRef, useMemo } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FrappeListView from "../ListView";
import {
  useBenefitClaimPDF,
  useDownloadSalarySlipPDF,
  useOffCyclePaySlipPDF,
  usePrintFormatMenuOptions,
  useTDSPRintViewPDF,
} from "../../hooks/useSalaryDetails";
import SalarySlipPDFModal from "./SalarySlipPDFModal";
import { useScreenSize } from "../../hooks/useScreenSize";
import { FaRegEye } from "react-icons/fa";
import CardTable from "../shared/CardTable";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import Button from "../shared/atoms/Button";
import { useTargetUser } from "../../context/ViewedUserContext";
import CustomDropdown from "../shared/CustomDropdown";
import { useTaxSheetPayrollPriodsData } from "../../hooks/useTaxSheet";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { Typography } from "../shared/atoms/Typography";
import formatToIndianDate from "../../utils/formatToIndianDate";

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
    user?.company || null
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
    if (targetEmployeeId) f.employee = targetEmployeeId;
    if (selectedPeriod) f.custom_payroll_period = selectedPeriod; // optional backend support
    return f;
  }, [targetEmployeeId, selectedPeriod]);

  return (
    <div>
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

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <Typography variant="h4">Salary Slip</Typography>
          <Typography variant="bodySmall" color="body2">
            View and download your salary slips here.
          </Typography>
        </div>

        <div className="flex flex-row md:flex-row md:items-center md:gap-4">
          <button
            onClick={() => setMaskSalary((prev) => !prev)}
            className="my-btn-secondary"
            title={maskSalary ? "Show amounts" : "Hide amounts"}
          >
            {maskSalary ? (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Show Amounts
                </span>
                <BsToggleOff className="w-6 h-6 text-gray-400" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Hide Amounts
                </span>
                <BsToggleOn className="w-6 h-6 text-primary" />
              </>
            )}
          </button>
          <div className="">
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

      <CardTable
        titles={[
          "Employee",
          "Start Date",
          "End Date",
          "Gross Pay",
          "Net Pay",
          "Actions",
        ]}
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
          isSearch={false}
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
          infiniteScroll={true}
          isFilter={false}
          defaultFilters={filter as any}
        />
      </CardTable>
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
          { label: "Benefit Payslip", fn: onType3, key: "benefit_payslip_exists" },
          { label: "Off Cycle Payslip", fn: onType4, key: "off_payslip_exists" },
        ].map((item, i) => (
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
          )
        ))}
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
  if (item.status.toLowerCase() !== "submitted") return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const formatToIndianDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const printFormatMenuRef = usePrintFormatMenuOptions(
    item.name,
    item.employee,
  );

  return (
    <div>
      <div className="grid grid-cols-6 items-center gap-4 px-6 h-14 border-gray-200 hover:bg-primary/20 cursor-pointer">
        <span className="text-sm font-medium text-gray-700 text-start">
          <WrapperHoverCard employeeId={item.employee}>
            {item.employee_name}
          </WrapperHoverCard>
        </span>

        <div className="card-subtitle text-gray-700 text-start truncate">
          {formatToIndianDate(item.start_date)}
        </div>

        <div className="card-subtitle text-gray-700 text-start truncate">
          {formatToIndianDate(item.end_date)}
        </div>

        <div className="card-subtitle text-gray-700 text-start truncate">
          {maskSalary ? (
            <span className="blur-sm text-gray-400">₹XX,XXX</span>
          ) : (
            formatCurrency(item.gross_pay)
          )}
        </div>

        <div className="card-subtitle text-gray-700 text-start truncate">
          {maskSalary ? (
            <span className="blur-sm text-gray-400">₹XX,XXX</span>
          ) : (
            formatCurrency(item.net_pay)
          )}
        </div>

        <div className="flex items-center justify-start gap-2">
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
  if (item.status.toLowerCase() !== "submitted") return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const formatToIndianDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
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
              <span className="blur-sm text-gray-400">₹XX,XXX</span>
            ) : (
              formatCurrency(item.gross_pay)
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Net Pay</span>
          <span className="text-blue-600 font-semibold">
            {maskSalary ? (
              <span className="blur-sm text-gray-400">₹XX,XXX</span>
            ) : (
              formatCurrency(item.net_pay)
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
