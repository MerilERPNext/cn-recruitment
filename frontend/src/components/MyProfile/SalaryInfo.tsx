import React from "react";
import { PersonalInfoProps } from "./MyProfile";

const InfoRow: React.FC<{
  label: string;
  value: string | number | undefined;
}> = ({ label, value }) => (
  <div className="grid grid-cols-2 py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm text-gray-900 font-medium text-right">
      {value}
    </span>
  </div>
);

export const SalaryInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  return (
    <div className="rounded-xl min-h-screen space-y-6 max-w-md m-4">
      {/* Salary Info */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          Salary Information
        </h2>
        <div className="bg-white shadow rounded-lg p-4">
          <InfoRow
            label="Total CTC"
            value={`${user?.salary_currency} ${user?.ctc}`}
          />
          <InfoRow
            label="PF Account Number"
            value={user?.provident_fund_account}
          />
          <InfoRow label="ESIC Number" value="1234567890" />
        </div>
      </div>

      {/* Bank Details */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          Bank Details
        </h2>
        <div className="bg-white shadow rounded-lg p-4">
          <InfoRow label="Bank Name" value={user?.bank_name} />
          <InfoRow label="Account Number" value={user?.bank_ac_no} />
          <InfoRow label="IFSC Code" value={user?.ifsc_code} />
        </div>
      </div>
    </div>
  );
};

export default SalaryInfo;
