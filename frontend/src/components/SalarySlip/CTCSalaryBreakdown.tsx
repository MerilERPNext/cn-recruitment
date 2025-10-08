import { useMemo, useState } from 'react';
import { Calculator, TrendingUp, Wallet, PieChart, DollarSign, Target, Award, Briefcase } from 'lucide-react';
import { useCurrentEmployee } from '../../hooks/useEmployee';
import { useGenerateSalarySlip } from '../../hooks/useCTC';
import { useViewMode } from './SalarySlipApp';
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { useScreenSize } from '../../hooks/useScreenSize';

const CTCSalaryUI = () => {
  const { data: employee, isLoading: isEmpLoading } = useCurrentEmployee();
  const employeeId = employee?.name;
  const { isDesktop } = useScreenSize();

  const {
    data: salarySlip,
    isLoading: isSalaryLoading,
    isError,
  } = useGenerateSalarySlip(employeeId);
  const annual_reimbursement_amount = (salarySlip?.total_reimbursement_amount || 0) * 12;

  console.log(salarySlip?.total_reimbursement_amount,"jkshadfasjkdfhkajhjs")


  const { viewMode } = useViewMode();
  const activeTab = viewMode;

  const [isMoneyMasked, setIsMoneyMasked] = useState(true);

  const isLoading = isEmpLoading || isSalaryLoading;
  
  const formatCurrency = (amount: number | bigint) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

    if (isMoneyMasked) {
      const maskedText = '₹ ' + 'X'.repeat(Math.max(4, formattedAmount.length - 2));
      return (
        <span className="relative inline-block">
          <span className="blur-sm select-none text-gray-400">{maskedText}</span>
        </span>
      );
    }
    return formattedAmount;
  };

  const toggleMoneyMask = () => {
    setIsMoneyMasked(!isMoneyMasked);
  };

  const salaryComponents = useMemo(() => {
    if (!salarySlip?.component_part_of_ctc) return [];
    return salarySlip.component_part_of_ctc.map((comp) => ({
      label: comp.component,
      value: comp.annual_amount,
    }));
  }, [salarySlip]);

  const monthlyComponents = useMemo(() => {
    if (!salarySlip?.component_part_of_ctc) return [];
    return salarySlip.component_part_of_ctc.map((comp) => ({
      label: comp.component,
      value: comp.amount,
      type: comp.type === 'Deduction' ? 'deduction' : 'income',
    }));
  }, [salarySlip]);

  if (isLoading) {
    return (
      <div className="text-center mt-10 text-gray-500">
        Loading salary data...
      </div>
    );
  }

  if (isError || (!isLoading && !salarySlip)) {
    return (
      <div className="text-center mt-10 text-red-500">
        Failed to load salary data.
      </div>
    );
  }

  // Mobile layout component
  const MobileLayout = () => (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Money Mask Toggle Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleMoneyMask}
            className="flex items-center gap-2 px-4 py-2 transition-colors duration-200"
            title={isMoneyMasked ? 'Show amounts' : 'Hide amounts'}
          >
            {isMoneyMasked ? (
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

        {/* Annual View */}
        {activeTab === 'annual' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6 text-center border-l-4 border-blue-500">
              <div className="flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-blue-500 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">
                  Annual CTC
                </h2>
              </div>
              <p className={`text-2xl font-bold text-blue-600 mb-2 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                {formatCurrency(salarySlip?.annual_ctc || 0)}
              </p>
              <p className="text-gray-500">
                Cost to Company (Per Annum)
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <PieChart className="w-6 h-6 mr-2" />
                Annual CTC Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salaryComponents.map((component, index) => (
                  <div
                    key={`${component.label}-${index}`}
                    className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <h4 className="font-medium text-gray-800">
                      {component.label}
                    </h4>
                    <p className={`font-bold text-blue-500 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                      {formatCurrency(component.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monthly View */}
        {activeTab === 'monthly' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6 text-center border-l-4 border-green-500">
              <div className="flex items-center justify-center mb-2">
                <Wallet className="w-8 h-8 text-green-500 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">
                  Monthly Take Home
                </h2>
              </div>
              <p className={`text-2xl font-bold text-green-600 mb-2 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                {formatCurrency(salarySlip?.net_pay || 0)}
              </p>
              <p className="text-gray-500">In-hand Salary (Per Month)</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Calculator className="w-6 h-6 mr-2" />
                Monthly Salary Breakdown
              </h3>

              <div className="space-y-4 mb-6">
                {monthlyComponents.map((component, index) => (
                  <div
                    key={`${component.label}-${index}`}
                    className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-800">
                      {component.label}
                    </span>
                    <span className={`font-bold text-green-500 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                      {formatCurrency(component.value)}
                    </span>
                  </div>
                ))}
                {(salarySlip?.total_deduction ?? 0) > 0 || (
                  <div className="flex justify-between items-center py-3 px-4 bg-red-50 rounded-lg">
                    <span className="font-medium text-gray-800">
                      PF Deduction
                    </span>
                    <span className={`font-bold text-red-600 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                      -{formatCurrency(salarySlip?.total_deduction ?? 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Gross Monthly
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(salarySlip?.gross_pay || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Before deductions</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Total Deductions
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(salarySlip?.total_deduction || 0)}
                  </p>
                  <p className="text-xs text-gray-500">PF contribution</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Desktop layout component with enhanced design
  const DesktopLayout = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full mx-auto">
        {/* Enhanced Header Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6 overflow-hidden">
          <div className="bg-blue-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold mb-1">Compensation Overview</h1>
                  <p className="text-blue-100">Complete salary breakdown and benefits</p>
                </div>
              </div>

              {/* Enhanced Toggle */}
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-3">
                <button
                  onClick={toggleMoneyMask}
                  className="flex items-center gap-3 text-white hover:bg-white hover:bg-opacity-10 px-4 py-2 rounded-lg transition-all duration-300"
                  title={isMoneyMasked ? 'Show amounts' : 'Hide amounts'}
                >
                  <span className="font-medium">
                    {isMoneyMasked ? ' Show Amounts' : 'Hide Amounts'}
                  </span>
                  {isMoneyMasked ? (
                    <BsToggleOff className="w-6 h-6" />
                  ) : (
                    <BsToggleOn className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Annual View - Enhanced */}
        {activeTab === 'annual' && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className="bg-emerald-50 rounded-xl z-1 shadow-lg p-6 text-gray-800 relative overflow-hidden border border-emerald-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-opacity-30 rounded-full -translate-y-12 translate-x-12"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-opacity-30 rounded-full translate-y-8 -translate-x-8"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-opacity-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1 text-emerald-800">Annual CTC</h2>
                      <p className="text-emerald-600">Cost to Company (Per Annum)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold mb-2 text-emerald-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                      {formatCurrency(salarySlip?.annual_ctc || 0)}
                    </p>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Target className="w-4 h-4" />
                      <span className="text-sm">Total Package</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                    <PieChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Component Breakdown</h3>
                </div>
                <div className="space-y-4">
                  {salaryComponents.map((component, index) => (
                    <div
                      key={`${component.label}-${index}`}
                      className="group flex justify-between items-center p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all duration-300 hover:shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-indigo-500 transition-colors"></div>
                        <h4 className="font-semibold text-gray-800 group-hover:text-indigo-800 transition-colors">
                          {component.label}
                        </h4>
                      </div>
                      <p className={`font-bold text-blue-600 group-hover:text-indigo-600 transition-colors ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                        {formatCurrency(component.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-xl shadow-lg p-4 text-purple-800 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <Award className="w-8 h-8 text-purple-600" />
                    <span className="text-purple-600 text-xs font-medium">YEARLY</span>
                  </div>
                  <h4 className="text-base font-semibold mb-2">Fixed Gross (Annual)</h4>
                  <p className={`text-2xl font-bold text-purple-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                    {formatCurrency(salarySlip?.fixed_gross || 0)}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-xl shadow-lg p-4 text-orange-800 border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <Briefcase className="w-8 h-8 text-orange-600" />
                    <span className="text-orange-600 text-xs font-medium">YEARLY</span>
                  </div>
                  <h4 className="text-base font-semibold mb-2">Total Reimbursement Aamount</h4>
                  <p className={`text-2xl font-bold text-orange-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                    {formatCurrency(annual_reimbursement_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly View - Enhanced */}
        {activeTab === 'monthly' && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className="bg-green-50 rounded-xl shadow-lg p-6 text-gray-800 relative overflow-hidden border border-green-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-opacity-30 rounded-full -translate-y-12 translate-x-12"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-opacity-30 rounded-full translate-y-8 -translate-x-8"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-opacity-50 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1 text-green-800">Monthly Take Home</h2>
                      <p className="text-green-600">In-hand Salary (Per Month)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold mb-2 text-green-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                      {formatCurrency(salarySlip?.net_pay || 0)}
                    </p>
                    <div className="flex items-center gap-2 text-green-600">
                      <Target className="w-4 h-4" />
                      <span className="text-sm">Net Pay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Components List */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mr-3">
                    <Calculator className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Monthly Breakdown</h3>
                </div>
                <div className="space-y-4">
                  {monthlyComponents.map((component, index) => (
                    <div
                      key={`${component.label}-${index}`}
                      className="group flex justify-between items-center p-3 rounded-lg transition-all duration-300 hover:shadow-sm bg-green-50 hover:bg-green-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full transition-colors bg-green-500 group-hover:bg-green-600"></div>
                        <span className="font-semibold text-gray-800">
                          ➕ {component.label}
                        </span>
                      </div>
                      <span className={`font-bold transition-colors text-green-600 group-hover:text-green-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                        {formatCurrency(component.value)}
                      </span>
                    </div>
                  ))}
                  {(salarySlip?.total_deduction ?? 0) < 0 && (
                    <div className="group flex justify-between items-center p-3 rounded-lg transition-all duration-300 hover:shadow-sm bg-red-50 hover:bg-red-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full transition-colors bg-red-500 group-hover:bg-red-600"></div>
                        <span className="font-semibold text-gray-800">
                          ➖ PF Deduction
                        </span>
                      </div>
                      <span className={`font-bold transition-colors text-red-600 group-hover:text-red-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                        -{formatCurrency(salarySlip?.total_deduction ?? 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl shadow-lg p-4 text-blue-800 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                    <span className="text-blue-600 text-xs font-medium">GROSS</span>
                  </div>
                  <h4 className="text-base font-semibold mb-2">💵 Gross Monthly</h4>
                  <p className={`text-xl font-bold text-blue-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                    {formatCurrency(salarySlip?.gross_pay || 0)}
                  </p>
                  <p className="text-blue-600 text-xs mt-2">Before deductions</p>
                </div>

                <div className="bg-red-50 rounded-xl shadow-lg p-4 text-red-800 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <Calculator className="w-8 h-8 text-red-600" />
                    <span className="text-red-600 text-xs font-medium">DEDUCTIONS</span>
                  </div>
                  <h4 className="text-base font-semibold mb-2">➖ Total Deductions</h4>
                  <p className={`text-xl font-bold text-red-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                    {formatCurrency(salarySlip?.total_deduction || 0)}
                  </p>
                  <p className="text-red-600 text-xs mt-2">PF contribution</p>
                </div>

                <div className="bg-emerald-50 rounded-xl shadow-lg p-4 text-emerald-800 border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <Wallet className="w-8 h-8 text-emerald-600" />
                    <span className="text-emerald-600 text-xs font-medium">NET</span>
                  </div>
                  <h4 className="text-base font-semibold mb-2">💰 Take Home</h4>
                  <p className={`text-xl font-bold text-emerald-700 ${isMoneyMasked ? 'transition-all duration-300' : ''}`}>
                    {formatCurrency(salarySlip?.net_pay || 0)}
                  </p>
                  <p className="text-emerald-600 text-xs mt-2">In your account</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default CTCSalaryUI;