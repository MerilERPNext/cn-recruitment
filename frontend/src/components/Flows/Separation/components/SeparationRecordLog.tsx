
import React, { useState } from "react";
import { FlowRequestItem } from "../../../../types/flows";
import Avatar from "../../../shared/Avatar";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import defaultProfile from "../../../../assets/user.png";

interface SeparationRecordLogProps {
  separationRecords?: FlowRequestItem[];
}

export const SeparationRecordLog: React.FC<SeparationRecordLogProps> = ({
  separationRecords,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const records = separationRecords || [];

  if (records.length === 0) {
    return null;
  }

  const handleShowDetails = (requestId: string) => {
    navigate(`/webapp/flow-app/separation-record/${requestId}`);
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full">
      <div
        className="flex items-center justify-between cursor-pointer select-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <Typography variant="h4" color="title" className="font-bold tracking-tight text-gray-900 group-hover:text-primary transition-colors duration-200">
            Activity Log
          </Typography>
          <Typography variant="bodySmall" color="body2" className="mt-1 text-gray-500">
            History of separation requests and their current statuses
          </Typography>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 transition-colors p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isOpen && (
        <div className="mt-6 space-y-4">
          {records.map((record) => (
            <RecordItem
              key={record.request_id}
              record={record}
              handleShowDetails={handleShowDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RecordItem = ({ record, handleShowDetails }: { record: FlowRequestItem, handleShowDetails: (requestId: string) => void }) => {
  const stage = record.approval_stages?.find(stage => {
    const cs = stage.todo?.reference_document?.custom_status;
    if (typeof cs === "string" && cs.toLowerCase() !== "pending") {
      return true;
    }
    return false;
  });
  const customStatus = (stage?.todo?.reference_document?.custom_status || record.approval_status || "Pending") as string;

  return (
    <div
      key={record.request_id}
      className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-100 hover:shadow-md hover:shadow-blue-50/50 transition-all duration-300 max-w-3xl w-full group"
      onClick={() => handleShowDetails(record.request_id)}
    >
      <div className="flex items-start gap-4">
        <div className="relative rounded-full ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all duration-300 h-10 w-10 flex items-center justify-center">
          <Avatar
            name={"User"}
            src={defaultProfile}
            size="h-10 w-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors duration-200"
          >
            {record.activity_statement}
          </Typography>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
            <StatusBadge size="sm" status={customStatus} />
            {record.activity_timestamp && (
              <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatToIndianDate(record.activity_timestamp)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end sm:justify-start">
        <Button
          variant="soft"
          bgColor="primary"
          size="sm"
          className="shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-300"
        >
          View Record
        </Button>
      </div>
    </div>
  );
};

export default SeparationRecordLog;
