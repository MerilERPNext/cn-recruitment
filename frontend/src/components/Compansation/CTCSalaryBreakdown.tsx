import { PieChart, TrendingUp, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useGenerateSalarySlip } from "../../hooks/useCTC";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTaxSheetPayrollPriodsData } from "../../hooks/useTaxSheet";
import { AmountComponent } from "../../types/ctc";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import CustomDropdown from "../shared/CustomDropdown";
import ShowHideButton from "./ui/ShowHideButton";

const CTCSalaryUI = () => {
  const { data: employee, isLoading: isEmpLoading } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();

  const employeeId = targetEmployeeId || employee?.name;
  const { isDesktop } = useScreenSize();

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    employee?.company || null,
  ) as { data: { name: string; start_date: string; end_date: string }[] | undefined };

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

  const {
    data: salarySlip,
    isLoading: isSalaryLoading,
    isError,
    error,
    refetch,
  } = useGenerateSalarySlip(employeeId, selectedPeriod);

  // New API returns arrays for these, we need to extract the annual_amount of the first item
  const getAmount = (arr: AmountComponent[]) => arr?.[0]?.annual_amount || 0;
  const getMonthlyAmount = (arr: AmountComponent[]) => arr?.[0]?.monthly_amount || arr?.[0]?.amount || 0;

  const annual_ctc = getAmount(salarySlip?.total_final_ctc || []);
  const monthly_ctc = getMonthlyAmount(salarySlip?.total_final_ctc || []);
  const fixed_gross = getAmount(salarySlip?.fixed_gross || []);
  const monthly_fixed_gross = getMonthlyAmount(salarySlip?.fixed_gross || []);
  const fixed_ctc = getAmount(salarySlip?.fixed_ctc || []);
  const monthly_fixed_ctc = getMonthlyAmount(salarySlip?.fixed_ctc || []);

  const [isMoneyMasked, setIsMoneyMasked] = useState(true);

  const isLoading = isEmpLoading || isSalaryLoading;

  const formatCurrency = (amount: number | bigint) => {
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

    if (isMoneyMasked) {
      const maskedText =
        "₹ " + "•".repeat(Math.max(4, formattedAmount.length - 2));
      return (
        <span className="font-mono text-gray-400 tracking-wider">
          {maskedText}
        </span>
      );
    }
    return <span className="font-medium">{formattedAmount}</span>;
  };

  const toggleMoneyMask = () => {
    setIsMoneyMasked(!isMoneyMasked);
  };

  const Header = () => (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full mb-4 font-brand">
      {/* Desktop top bar (hidden on mobile) */}
      {isDesktop && (
        <div className="sm:flex items-center justify-between h-[52px] px-7">
          <span className="font-bold text-[17px] text-text-title tracking-tight">Compensation</span>
          <div className="flex items-center gap-3.5">
            <ShowHideButton
              showAmount={isMoneyMasked}
              onToggleAmount={toggleMoneyMask}
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
            <span className="font-bold text-[16px] text-text-title tracking-tight">Compensation</span>
            <div className="flex items-center gap-2">
              <ShowHideButton
                showAmount={isMoneyMasked}
                onToggleAmount={toggleMoneyMask}
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
  );

  const skeletonCards = [
    { cardBg: "bg-blue-50", iconBg: "bg-blue-100" },
    { cardBg: "bg-purple-50", iconBg: "bg-purple-100" },
    { cardBg: "bg-orange-50", iconBg: "bg-orange-100" },
  ];

  const StatCard = ({
    label,
    value,
    monthlyValue,
    subLabel,
    icon: Icon,
    iconColor = "text-gray-400",
    iconBg = "bg-gray-50",
    cardBg = "bg-white",
  }: {
    label: string;
    value: number;
    monthlyValue?: number;
    subLabel?: string;
    icon?: React.ElementType;
    iconColor?: string;
    iconBg?: string;
    cardBg?: string;
  }) => (
    <div
      className={`${cardBg} p-5 sm:p-6 rounded-xl border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col h-full`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="card-subtitle text-gray-700 uppercase tracking-wide mb-1 font-semibold">
            {label}
          </p>
          {subLabel && <p className="text-xs text-gray-500 leading-snug">{subLabel}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>

      <div className="mt-auto pt-2 space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${iconColor}`}>
            {formatCurrency(value)}
          </span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            / yr
          </span>
        </div>

        {monthlyValue !== undefined && (
          <div className="pt-4 border-t border-black/5 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Monthly</span>
            <span className="text-lg font-bold text-gray-800">
              {formatCurrency(monthlyValue)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  type CombinedComponent = {
    component: string;
    amount?: number;
    annual_amount: number;
    monthly_amount?: number;
    type?: string;
  };

  const allComponents: CombinedComponent[] = salarySlip ? [
    ...(salarySlip.earning_part_of_ctc || []),
    ...(salarySlip.fixed_gross || []).map((i: AmountComponent) => ({ ...i, type: "Sub Total" })),
    ...(salarySlip.deduction_part_of_ctc || []),
    ...(salarySlip.reimbursements_part_of_ctc || []),
    ...(salarySlip.fixed_ctc || []).map((i: AmountComponent) => ({ ...i, type: "Sub Total" })),
    ...(salarySlip.variable_pay_include_ctc || []),
    ...(salarySlip.variable_pay_exclude_ctc || []),
    ...(salarySlip.total_final_ctc || []).map((i: AmountComponent) => ({ ...i, type: "Total" })),
    ...(salarySlip.variable_deduction || []),
    ...(Array.isArray(salarySlip.net_pay)
      ? salarySlip.net_pay.map((i: AmountComponent) => ({ ...i, type: "Total" }))
      : typeof salarySlip.net_pay === "number"
      ? [{ component: "Net Pay", annual_amount: salarySlip.net_pay, type: "Total" }]
      : []),
  ] : [];

  return (
    <div className="min-h-screen bg-app font-brand flex flex-col">
      <Header />
      <div className="w-full sm:px-4 py-4 flex-1">
        {isLoading ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 sm:gap-6 gap-3 mt-4">
              {skeletonCards.map((card, i) => (
                <div
                  key={i}
                  className={`${card.cardBg} p-6 rounded-lg border border-gray-100 shadow-sm animate-pulse`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-4 w-32 bg-white/60 rounded"></div>
                    <div className={`w-10 h-10 rounded-lg ${card.iconBg}`}></div>
                  </div>
                  <div className="h-8 w-40 bg-white/60 rounded mb-2 mt-2"></div>
                  <div className="h-3 w-48 bg-white/60 rounded"></div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl ">
              <div className="px-6 py-4 bg-gray-50/50">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="pt-4 pb-6 px-3">
                {isDesktop ? (
                  <div className="w-full space-y-4">
                    <div className="h-10 bg-gray-100 rounded w-full animate-pulse border-none"></div>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-gray-50 rounded w-full animate-pulse border-none"
                      ></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-pulse"
                      >
                        <div className="flex justify-between mb-3">
                          <div className="h-5 w-32 bg-gray-200 rounded"></div>
                          <div className="h-6 w-24 bg-gray-200 rounded-md"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mt-2">
                            <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            <div className="h-5 w-24 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isError || !salarySlip ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl border border-red-100 p-8 shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load salary information</h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              {error instanceof Error ? error.message : "An unexpected error occurred while fetching your compensation details."}
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 sm:gap-6 gap-3">
              <StatCard
                label="Total CTC"
                value={annual_ctc}
                monthlyValue={monthly_ctc}
                subLabel="Total Cost to Company"
                icon={TrendingUp}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
                cardBg="bg-blue-50"
              />
              <StatCard
                label="Fixed GROSS"
                value={fixed_gross}
                monthlyValue={monthly_fixed_gross}
                subLabel="Annual Fixed Gross"
                icon={Wallet}
                iconColor="text-purple-600"
                iconBg="bg-purple-100"
                cardBg="bg-purple-50"
              />
              <StatCard
                label="Fixed CTC"
                value={fixed_ctc}
                monthlyValue={monthly_fixed_ctc}
                subLabel="Annual Fixed CTC"
                icon={PieChart}
                iconColor="text-orange-600"
                iconBg="bg-orange-100"
                cardBg="bg-orange-50"
              />
            </div>

            <div className="bg-white rounded-xl ">
              <div className="px-6 py-4 bg-gray-50/50">
                <h3 className=" base-title  text-gray-900">Annual Breakdown</h3>
              </div>
              <div className="pt-4 pb-6 px-3 max-h-[550px] overflow-y-auto">
                {isDesktop ? (
                  <div>
                    <table className="w-full card-subtitle border-collapse border-0 !border-none">
                      <thead>
                        <tr>
                          <th className="text-left  py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Component
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Monthly
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Annual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allComponents.map(
                          (component: CombinedComponent, index: number) => (
                            <tr key={`${component.component}-${index}`}>
                              <td className="py-4 px-4 border-none card-subtitle">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${component.type === 'Total' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                                  <span className={`font-medium ${component.type === 'Total' || component.type === 'Sub Total' ? 'text-gray-900 font-bold' : 'text-gray-900'}`}>
                                    {component.component}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4 border-none">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${component.type === "Deduction"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : component.type === "Reimbursement"
                                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                                      : component.type === "Total" || component.type === "Sub Total"
                                        ? "bg-gray-50 text-gray-700 border border-gray-200"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}
                                >
                                  {component.type || "Component"}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-medium text-gray-900 border-none">
                                {(component.amount !== undefined || component.monthly_amount !== undefined) ? formatCurrency(component.amount ?? component.monthly_amount ?? 0) : "-"}
                              </td>
                              <td className={`py-4 px-4 text-right font-bold border-none ${component.type === 'Total' ? 'text-green-600 text-lg' : 'text-blue-600'}`}>
                                {formatCurrency(component.annual_amount || 0)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allComponents.map(
                      (component: CombinedComponent, index: number) => (
                        <div
                          key={`${component.component}-mobile-${index}`}
                          className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${component.type === 'Total' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                              <h4 className={`font-semibold ${component.type === 'Total' || component.type === 'Sub Total' ? 'text-gray-900 font-bold' : 'text-gray-900'}`}>
                                {component.component}
                              </h4>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${component.type === "Deduction"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : component.type === "Reimbursement"
                                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                                  : component.type === "Total" || component.type === "Sub Total"
                                    ? "bg-gray-50 text-gray-700 border border-gray-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                            >
                              {component.type || "Component"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                Monthly
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {(component.amount !== undefined || component.monthly_amount !== undefined) ? formatCurrency(component.amount ?? component.monthly_amount ?? 0) : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-500">
                                Annual
                              </span>
                              <span className={`text-base font-bold ${component.type === 'Total' ? 'text-green-600 text-lg' : 'text-blue-600'}`}>
                                {formatCurrency(component.annual_amount || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {(!allComponents || allComponents.length === 0) && (
                    <NoDataFound
                      title="No Breakdown Available"
                      subtitle="No component breakdown available."
                    />
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CTCSalaryUI;
