import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import {
  useEmployeeDocument,
  useSubmitAcknowledgement,
} from "../../hooks/useEmployeeDocuments";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
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

const EmployeeDocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("awaiting");
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

  const { data, isLoading } = useEmployeeDocument(employeeId);
  const { mutate: submitAcknowledgement } = useSubmitAcknowledgement();

  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canViewPersonalDocument = isActionEnabled(
    userUiPermission,
    "view_personal_document",
    "Employee Profile",
  );
  const canDownloadPersonalDocument = isActionEnabled(
    userUiPermission,
    "download_personal_document",
    "Employee Profile",
  );
  const canViewSystemDocument = isActionEnabled(
    userUiPermission,
    "view_system_document",
    "Employee Profile",
  );
  const canDownloadSystemDocument = isActionEnabled(
    userUiPermission,
    "download_system_document",
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

  const filteredDocuments = documents.filter((doc: DocumentItem) => {
    if (activeTab === "awaiting") return doc.type === "Personal";
    if (activeTab === "mydocs") return doc.status === "Acknowledgement Required";
    if (activeTab === "approved") return doc.type !== "Personal" && doc.status === "Approved";
    return true;
  });

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
      count: documents.filter((doc: DocumentItem) => doc.type === "Personal").length,
    },
    {
      key: "mydocs",
      label: "Awaiting My Acknowledgment",
      count: documents.filter((doc: DocumentItem) => doc.status === "Acknowledgement Required").length,
    },
    {
      key: "approved",
      label: "Documents Approved",
      count: documents.filter((doc: DocumentItem) => doc.type?.trim().toLowerCase() !== "personal" && doc.status === "Approved").length,
    },
  ];

  return (
    <DesktopLayoutWrapper title="My Documents">
      {isMobile && <HeaderBar title="My Documents" />}
      <div className={`bg-gray-50  bg-white min-h-screen ${isMobile ? "px-4 py-4" : "px-0 py-3 md:p-6"}`}>
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
                label: `${tab.label} (${tab.count})`,
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
                <span className="ml-1">({tab.count})</span>
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
              loadMorePagination={true}
            />
          </CardTable>
        </div>

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
