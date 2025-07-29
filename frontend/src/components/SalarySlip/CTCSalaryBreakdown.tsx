import { useState } from 'react';
import { IndianRupee, PieChart, Calculator, User } from 'lucide-react';

const CTCSalaryUI = () => {
  const [ctcData] = useState({
    basicSalary: 600000,
    hra: 240000,
    allowances: 120000,
    pf: 21600,
    gratuity: 28800,
    medicalInsurance: 15000,
    bonus: 60000,
    stockOptions: 0
  });

  const totalCTC = Object.values(ctcData).reduce((sum, value) => sum + value, 0);
  const takeHome = ctcData.basicSalary + ctcData.hra + ctcData.allowances - ctcData.pf;
  const monthlyTakeHome = takeHome / 12;

  const formatCurrency = (amount: number | bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const salaryComponents = [
    {
      label: 'Basic Salary',
      key: 'basicSalary',
      value: ctcData.basicSalary,
      color: 'bg-blue-500',
      description: 'Base salary component'
    },
    {
      label: 'HRA',
      key: 'hra',
      value: ctcData.hra,
      color: 'bg-green-500',
      description: 'House Rent Allowance'
    },
    {
      label: 'Other Allowances',
      key: 'allowances',
      value: ctcData.allowances,
      color: 'bg-purple-500',
      description: 'Travel, Food, etc.'
    },
    {
      label: 'Provident Fund',
      key: 'pf',
      value: ctcData.pf,
      color: 'bg-orange-500',
      description: 'Employee PF contribution'
    },
    {
      label: 'Gratuity',
      key: 'gratuity',
      value: ctcData.gratuity,
      color: 'bg-pink-500',
      description: 'End of service benefit'
    },
    {
      label: 'Medical Insurance',
      key: 'medicalInsurance',
      value: ctcData.medicalInsurance,
      color: 'bg-red-500',
      description: 'Health insurance premium'
    },
    {
      label: 'Annual Bonus',
      key: 'bonus',
      value: ctcData.bonus,
      color: 'bg-yellow-500',
      description: 'Performance bonus'
    },
    {
      label: 'Stock Options',
      key: 'stockOptions',
      value: ctcData.stockOptions,
      color: 'bg-indigo-500',
      description: 'Equity compensation'
    }
  ];

  return (
    <div className="min-h-screen rounded-lg to-indigo-100 ">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <h1 className="text-xl  font-bold text-gray-800">CTC Salary Breakdown</h1>
          </div>
          <p className="text-gray-600 text-sm">Cost to Company - Complete Salary Structure</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center">
              <IndianRupee className="w-6 h-8 text-blue-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total CTC</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalCTC)}</p>
                <p className="text-xs text-gray-500">Per Annum</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center">
              <Calculator className="w-6 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Take Home</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(monthlyTakeHome)}</p>
                <p className="text-xs text-gray-500">After PF deduction</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center">
              <PieChart className="w-6 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Benefits Value</p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(ctcData.pf + ctcData.gratuity + ctcData.medicalInsurance + ctcData.bonus)}
                </p>
                <p className="text-xs text-gray-500">Non-cash benefits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Salary Components Display */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <User className="w-6 h-6 mr-2" />
              Salary Components
            </h2>
            
            <div className="space-y-4">
              {salaryComponents.map((component) => (
                <div key={component.key} className="group">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors duration-200">
                    <div>
                      <h3 className="text-sm font-medium text-gray-800">{component.label}</h3>
                      <p className="text-xs text-gray-500">{component.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">{formatCurrency(component.value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Breakdown */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Salary Breakdown</h2>
            
            {/* Progress Bars */}
            <div className="space-y-4 mb-6">
              {salaryComponents.map((component) => {
                const percentage = totalCTC > 0 ? (component.value / totalCTC) * 100 : 0;
                return (
                  <div key={component.key} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{component.label}</span>
                      <span className="text-sm text-gray-600">{formatCurrency(component.value)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-3xl h-3">
                      <div
                        className={`h-3 rounded-3xl ${component.color} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of CTC</div>
                  </div>
                );
              })}
            </div>

            {/* Summary Table */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">Gross Salary (Annual)</span>
                  <span className="font-semibold">{formatCurrency(ctcData.basicSalary + ctcData.hra + ctcData.allowances)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">Benefits & Deductions</span>
                  <span className="font-semibold">{formatCurrency(totalCTC - (ctcData.basicSalary + ctcData.hra + ctcData.allowances))}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                  <span className="font-bold text-lg text-gray-800">Total CTC</span>
                  <span className="font-bold text-lg text-blue-600">{formatCurrency(totalCTC)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="mt-8 bg-white rounded-xl border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Monthly Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Gross Monthly</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency((ctcData.basicSalary + ctcData.hra + ctcData.allowances) / 12)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">PF Deduction</p>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(ctcData.pf / 12)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Take Home</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(monthlyTakeHome)}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Benefits Value</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency((ctcData.gratuity + ctcData.medicalInsurance + ctcData.bonus) / 12)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTCSalaryUI;