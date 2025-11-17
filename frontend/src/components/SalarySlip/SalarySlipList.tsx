/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FrappeListView from "../ListView";
import {
  useBenefitClaimPDF,
  useDownloadSalarySlipPDF,
  useOffCyclePaySlipPDF,
  useTDSPRintViewPDF,
} from "../../hooks/useSalaryDetails";
import SalarySlipPDFModal from "./SalarySlipPDFModal";
import { useScreenSize } from "../../hooks/useScreenSize";
import { FaRegEye } from "react-icons/fa";
import CardTable from "../shared/CardTable";

const SalarySlipsList = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const [selectedYear, setSelectedYear] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [maskSalary, setMaskSalary] = useState(true);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [modalHtmlContent, setModalHtmlContent] = useState<string>("");
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<{
    name: string;
    date: string;
  } | null>(null);

  // Hook 1 - Regular Salary Slip
  const { mutate: downloadType1 } = useDownloadSalarySlipPDF({
    onSuccess: (data) => {
      const html = data.response;
      if (html) {
        setModalHtmlContent(html);
        setPdfModalOpen(true);
      } else alert("No HTML found for Regular Payslip!");
    },
  });

  // Hook 2 - TDS Print View
  const { mutate: downloadType2, isPending: isDownloading2 } =
    useTDSPRintViewPDF({
      onSuccess: (data) => {
        const html = data.response;
        if (html) {
          setModalHtmlContent(html); // Pass HTML here
          setPdfModalOpen(true);
        } else alert("No HTML found for TDS Sheet!");
      },
    });

  // Hook 3 - Benefit Payslip
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

  // Hook 4 - Off Cycle Payslip
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

  useEffect(() => {
    setFiltersKey((prev) => prev + 1);
  }, [selectedYear]);

  const handleGoToSalarySlip = (salaryId: string, startDate?: string) => {
    if (isDesktop) {
      setSelectedSalarySlip({
        name: salaryId,
        date: startDate ? formatToIndianDateModal(startDate) : "",
      });
      setPdfModalOpen(true);
    } else {
      const encodedId = encodeURIComponent(salaryId);
      navigate(`/webapp/salary-slip-app/salary-slip-list/${encodedId}`);
    }
  };

  const formatToIndianDateModal = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Handlers for view PDF
  const handleViewPDF = (
    type: "regular" | "tds" | "benefit" | "offcycle",
    salarySlipName: string,
    salaryDate?: string
  ) => {
    // Reset modal before fetching
    setModalHtmlContent("");
    setSelectedSalarySlip({
      name: salarySlipName,
      date: salaryDate || "",
    });

    // Call appropriate API
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

  const filters: Record<string, [string, string]> | undefined = selectedYear
    ? {
        start_date: [">=", `${selectedYear}-01-01`],
        end_date: ["<=", `${selectedYear}-12-31`],
      }
    : undefined;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - i).toString()
  );

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
      <>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-xs">
            <select
              id="yearFilter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="my-form-input"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

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
        </div>
      </>
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
            "start_date",
            "end_date",
            "gross_pay",
            "net_pay",
            "status",
            "posting_date",
          ]}
          searchFields={["employee", "status", "posting_date"]}
          infiniteScroll={true}
          defaultFilters={filters as any}
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
}: any) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
        }}
        disabled={isDownloading}
        className="my-btn-icon disabled:cursor-not-allowed"
        title="Download Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 w-60 bg-white border border-gray-200 rounded-md shadow-md z-20">
          {[
            { label: "Regular Payslip", fn: onType1 },
            { label: "TDS Sheet", fn: onType2 },
            { label: "Benefit Payslip", fn: onType3 },
            { label: "Off Cycle Payslip", fn: onType4 },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center p-2">
              <button
                onClick={(e) => {
                  setOpen(false);
                  item.fn(e, itemName);
                }}
                className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-2 rounded-md"
              >
                <span className="my-btn-icon">
                  <FaRegEye className="w-4 h-4" />
                </span>{" "}
                {item.label}
              </button>
              {/* <button
                onClick={() => {
                  setOpen(false)
                  onViewPDF(itemName)
                }}
                className="my-btn-ico"
                title="View Salary Slip"
              >
                <div className="w-4 h-4" />
              </button> */}
            </div>
          ))}
        </div>
      )}
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
  onViewPDF,
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

  return (
    <div className="my-data-row">
      <div className="grid grid-cols-6 items-center gap-4 px-6 h-14 border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
        <span className="text-sm font-medium text-gray-700 text-start truncate">
          {item.employee}
        </span>
        <div className="text-sm font-medium text-gray-700 text-start truncate">
          {formatToIndianDate(item.start_date)}
        </div>
        <div className="text-sm font-medium text-gray-700 text-start truncate">
          {formatToIndianDate(item.end_date)}
        </div>
        <div className="text-sm font-medium text-gray-700 text-start truncate">
          {maskSalary ? (
            <span className="blur-sm text-gray-400">₹XX,XXX</span>
          ) : (
            formatCurrency(item.gross_pay)
          )}
        </div>
        <div className="text-sm font-medium text-gray-700 text-start truncate">
          {maskSalary ? (
            <span className="blur-sm text-gray-400">₹XX,XXX</span>
          ) : (
            formatCurrency(item.net_pay)
          )}
        </div>
        <div className="flex items-center justify-start gap-2 text-sm font-medium text-gray-700 text-start ">
          <DownloadMenu
            itemName={item.name}
            isDownloading={isDownloading}
            onType1={onDownloadType1}
            onType2={onDownloadType2}
            onType3={onDownloadType3}
            onType4={onDownloadType4}
            onViewPDF={onViewPDF}
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
  onViewPDF,
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

  return (
    <div className="border rounded-lg mb-3 bg-white">
      <div className="flex justify-between p-4 items-center border-b">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800">{item.employee}</span>
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
          onViewPDF={onViewPDF}
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
