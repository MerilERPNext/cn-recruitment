import { PieChart, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { useGenerateSalarySlip } from "../../hooks/useCTC";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Typography } from "../shared/atoms/Typography";
import { NoDataFound } from "../shared/atoms/NoDataFound";

import ShowHideButton from "./ui/ShowHideButton";

const CTCSalaryUI = () => {
  const { data: employee, isLoading: isEmpLoading } = useCurrentEmployeeAllDetails(undefined, undefined, ["name"]);

  const employeeId = employee?.name;
  const { isDesktop } = useScreenSize();

  const {
    data: salarySlip,
    isLoading: isSalaryLoading,
    isError,
  } = useGenerateSalarySlip(employeeId);

  const annual_reimbursement_amount =
    (salarySlip?.total_reimbursement_amount || 0) * 12;

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
    <div className="flex justify-between items-center mb-2 sm:px-2">
      <div>
        {isDesktop && (
          <div>
            <Typography variant="h4">Compensation</Typography>
            <Typography variant="bodySmall" color="body2">
              Detailed breakdown of your salary structure
            </Typography>
          </div>
        )}
      </div>

      <ShowHideButton
        showAmount={isMoneyMasked}
        onToggleAmount={toggleMoneyMask}
      />
    </div>
  );

  if (isLoading) {
    const skeletonCards = [
      { cardBg: "bg-blue-50", iconBg: "bg-blue-100" },
      { cardBg: "bg-purple-50", iconBg: "bg-purple-100" },
      { cardBg: "bg-orange-50", iconBg: "bg-orange-100" },
    ];

    return (
      <div className="min-h-screen rounded-lg sm:px-4">
        <div className="w-full py-4">
          <Header />

          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 sm:gap-6 gap-3 mt-4">
              {skeletonCards.map((card, i) => (
                <div
                  key={i}
                  className={`${card.cardBg} p-6 rounded-lg border border-gray-100 shadow-sm animate-pulse`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-4 w-32 bg-white/60 rounded"></div>
                    <div
                      className={`w-10 h-10 rounded-lg ${card.iconBg}`}
                    ></div>
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
        </div>
      </div>
    );
  }

  if (isError || (!isLoading && !salarySlip)) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Unable to load salary information.
      </div>
    );
  }

  const StatCard = ({
    label,
    value,
    subLabel,
    icon: Icon,
    iconColor = "text-gray-400",
    iconBg = "bg-gray-50",
    cardBg = "bg-white",
  }: {
    label: string;
    value: number;
    subLabel?: string;
    icon?: React.ElementType;
    iconColor?: string;
    iconBg?: string;
    cardBg?: string;
  }) => (
    <div
      className={`${cardBg} p-6 rounded-lg border border-gray-100 shadow-sm hover-lift`}
    >
      <div className="flex justify-between items-start mb-4">
        <p className="card-subtitle  text-gray-600 uppercase tracking-wide">
          {label}
        </p>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold mb-1 ${iconColor}`}>
        {formatCurrency(value)}
      </div>
      {subLabel && <p className="text-xs text-gray-500">{subLabel}</p>}
    </div>
  );

  return (
    <div className="min-h-screen rounded-lg sm:px-4">
      <div className="w-full py-4">
        <Header />

        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 sm:gap-6 gap-3">
            <StatCard
              label="Annual CTC"
              value={salarySlip?.annual_ctc || 0}
              subLabel="Total Cost to Company"
              icon={TrendingUp}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
              cardBg="bg-blue-50"
            />
            <StatCard
              label="Fixed Gross"
              value={salarySlip?.fixed_gross || 0}
              subLabel="Annual Fixed Component"
              icon={Wallet}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
              cardBg="bg-purple-50"
            />
            <StatCard
              label="Reimbursements"
              value={annual_reimbursement_amount}
              subLabel="Annual Reimbursement Limit"
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
                      {salarySlip?.component_part_of_ctc?.map(
                        (component, index) => (
                          <tr key={`${component.component}-${index}`}>
                            <td className="py-4 px-4 border-none card-subtitle">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                <span className="font-medium text-gray-900">
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
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                              >
                                {component.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-gray-900 border-none">
                              {formatCurrency(component.amount)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-blue-600 border-none">
                              {formatCurrency(component.annual_amount)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {salarySlip?.component_part_of_ctc?.map(
                    (component, index) => (
                      <div
                        key={`${component.component}-mobile-${index}`}
                        className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <h4 className="font-semibold text-gray-900">
                              {component.component}
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${component.type === "Deduction"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : component.type === "Reimbursement"
                                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                          >
                            {component.type}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              Monthly
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(component.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              Annual
                            </span>
                            <span className="text-base font-bold text-blue-600">
                              {formatCurrency(component.annual_amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {(!salarySlip?.component_part_of_ctc ||
                salarySlip.component_part_of_ctc.length === 0) && (
                  <NoDataFound
                    title="No Breakdown Available"
                    subtitle="No component breakdown available."
                  />
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTCSalaryUI;
