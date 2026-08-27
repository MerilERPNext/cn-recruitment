import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import {
  useEmployeeDocument,
  useEmployeeDocumentCount,
  useSubmitAcknowledgement,
} from "../../hooks/useEmployeeDocuments";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { getActionsEnabled } from "../../utils/uiPermission";
import { useTargetUser } from "../../context/ViewedUserContext";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import { FilePreview } from "../shared/molecules/FilePreview";
import HeaderBar from "../../components/HeaderBar";
import CardTable from "../shared/CardTable";
import { StaticListView } from "../ListView";
import CustomDropdown from "../shared/CustomDropdown";
import { DocumentMobileCard } from "./DocumentMobileCard";
import { DocumentTableRow } from "./DocumentTableRow";
import { DocumentItem } from "../../types/employeeDocument";
import { FilterCondition } from "../../types/frappe";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

const EmployeeDocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("awaiting");
  const [pageMap, setPageMap] = useState<Record<string, number>>({
    awaiting: 1,
    mydocs: 1,
    approved: 1,
  });
  const currentPage = pageMap[activeTab] ?? 1;
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const { targetEmployeeId } = useTargetUser();
  const queryClient = useQueryClient();

  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const employeeId = useMemo(() => {
    if (targetEmployeeId && targetEmployeeId.trim() !== "") {
      return targetEmployeeId;
    }
    return user?.employee || "";
  }, [targetEmployeeId, user?.employee]);

  const tabFilters = useMemo((): FilterCondition[] => {
    switch (activeTab) {
      case "awaiting":
        return [["type", "=", "Personal"]];
      case "mydocs":
        return [["status", "=", "Acknowledgement Required"]];
      case "approved":
        return [["type", "!=", "Personal"], ["status", "=", "Approved"]];
      default:
        return [];
    }
  }, [activeTab]);

  const { data: documents = [], isLoading } = useEmployeeDocument(employeeId, currentPage, PAGE_SIZE, tabFilters);
  const { data: totalCount = 0 } = useEmployeeDocumentCount(employeeId, tabFilters);
  const { mutate: submitAcknowledgement } = useSubmitAcknowledgement();

  const { data: userUiPermission } = useGetUiPermission("Profile");
  const {
    view_personal_document: canViewPersonalDocument,
    download_personal_document: canDownloadPersonalDocument,
    view_system_document: canViewSystemDocument,
    download_system_document: canDownloadSystemDocument,
  } = getActionsEnabled(
    userUiPermission,
    [
      "view_personal_document",
      "download_personal_document",
      "view_system_document",
      "download_system_document",
    ],
    "Employee Profile",
  );

  const handleSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedDocId) return;

    submitAcknowledgement(selectedDocId, {
      onSuccess: () => {
        toast.success("Acknowledgement submitted successfully!");
        setSelectedFile(null);
        setSelectedDocId(null);
        setAcknowledged(false);
        queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
      },
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAcknowledged(e.target.checked);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setPageMap((prev) => ({ ...prev, [activeTab]: page }));
  };

  const startItem = documents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = (currentPage - 1) * PAGE_SIZE + documents.length;

  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const closeModal = () => setSelectedFile(null);

  const showAcknowledgement = documents.some(
    (doc: DocumentItem) =>
      doc.file_name === selectedFile &&
      doc.status === "Acknowledgement Required"
  );

  const getFileUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${window.location.origin}${path}`;
  };

  const tabs = [
    {
      key: "awaiting",
      label: "My Documents",
    },
    {
      key: "mydocs",
      label: "Awaiting My Acknowledgment",
    },
    {
      key: "approved",
      label: "Documents Approved",
    },
  ];

  return (
    <DesktopLayoutWrapper title="My Documents">
      {isMobile && <HeaderBar title="My Documents" />}
      <div className={`bg-white min-h-screen ${isMobile ? "px-4 py-4" : "px-0 py-3 md:p-6"}`}>
        {!isMobile && (
          <div className="flex items-start justify-between">
            <div className="border-gray-200 my-2 pb-2">
              <Typography
                variant="h4"
                className="font-bold text-gray-900 mb-2 text-xl sm:text-2xl"
              >
                My Documents
              </Typography>
              <Typography
                variant="bodyMedium"
                color="body2"
                className="max-sm:text-sm"
              >
                View and manage all your employee documents in one place
              </Typography>
            </div>
          </div>
        )}

        {isMobile ? (
          <div className="w-full mb-4 flex justify-end">
            <CustomDropdown
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              options={tabs.map((tab) => ({
                value: tab.key,
                label: tab.label + (activeTab === tab.key ? ` (${totalCount})` : ""),
              }))}
              position="bottom-left"
            />
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-1 py-2 mb-4 scrollbar-hide">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant="subtle"
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap ${activeTab === tab.key
                  ? "bg-primary-50 text-header-active"
                  : "text-header-inactive hover:text-header-active"
                  }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        )}

        <div className={isMobile ? "" : "bg-white border rounded-xl overflow-hidden shadow-sm min-h-[45vh]"}>
          <CardTable
            titles={["Document Name", "Employee", "Date Uploaded", "Status", "Action"]}
            columnWidths={["3fr", "2fr", "1.5fr", "1.5fr", "2fr"]}
            noBorder
            noShadow
            noRound
          >
            <StaticListView
              data={documents}
              ItemComponent={(_, doc) => {
                const canView = doc.type === "Personal" ? canViewPersonalDocument : canViewSystemDocument;
                const canDownload = doc.type === "Personal" ? canDownloadPersonalDocument : canDownloadSystemDocument;

                return isMobile ? (
                  <DocumentMobileCard
                    doc={doc}
                    canViewDocument={canView}
                    canDownloadDocument={canDownload}
                    getFileUrl={getFileUrl}
                    setSelectedFile={setSelectedFile}
                    setSelectedDocId={setSelectedDocId}
                  />
                ) : (
                  <DocumentTableRow
                    doc={doc}
                    canViewDocument={canView}
                    canDownloadDocument={canDownload}
                    getFileUrl={getFileUrl}
                    setSelectedFile={setSelectedFile}
                    setSelectedDocId={setSelectedDocId}
                  />
                );
              }}
              isLoading={isLoading}
              pageSize={PAGE_SIZE}
              loadMorePagination={false}
            />
          </CardTable>
        </div>

        {/* Pagination */}
        {!isLoading && (hasNextPage || hasPrevPage) && (
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border border-t-0 rounded-b-xl bg-white mt-1">
            <p className="text-sm text-gray-500 whitespace-nowrap">
              {documents.length === 0
                ? "No results"
                : `Showing ${startItem} to ${endItem} of ${totalCount} documents`}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevPage}
                className={`w-8 h-8 flex items-center justify-center rounded border text-sm
                  ${!hasPrevPage
                    ? "text-gray-300 border-gray-200 cursor-not-allowed"
                    : "text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
              >
                <ChevronLeft size={16} />
              </button>

              {getVisiblePages().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium
                    ${currentPage === page
                      ? "bg-primary text-white border-primary"
                      : "text-gray-600 border-gray-300 hover:bg-gray-100"
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className={`w-8 h-8 flex items-center justify-center rounded border text-sm
                  ${!hasNextPage
                    ? "text-gray-300 border-gray-200 cursor-not-allowed"
                    : "text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* PDF Modal */}
        {selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white shadow-lg w-full h-screen flex flex-col">
              <div className="flex justify-between items-center border-b p-4">
                <Typography
                  variant="h3"
                  className="font-semibold text-gray-800 text-lg"
                >
                  Document Preview
                </Typography>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <FilePreview
                  fileUrl={getFileUrl(selectedFile)}
                  fileName={selectedFile}
                  className="h-full"
                />
              </div>
              <div className="flex justify-between items-center border-t p-4">
                <div>
                  {showAcknowledgement && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="acknowledgeCheckbox"
                        checked={acknowledged}
                        onChange={handleCheckboxChange}
                        className="accent-green-600 w-4 h-4 cursor-pointer"
                      />
                      <span
                        className={`font-medium ${acknowledged ? "text-green-700" : "text-gray-700"
                          }`}
                      >
                        I acknowledge this document
                      </span>
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="soft" onClick={closeModal}>
                    Close
                  </Button>
                  {showAcknowledgement && acknowledged && (
                    <Button variant="contain" onClick={handleSubmit}>
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DesktopLayoutWrapper>
  );
};

export default EmployeeDocumentsPage;
