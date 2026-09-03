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
      className="border-b border-slate-100 dark:border-[#1E3A4C]/60 hover:bg-slate-50 dark:hover:bg-[#102030] transition-colors grid items-center px-6 py-4 gap-4 text-center text-slate-800 dark:text-slate-100"
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
          className={`text-xs font-semibold px-3 py-1 whitespace-nowrap rounded-xl border ${doc.status === "Approved"
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
            : doc.status === "Acknowledgement Required"
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
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
                  onClick={() => setSelectedFile(doc.file_name)}
                  className="border-slate-300 dark:border-[#1E3A4C] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162A3E]"
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
