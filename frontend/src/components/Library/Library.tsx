/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
  useEmployeeDocument,
  useSubmitAcknowledgement,
} from "../../hooks/useEmployeeDocuments";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { getActionsEnabled } from "../../utils/uiPermission";
import Button from "../shared/atoms/Button";
import { useTargetUser } from "../../context/ViewedUserContext";
import { Typography } from "../shared/atoms/Typography";
import { FilePreview } from "../shared/molecules/FilePreview";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import CardTable from "../shared/CardTable";
import { StaticListView } from "../ListView";
import { DocumentMobileCard } from "../EmployeeDocuments/DocumentMobileCard";
import { DocumentTableRow } from "../EmployeeDocuments/DocumentTableRow";

const DocumentLibrary = () => {
  const [activeTab, setActiveTab] = useState("awaiting");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { targetEmployeeId } = useTargetUser();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const employeeId = useMemo(() => {
    if (targetEmployeeId && targetEmployeeId.trim() !== "") {
      return targetEmployeeId;
    }
    return user?.employee || "";
  }, [targetEmployeeId, user?.employee]);

  const { data, isLoading } = useEmployeeDocument(employeeId);
  const [acknowledged, setAcknowledged] = useState(false);

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

  const documents = useMemo(() => data || [], [data]);

  const filteredDocuments = documents.filter((doc: any) => {
    if (activeTab === "awaiting") return doc.type === "Personal";
    if (activeTab === "mydocs") return doc.status === "Acknowledgement Required";
    if (activeTab === "approved") return doc.type !== "Personal" && doc.status === "Approved";
    return true;
  });

  const closeModal = () => setSelectedFile(null);

  const showAcknowledgement = documents.some(
    (doc: any) =>
      doc.file_name === selectedFile &&
      doc.status === "Acknowledgement Required",
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
      count: documents.filter((doc: any) => doc.type === "Personal").length,
    },
    {
      key: "mydocs",
      label: "Awaiting My Acknowledgment",
      count: documents.filter((doc: any) => doc.status === "Acknowledgement Required").length,
    },
    {
      key: "approved",
      label: "Documents Approved",
      count: documents.filter((doc: any) => doc.type?.trim().toLowerCase() !== "personal" && doc.status === "Approved").length,
    },
  ];

  return (
    <div className="bg-app px-0 py-3 text-text-body1 md:p-6">
      <div className="flex items-start justify-between">
        <div className="border-border my-2 pb-2">
          <Typography variant="h4" className="mb-2 text-xl font-bold text-text-title sm:text-2xl">
            Document Library
          </Typography>
          <Typography variant="bodyMedium" color="body2" className="max-sm:text-sm">
            Your document library
          </Typography>
        </div>
      </div>

      {isMobile ? (
        <div className="w-full mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full rounded-md border border-border bg-card p-2 text-text-body1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {tabs.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label} ({tab.count})
              </option>
            ))}
          </select>
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
                ? "bg-primary/15 text-text-link"
                : "text-text-body2 hover:text-text-title"
                }`}
            >
              {tab.label}
              <span className="ml-1">({tab.count})</span>
            </Button>
          ))}
        </div>
      )}

      <div className={isMobile ? "" : "min-h-[45vh] overflow-hidden rounded-xl border border-border bg-card shadow-sm"}>
        <CardTable
          titles={["Document Name", "Employee", "Date Uploaded", "Status", "Action"]}
          columnWidths={["3fr", "2fr", "1.5fr", "1.5fr", "2fr"]}
          noBorder
          noShadow
          noRound
        >
          <StaticListView
            data={filteredDocuments}
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
            pageSize={20}
            loadMorePagination
          />
        </CardTable>
      </div>

      {/* PDF Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex h-screen w-full flex-col bg-card text-text-body1 shadow-lg">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Typography variant="h3" className="text-lg font-semibold text-text-title">
                Document Preview
              </Typography>
              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-xl text-text-body2 transition-colors hover:border-border-strong hover:bg-gray-100 hover:text-text-title"
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
            <div className="flex items-center justify-between border-t border-border p-4">
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
                    <span className={`font-medium ${acknowledged ? "text-green-700" : "text-text-body1"}`}>
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
  );
};

export default DocumentLibrary;
