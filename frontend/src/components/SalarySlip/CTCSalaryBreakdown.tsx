import { useMemo } from 'react';
import { Calculator, TrendingUp, Wallet, PieChart } from 'lucide-react';
import { useCurrentEmployee } from '../../hooks/useEmployee';
import { useGenerateSalarySlip } from '../../hooks/useCTC';
import { useViewMode } from './SalarySlipApp'; // Import the context hook

const CTCSalaryUI = () => {
  const { data: employee, isLoading: isEmpLoading } = useCurrentEmployee();
  const employeeId = employee?.name;

  const {
    data: salarySlip,
    isLoading: isSalaryLoading,
    isError,
  } = useGenerateSalarySlip(employeeId);

  // Use the context instead of local state
  const { viewMode } = useViewMode();
  const activeTab = viewMode; // Map to existing variable name for minimal changes

  const isLoading = isEmpLoading || isSalaryLoading;

  const earnings = useMemo(() => {
    if (!salarySlip?.component_part_of_ctc) return [];
    return salarySlip.component_part_of_ctc.filter(
      (comp) => comp.type === 'Earning' || comp.type === 'Reimbursement'
    );
  }, [salarySlip]);

  const ctcData = useMemo(() => {
    return earnings.reduce((acc, curr) => {
      acc[curr.component] = curr.annual_amount;
      return acc;
    }, {} as Record<string, number>);
  }, [earnings]);

  const pf = salarySlip?.total_deduction || 0;
  const totalCTC = useMemo(
    () => Object.values(ctcData).reduce((sum, value) => sum + value, 0),
    [ctcData]
  );

  const takeHome = totalCTC - (pf * 12);
  const monthlyTakeHome = takeHome / 12;
  const grossMonthly = totalCTC / 12;

  const formatCurrency = (amount: number | bigint) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const salaryComponents = useMemo(() => {
    if (!salarySlip) return [];
    return salarySlip.component_part_of_ctc.map((comp) => ({
      label: comp.component,
      value: comp.annual_amount,
    }));
  }, [salarySlip]);

  const monthlyComponents = useMemo(() => {
    if (!salarySlip?.component_part_of_ctc) return [];
    const baseComponents = salarySlip.component_part_of_ctc.map((comp) => ({
      label: comp.component,
      value: comp.amount,
      type: comp.type === 'Deduction' ? 'deduction' : 'income',
    }));

    if (salarySlip.total_deduction) {
      baseComponents.push({
        label: 'PF Deduction',
        value: salarySlip.total_deduction,
        type: 'deduction',
      });
    }

    return baseComponents;
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

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
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
              <p className="text-2xl font-bold text-blue-600 mb-2">
                {formatCurrency(totalCTC)}
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
                {salaryComponents.map((component) => (
                  <div
                    key={component.label}
                    className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <h4 className="font-medium text-gray-800">
                      {component.label}
                    </h4>
                    <p className="font-bold text-blue-500">
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
              <p className="text-2xl font-bold text-green-600 mb-2">
                {formatCurrency(monthlyTakeHome)}
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
                    className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-800">
                      {component.label}
                    </span>
                    <span
                      className={`font-bold ${component.type === 'deduction' ? 'text-red-600' : 'text-green-500'}`}
                    >
                      {component.type === 'deduction' ? '-' : ''}
                      {formatCurrency(component.value)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Gross Monthly
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(grossMonthly)}
                  </p>
                  <p className="text-xs text-gray-500">Before deductions</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Total Deductions
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(pf)}
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
};

export default CTCSalaryUI;