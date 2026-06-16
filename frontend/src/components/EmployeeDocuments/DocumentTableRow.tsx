import React from "react";
import Button from "../shared/atoms/Button";
import { getFileNameFromUrl } from "../../utils/urlFormating";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { DocumentItem } from "../../types/employeeDocument";

interface DocumentTableRowProps {
  doc: DocumentItem;
  canViewDocument: boolean;
  canDownloadDocument: boolean;
  getFileUrl: (path: string) => string;
  setSelectedFile: (file: string | null) => void;
  setSelectedDocId: (id: string | null) => void;
}

export const DocumentTableRow: React.FC<DocumentTableRowProps> = ({
  doc,
  canViewDocument,
  canDownloadDocument,
  getFileUrl,
  setSelectedFile,
  setSelectedDocId,
}) => {
  return (
    <div
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors grid items-center px-6 py-4 gap-4 text-center"
      style={{ gridTemplateColumns: "3fr 2fr 1.5fr 1.5fr 2fr" }}
    >
      <div className="font-medium truncate pr-4 text-sm">
        {getFileNameFromUrl(doc.file_name)}
      </div>
      <div className="text-gray-600 truncate pr-4 text-sm">
        {doc.employee_name}
      </div>
      <div className="text-gray-600 text-sm">
        {formatToIndianDate(doc.creation)}
      </div>
      <div>
        <span
          className={`text-xs font-medium px-3 py-1 whitespace-nowrap rounded-xl ${doc.status === "Approved"
            ? "bg-green-100 text-green-700"
            : doc.status === "Acknowledgement Required"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
            }`}
        >
          {doc.status}
        </span>
      </div>
      <div>
        <div className="flex gap-2 justify-center items-center">
          {doc.status === "Approved" && (
            <>
              {canViewDocument && (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setSelectedFile(doc.file_name)}
                >
                  View
                </Button>
              )}
              {canDownloadDocument && (
                <a href={getFileUrl(doc.file_name)} download>
                  <Button variant="contain" size="sm">Download</Button>
                </a>
              )}
            </>
          )}
          {doc.status === "Acknowledgement Required" && (
            <Button
              variant="contain"
              size="sm"
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
    </div>
  );
};
