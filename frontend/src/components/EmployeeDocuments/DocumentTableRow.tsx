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
      className="border-b border-border hover:bg-gray-50 transition-colors grid items-center px-6 py-4 gap-4 text-center text-text-body1"
      style={{ gridTemplateColumns: "3fr 2fr 1.5fr 1.5fr 2fr" }}
    >
      <div className="font-semibold truncate pr-4 text-sm text-slate-800 dark:text-slate-100">
        {getFileNameFromUrl(doc.file_name)}
      </div>
      <div className="text-slate-600 dark:text-slate-300 truncate pr-4 text-sm">
        {doc.employee_name}
      </div>
      <div className="text-slate-600 dark:text-slate-300 text-sm">
        {formatToIndianDate(doc.creation)}
      </div>
      <div>
        <span
        className={`text-xs font-medium px-3 py-1 whitespace-nowrap rounded-xl ${doc.status === "Approved"
            ? "bg-success/15 text-success"
            : doc.status === "Acknowledgement Required"
              ? "bg-warning/15 text-warning"
              : "bg-error/15 text-error"
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
                  variant="outline"
                  size="sm"
                  className="bg-primary/10 text-text-link hover:bg-primary/20 border-border"
                  onClick={() => setSelectedFile(doc.file_name)}
                >
                  View
                </Button>
              )}
              {canDownloadDocument && (
                <a href={getFileUrl(doc.file_name)} download>
                  <Button variant="contain" size="sm" className="bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-700 dark:hover:bg-cyan-600 !text-white">
                    Download
                  </Button>
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
              className="bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-700 dark:hover:bg-cyan-600 !text-white"
            >
              Acknowledge
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
