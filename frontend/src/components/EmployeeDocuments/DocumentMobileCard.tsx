import React from "react";
import { Typography } from "../shared/atoms/Typography";
import Tooltip from "../shared/Tooltip";
import Button from "../shared/atoms/Button";
import { getFileNameFromUrl } from "../../utils/urlFormating";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { DocumentItem } from "../../types/employeeDocument";

interface DocumentMobileCardProps {
  doc: DocumentItem;
  canViewDocument: boolean;
  canDownloadDocument: boolean;
  getFileUrl: (path: string) => string;
  setSelectedFile: (file: string | null) => void;
  setSelectedDocId: (id: string | null) => void;
}

export const DocumentMobileCard: React.FC<DocumentMobileCardProps> = ({
  doc,
  canViewDocument,
  canDownloadDocument,
  getFileUrl,
  setSelectedFile,
  setSelectedDocId,
}) => {
  return (
    <div className="flex flex-col gap-3 p-4 border-1 borer-primary shadow-sm mt-3 rounded-lg bg-white ">
      <div className="flex justify-between items-start mb-1 gap-2 pb-2">
        <div className="flex flex-col min-w-0 flex-1">
          <Tooltip content={getFileNameFromUrl(doc.file_name)} position="tl" triggerClassName="w-full">
            <Typography variant="bodyMedium" color="title" className="font-semibold truncate block">
              {getFileNameFromUrl(doc.file_name)}
            </Typography>
          </Tooltip>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 whitespace-nowrap rounded-lg flex-shrink-0 ${doc.status === "Approved"
            ? "bg-green-100 text-green-700"
            : doc.status === "Acknowledgement Required"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
            }`}
        >
          {doc.status}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <Typography variant="label" className="text-gray-500 font-medium mb-1 block text-[11px] uppercase tracking-wider">
            Employee
          </Typography>
          <Typography variant="bodyMedium" color="title" className="font-medium truncate block">
            {doc.employee_name}
          </Typography>
        </div>

        <div className="flex flex-col min-w-0">
          <Typography variant="label" className="text-gray-500 font-medium mb-1 block text-[11px] uppercase tracking-wider">
            Date Uploaded
          </Typography>
          <Typography variant="bodyMedium" color="title" className="font-medium truncate block">
            {formatToIndianDate(doc.creation)}
          </Typography>
        </div>
      </div>

      <div className="flex gap-2 items-center pt-3 mt-1">
        {doc.status === "Approved" && (
          <>
            {canViewDocument && (
              <Button
                variant="soft"
                size="sm"
                className="flex-1 justify-center"
                onClick={() => setSelectedFile(doc.file_name)}
              >
                View
              </Button>
            )}
            {canDownloadDocument && (
              <a href={getFileUrl(doc.file_name)} download className="flex-1">
                <Button variant="contain" size="sm" className="w-full justify-center">Download</Button>
              </a>
            )}
          </>
        )}
        {doc.status === "Acknowledgement Required" && (
          <Button
            variant="contain"
            size="sm"
            className="flex-1 justify-center"
            onClick={() => {
              setSelectedFile(doc.file_name);
              setSelectedDocId(doc.name);
            }}
          >
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
};
