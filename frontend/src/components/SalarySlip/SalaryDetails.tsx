import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useSalarySlipDetails, useDownloadSalarySlipPDF } from "../../hooks/useSalaryDetails";
import type { SalaryComponent } from "../../types/salary";
import { UseMutationResult } from "@tanstack/react-query";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import defaultProfile from "../../assets/user.png";
import HeaderBar from "../HeaderBar";

const SalarySlipDetails = () => {
  const [showSalary, setShowSalary] = useState(false);
  const [showEarnings, setShowEarnings] = useState(true);
  const [showDeductions, setShowDeductions] = useState(false);
  const navigator = useNavigate();
  const { salaryId } = useParams<{ salaryId: string }>();
  const { data: user_id } = useLoggedInUser();

  const { data: user } = useCurrentEmployeeAllDetails(user_id || "");


  const decodedName = decodeURIComponent(salaryId || "");

  const { data, isLoading, error } = useSalarySlipDetails({
    name: decodedName,
  });

  const {
    mutate: downloadPDF,
    isPending: isDownloading,
  }: UseMutationResult<void, Error, string> = useDownloadSalarySlipPDF();
  const formatMonthYear = (startDate: string | undefined): string => {
    if (!startDate) return "N/A";
    const start = new Date(startDate);
    return start.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatAmount = (amount: number | undefined): string => {
    return showSalary ? `₹${amount?.toLocaleString()}` : "₹*********";
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-600">Error loading salary slip</div>;
  }

  const earningsData: SalaryComponent[] = data?.earnings || [];
  const deductionsData: SalaryComponent[] = data?.deductions || [];
  const grossPay = data?.gross_pay || 0;
  const totalDeductions = data?.total_deduction || 0;
  const netPay = data?.net_pay || 0;

  return (
    <div className="max-w-full mx-auto font-roboto font-medium bg-gray-100 min-h-screen">
     <HeaderBar title="Salary Slip" onBack={() => navigator(-1)}/>

      <div>
        {/* Header Section */}
        <div className="p-4 border-b flex justify-between border-gray-100">
          <div className="flex items-start space-x-3 mb-1">

            <div className="relative">
              <img
                src={user?.image || defaultProfile}
                alt="User avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">{data?.employee_name || "Employee Name"}</h2>
              <p className="text-sm text-gray-600">{data?.designation || "Designation"}</p>
              <p className="text-sm text-gray-500">{formatMonthYear(data?.start_date)}</p>
              <p className="text-sm text-gray-500">Employee Code: {data?.employee || "N/A"}</p>
            </div>
          </div>
          <div className="px-2 mb-4 max-w-15">
            <button
              onClick={() => setShowSalary(!showSalary)}
              className="flex items-center justify-center space-x-2 w-full py-2 px-2 bg-blue-600 hover:border border-white text-white rounded-full transition-colors duration-200"
            >
              {showSalary ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Earnings */}
        <div className="pb-4 bg-white m-4 rounded-lg">
          <div className="flex items-center justify-between cursor-pointer px-4 py-3" onClick={() => setShowEarnings(!showEarnings)}>
            <h3 className="text-base font-semibold text-gray-900">Earnings</h3>
            {showEarnings ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
          {showEarnings && (
            <div className="px-4 py-3 border-t space-y-3">
              {earningsData.length > 0 ? (
                earningsData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.salary_component}</span>
                    <span className={`text-sm font-medium text-gray-900 ${!showSalary ? "blur-sm select-none" : ""}`}>
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No earnings data available</div>
              )}
            </div>
          )}
        </div>

        {/* Deductions */}
        <div className="pb-4 bg-white m-4 rounded-lg">
          <div className="flex items-center px-4 justify-between cursor-pointer py-3" onClick={() => setShowDeductions(!showDeductions)}>
            <h3 className="text-base font-semibold text-gray-900">Deductions</h3>
            {showDeductions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
          {showDeductions && (
            <div className="border-t py-3 space-y-3 px-4">
              {deductionsData.length > 0 ? (
                deductionsData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.salary_component}</span>
                    <span className={`text-sm font-medium text-red-600 ${!showSalary ? "blur-sm select-none" : ""}`}>
                      -{formatAmount(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No deductions data available</div>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="pb-6 bg-white m-4 rounded-lg">
          <h3 className="text-base px-4 py-3 font-semibold border-b text-gray-900 mb-3">Summary</h3>
          <div className="space-y-3 pb-4 px-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Gross Pay</span>
              <span className={`text-sm font-medium text-gray-900 ${!showSalary ? "blur-sm select-none" : ""}`}>
                {formatAmount(grossPay)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Deductions</span>
              <span className={`text-sm font-medium text-red-600 ${!showSalary ? "blur-sm select-none" : ""}`}>
                -{formatAmount(totalDeductions)}
              </span>
            </div>
          </div>
          <div className="border-gray-200 pt-3 border-t">
            <div className="flex justify-between items-center px-4">
              <span className="text-base font-semibold text-gray-900">Net Pay</span>
              <span className={`text-lg font-bold text-green-600 ${!showSalary ? "blur-sm select-none" : ""}`}>
                {formatAmount(netPay)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="px-4 pb-6">
        <button
          onClick={() => data?.name && downloadPDF(data.name)}
          disabled={isDownloading}
          className="flex items-center justify-center space-x-2 w-full py-3 px-4 border border-black rounded-3xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span className="font-bold">
            {isDownloading ? "Downloading..." : "Download Salary Slip"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default SalarySlipDetails;
