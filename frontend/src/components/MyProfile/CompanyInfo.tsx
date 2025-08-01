import React from "react";
import { PersonalInfoProps } from "./MyProfile";

const companyData = {
  employeeId: "EMP00123",
  department: "Marketing",
  designation: "Marketing Manager",
  reportingManager: "Ethan Carter",
  dateOfJoining: "August 15, 2021",
  employmentType: "Full-time",
  workLocation: "Remote",
  shift: "9 AM - 6 PM",
};

export const CompanyInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm max-w-md p-6 m-4">
      <InfoRow label="Employee ID" value={user?.employee} />
      <InfoRow label="Department" value={user?.department} />
      <InfoRow label="Designation" value={user?.designation} />
      <InfoRow label="Reporting Manager" value={user?.reports_to} />
      <InfoRow label="Date of Joining" value={user?.date_of_joining} />
      <InfoRow label="Employment Type" value={user?.employment_type} />
      <InfoRow label="Work Location" value={companyData.workLocation} />
      <InfoRow label="Shift" value={user?.default_shift} />
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string | undefined }> = ({
  label,
  value,
}) => (
  <div className="grid grid-cols-2 py-2 my-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm text-gray-900 font-medium text-left">{value}</span>
  </div>
);

export default CompanyInfo;
