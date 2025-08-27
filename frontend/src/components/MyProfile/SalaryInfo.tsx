import React from "react";
import { PersonalInfoProps } from "./MyProfile";
import { DollarSign, CreditCard, Building } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";

const InfoCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  items: Array<{ label: string; value: string | number | undefined }>;
}> = ({ icon, title, items }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center mb-6">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center py-2">
          <span className="text-sm font-medium text-gray-600">{item.label}</span>
          <span className="text-sm text-gray-900 font-semibold bg-gray-100 px-3 py-1 rounded-lg">
            {item.value || "N/A"}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const MobileInfoRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <span className="text-sm text-gray-800">{value || "N/A"}</span>
  </div>
);

const MobileSectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="text-base font-semibold text-gray-900 mb-3 mt-6 first:mt-0">
    {title}
  </h3>
);

export const SalaryInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const { isDesktop } = useScreenSize(); // ✅ useScreenSize hook
  const isMobile = !isDesktop;

  if (isMobile) {
    return (
      <div className="p-4 space-y-4">
        <MobileSectionHeader title="Salary Information" />
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <MobileInfoRow
            label="Total CTC"
            value={
              user?.ctc
                ? `${user?.salary_currency || ""} ${user.ctc.toLocaleString()}`
                : undefined
            }
          />
          <MobileInfoRow label="PF Account Number" value={user?.provident_fund_account} />
          <MobileInfoRow label="ESIC Number" value="1234567890" />
          <MobileInfoRow label="PAN Number" value={user?.pan_number} />
        </div>

        <MobileSectionHeader title="Bank Details" />
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <MobileInfoRow label="Bank Name" value={user?.bank_name} />
          <MobileInfoRow label="Account Number" value={user?.bank_ac_no} />
          <MobileInfoRow label="IFSC Code" value={user?.ifsc_code} />
          <MobileInfoRow label="Account Type" value="Savings" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Compensation & Banking
        </h2>
        <p className="text-gray-600">
          View your salary details and banking information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InfoCard
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          title="Salary Information"
          items={[
            {
              label: "Total CTC",
              value: user?.ctc
                ? `${user?.salary_currency || ""} ${user.ctc.toLocaleString()}`
                : undefined,
            },
            { label: "PF Account Number", value: user?.provident_fund_account },
            { label: "ESIC Number", value: "1234567890" }, // ✅ keep hardcoded
            { label: "PAN Number", value: user?.pan_number },
          ]}
        />

        {/* Bank Details */}
        <InfoCard
          icon={<Building className="w-5 h-5 text-blue-600" />}
          title="Bank Details"
          items={[
            { label: "Bank Name", value: user?.bank_name },
            { label: "Account Number", value: user?.bank_ac_no },
            { label: "IFSC Code", value: user?.ifsc_code },
            { label: "Account Type", value: "Savings" },
          ]}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <CreditCard className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Payment Information</h4>
            <p className="text-blue-700 text-sm">
              Your salary is processed on the last working day of each month.
              For any discrepancies or questions about your compensation,
              please contact the HR department.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryInfo;
