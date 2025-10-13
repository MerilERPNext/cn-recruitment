import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { formatCurrency } from "../../utils/currencyFormatter";
import { StatusBadge } from "../SalarySlip/Advances/StatusBadge";

// Mock Data (replace later with API)
const mockAdvances = [
  {
    name: "HR-EAD-2025-00011",
    employee_name: "Vishal R",
    posting_date: "2025-10-13",
    company: "Hybrowlabs Technologies",
    department: "Operations",
    advance_amount: 100000,
    paid_amount: 0,
    pending_amount: 100000,
    status: "Draft",
  },
  {
    name: "HR-EAD-2025-00012",
    employee_name: "Anjali S",
    posting_date: "2025-10-10",
    company: "Hybrowlabs Technologies",
    department: "Finance",
    advance_amount: 50000,
    paid_amount: 20000,
    pending_amount: 30000,
    status: "Approved",
  },
];

const AdvanceExpenseList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const advancesData = mockAdvances;

  const DesktopLayout = () => (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-[100vw] mx-auto py-0">
        <div className="px-0">
          <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="my-table-header">
              <div className="grid grid-cols-6 gap-4">
                <div className="my-table-header-text">Employee</div>
                <div className="my-table-header-text">Posting Date</div>
                <div className="my-table-header-text">Company</div>
                <div className="my-table-header-text">Department</div>
                <div className="my-table-header-text">Advance Amount</div>
                <div className="my-table-header-text">Status</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {advancesData.map((adv, index) => (
                <div
                  key={`${adv.name}-${index}`}
                  className="my-data-row grid grid-cols-6 gap-4 cursor-pointer py-2"
                >
                  <div className="my-data-cell">{adv.employee_name}</div>
                  <div className="my-data-cell">
                    {formatToIndianDate(adv.posting_date)}
                  </div>
                  <div className="my-data-cell">{adv.company}</div>
                  <div className="my-data-cell">{adv.department}</div>
                  <div className="my-data-cell">
                    {formatCurrency(adv.advance_amount)}
                  </div>
                  <div className="my-data-cell">
                    <StatusBadge status={adv.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {advancesData.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500">No advances found.</p>
          </div>
        )}
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="min-h-screen w-full bg-gray-50 space-y-3">
      {advancesData.map((adv, index) => (
        <div
          key={`${adv.name}-${index}`}
          className="my-content-card bg-white shadow rounded-lg p-4"
        >
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Advance Amount: {formatCurrency(adv.advance_amount)}
            </div>{" "}
            <StatusBadge status={adv.status} />
          </div>
          <div className="text-sm text-gray-600">
            Employee: {adv.employee_name}
          </div>
          <div className="text-sm text-gray-600">
            Posting Date: {formatToIndianDate(adv.posting_date)}
          </div>
          <div className="text-sm text-gray-600">Company: {adv.company}</div>
          <div className="text-sm text-gray-600">
            Department: {adv.department}
          </div>
        </div>
      ))}

      {advancesData.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-500">No advances found.</p>
        </div>
      )}
    </div>
  );

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default AdvanceExpenseList;
