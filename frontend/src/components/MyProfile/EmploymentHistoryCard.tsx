import React from "react";
import { Building2, ExternalLink, IdCard, MapPin, Warehouse } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Typography } from "../shared/atoms/Typography";

interface EmploymentHistoryCardProps {
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  isCurrent?: boolean;
  department?: string | null;
  location?: string | null;
  id?: string | null;
  doctype_name: string | null;
}

const EmploymentHistoryCard: React.FC<EmploymentHistoryCardProps> = ({
  title,
  start_date,
  end_date,
  isCurrent,
  department,
  location,
  id,
  doctype_name,
}) => {
  const formatDate = (date?: string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "dd-MM-yyyy");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border hover-lift p-6 relative max-w-[90vw] min-w-[90vw]  md:min-w-[400px] md:max-w-[400px]">
      <div className="flex items-center gap-3  mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex flex-col gap-1">
          {doctype_name === 'Employee' ? <Link to={`/webapp/employee-profile?target_user=${id}`} target="_blank">
            <h3 className="font-medium text-gray-900 truncate flex gap-1 items-center hover:text-primary">
              <span>{title}</span><ExternalLink className="h-4 w-4" />
            </h3>
          </Link> : <h3 className="font-medium text-gray-900 truncate">
            <span>{title}</span>
          </h3>}
          <div className="flex flex-wrap gap-4">
            {id && (
              <Typography
                variant="label"
                color="secondary"
                className="font-medium truncate flex items-center gap-1.5"
              >
                <IdCard size={14} className="text-primary-500" />
                <span>{id}</span>
              </Typography>
            )}
            {department && (
              <Typography
                variant="label"
                color="secondary"
                className="font-medium truncate flex items-center gap-1.5"
              >
                <Warehouse size={14} className="text-primary-500" />
                <span>{department}</span>
              </Typography>
            )}
            {location && (
              <Typography
                variant="label"
                color="secondary"
                className="font-medium truncate flex items-center gap-1.5"
              >
                <MapPin size={14} className="text-primary-500" />
                <span>{location}</span>
              </Typography>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Start Date</span>
          <span className="text-sm font-medium bg-gray-50 px-3 py-1 rounded-md">
            {formatDate(start_date)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">End Date</span>
          <span
            style={{
              backgroundColor: `${isCurrent ? "#DCFCE7" : "#F9FAFB"}`,
              color: `${isCurrent ? "#166534" : ""}`,
            }}
            className="text-sm font-medium px-3 py-1 rounded-md"
          >
            {end_date ? formatDate(end_date) : "Present"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmploymentHistoryCard;
