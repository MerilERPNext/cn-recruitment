import React from "react";
import { PersonalInfoProps } from "./MyProfile";
import { Building2, Calendar, User, MapPin, Clock, Users } from "lucide-react";

const InfoCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  items: Array<{ label: string; value: string | undefined }>;
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

export const CompanyInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return undefined;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString.split("-").reverse().join("-");
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Company Information
        </h2>
        <p className="text-gray-600">
          Your employment details and organizational information
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Employment Details */}
        <InfoCard
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          title="Employment Details"
          items={[
            {
              label: "Employee ID",
              value: user?.employee
            },
            {
              label: "Department",
              value: user?.department
            },
            {
              label: "Designation",
              value: user?.designation
            },
            {
              label: "Employment Type",
              value: user?.employment_type
            }
          ]}
        />

        {/* Work Information */}
        <InfoCard
          icon={<MapPin className="w-5 h-5 text-blue-600" />}
          title="Work Information"
          items={[
            {
              label: "Company",
              value: user?.company
            },
            {
              label: "Branch",
              value: user?.branch
            },
            {
              label: "Default Shift",
              value: user?.default_shift
            },
            {
              label: "Status",
              value: user?.status
            }
          ]}
        />

        {/* Timeline */}
        <InfoCard
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          title="Timeline"
          items={[
            {
              label: "Date of Joining",
              value: formatDate(user?.date_of_joining)
            },
            {
              label: "Confirmation Date",
              value: formatDate(user?.final_confirmation_date)
            },
            {
              label: "Contract End",
              value: formatDate(user?.contract_end_date)
            }
          ]}
        />

        {/* Reporting */}
        <InfoCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          title="Reporting Structure"
          items={[
            {
              label: "Reports To",
              value: user?.reports_to
            },
            {
              label: "Grade",
              value: user?.grade
            },
            {
              label: "Cost Center",
              value: user?.payroll_cost_center
            }
          ]}
        />
      </div>

      {/* Additional Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Clock className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h4 className="font-semibold text-green-900 mb-2">Work Schedule</h4>
            <p className="text-green-700 text-sm">
              Your current shift is <strong>{user?.default_shift || "Standard"}</strong>.
              For any schedule changes or shift requests, please contact your manager
              or use the shift request feature in the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfo;
