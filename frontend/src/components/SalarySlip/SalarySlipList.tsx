import { useEffect, useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FrappeListView from "../ListView";
import { useDownloadSalarySlipPDF } from "../../hooks/useSalaryDetails";
import { UseMutationResult } from "@tanstack/react-query";
import { FaRegEye } from "react-icons/fa";

interface SalarySlip {
  name: string;
  employee: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  net_pay: number;
  status: string;
  posting_date: string;
}

const SalarySlipsList = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [maskSalary, setMaskSalary] = useState(true);

  const {
    mutate: downloadPDF,
    isPending: isDownloading,
  }: UseMutationResult<void, Error, string> = useDownloadSalarySlipPDF();

  useEffect(() => {
    setFiltersKey((prev) => prev + 1);
  }, [selectedYear]);

  const handleGoToSalarySlip = (salaryId: string) => {
    const encodedId = encodeURIComponent(salaryId);
    navigate(`/webapp/salary-slip-app/salary-slip-list/${encodedId}`);
  };

  const handleDownload = (e: React.MouseEvent, salarySlipName: string) => {
    e.stopPropagation();
    downloadPDF(salarySlipName);
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
      <FrappeListView
        key={filtersKey}
        doctype="Salary Slip"
        ItemComponent={(props) => (
          <SalarySlipItem
            {...(props as { item: SalarySlip; index?: number; doctype: string })}
            maskSalary={maskSalary}
            onDownload={handleDownload}
            onViewPDF={handleGoToSalarySlip}
            isDownloading={isDownloading}
          />
        )}
        isSearch={true}
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultFilters={filters as any}
        PreListComponent={() => (
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex-1">
              <select
                id="yearFilter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="flex items-center gap-2 border rounded px-4 py-1 transition-colors duration-200"
              title={maskSalary ? "Show amounts" : "Hide amounts"}
            >
              {maskSalary ? (
                <>
                  <span className="text-sm font-medium">Show Amounts</span>
                  <BsToggleOff className="w-8 h-8" />
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Hide Amounts</span>
                  <BsToggleOn className="w-8 h-8" />
                </>
              )}
            </button>
          </div>
        )}
      />
    </div>
  );
};

const SalarySlipItem: React.FC<{
  item: SalarySlip;
  index?: number;
  doctype: string;
  maskSalary: boolean;
  onDownload: (e: React.MouseEvent, salarySlipName: string) => void;
  onViewPDF: (salarySlipName: string) => void;
  isDownloading: boolean;
}> = ({ item, maskSalary, onDownload, onViewPDF, isDownloading }) => {
  if (item.status.toLowerCase() !== "submitted") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatToIndianDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div
      key={item.name}
      className="flex justify-between items-center gap-3 bg-white p-4 mt-1 rounded-xl border hover:shadow-sm transition-shadow"
    >
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[var(--text-primary)] text-base font-semibold">
            {formatToIndianDate(item.start_date)}
          </h3>
        </div>
        <div className="text-sm text-[var(--secondary-color)] space-y-1">
          <p className="font-medium">
            Gross Pay:{" "}
            <span className={maskSalary ? "blur-sm select-none" : ""}>
              {formatCurrency(item.gross_pay)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={(e) => onDownload(e, item.name)}
          disabled={isDownloading}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          title="Download Salary Slip"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewPDF(item.name)}
          className="flex items-center justify-center p-2  border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
        >
         <FaRegEye className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
};

export default SalarySlipsList;
