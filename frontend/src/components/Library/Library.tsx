/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
  useEmployeeDocument,
  useSubmitAcknowledgement,
} from "../../hooks/useEmployeeDocuments";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import Button from "../shared/atoms/Button";
import { useTargetUser } from "../../context/ViewedUserContext";
import { LibraryTableSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { Typography } from "../shared/atoms/Typography";
import { FilePreview } from "../shared/molecules/FilePreview";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getFileNameFromUrl } from "../../utils/urlFormating";

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
    <div className="bg-white px-0 py-3 md:p-6">
      <div className="flex items-start justify-between">
        <div className="border-gray-200 my-2 pb-2">
          <Typography variant="h4" className="font-bold text-gray-900 mb-2 text-xl sm:text-2xl">
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
            className="w-full border border-gray-300 rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="bg-white border rounded-xl overflow-scroll shadow-sm min-h-[45vh]">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 text-sm font-semibold">
            <tr>
              <th className="py-3 px-6">Document Name</th>
              <th className="py-3 px-6">Employee</th>
              <th className="py-3 px-6">Date Uploaded</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6">Action</th>
            </tr>
          </thead>

          {isLoading ? (
            <LibraryTableSkeleton />
          ) : (
            <tbody className="text-gray-800">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc: any, i: number) => (
                  <tr
                    key={i}
                    className="border-t hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium">{getFileNameFromUrl(doc.file_name)}</td>
                    <td className="py-4 px-6 text-gray-600">
                      {doc.employee_name}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(doc.creation).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-sm font-medium px-3 py-1 whitespace-nowrap rounded-xl ${doc.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "Acknowledgement Required"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2 items-center">
                        {(doc.status === "Approved") && (
                          <>
                            {(doc.type === "Personal" ? canViewPersonalDocument : canViewSystemDocument) && (
                              <Button
                                variant="soft"
                                onClick={() => setSelectedFile(doc.file_name)}
                              >
                                View
                              </Button>
                            )}
                            {(doc.type === "Personal" ? canDownloadPersonalDocument : canDownloadSystemDocument) && (
                              <a href={getFileUrl(doc.file_name)} download>
                                <Button variant="contain">
                                  Download
                                </Button>
                              </a>
                            )}
                          </>
                        )}
                        {doc.status === "Acknowledgement Required" && (
                          <Button
                            variant="contain"
                            onClick={() => {
                              setSelectedFile(doc.file_name);
                              setSelectedDocId(doc.name);
                            }}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-gray-500 py-6 font-medium"
                  >
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>

      {/* PDF Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50  flex items-center justify-center z-50">
          <div className="bg-white  shadow-lg w-full h-screen flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <Typography variant="h3" className="font-semibold text-gray-800 text-lg">
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
                    <span className={`font-medium ${acknowledged ? "text-green-700" : "text-gray-700"}`}>
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
