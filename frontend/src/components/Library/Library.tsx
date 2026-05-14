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

const DocumentLibrary = () => {
  const [activeTab, setActiveTab] = useState("awaiting");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { targetEmployeeId } = useTargetUser();
  const queryClient = useQueryClient()
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const employeeId = useMemo(() => {
    if (targetEmployeeId && targetEmployeeId.trim() !== "") {
      return targetEmployeeId;
    }
    return user?.employee || "";
  }, [targetEmployeeId, user?.employee]);

  const { data, isLoading } = useEmployeeDocument(employeeId);
  const [isMobile, setIsMobile] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const { mutate: submitAcknowledgement } = useSubmitAcknowledgement();
  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canViewDocument = isActionEnabled(
    userUiPermission,
    "view_employee_document",
    "Employee Profile",
  );
  const canDownloadDocument = isActionEnabled(
    userUiPermission,
    "download_employee_document",
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
        queryClient.invalidateQueries({ queryKey: ["employee-documents"] })
      },
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAcknowledged(e.target.checked);
  };

  const documents = data || [];
  const filteredDocuments = documents.filter((doc: any) => {
    if (activeTab === "awaiting") {
      return doc.type === "Personal";
    } else if (activeTab === "mydocs") {
      return doc.status === "Acknowledgement Required";
    } else if (activeTab === "approved") {
      return doc.type !== "Personal" && doc.status === "Approved";
    }
    return true;
  });

  const closeModal = () => setSelectedFile(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showAcknowledgement = filteredDocuments.some(
    (doc: any) =>
      doc.file_name === selectedFile &&
      doc.status === "Acknowledgement Required",
  );

  const getFileUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${window.location.origin}${path}`;
  };

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {/* MOBILE VIEW */}
        {isMobile ? (
          <div className="w-full">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="awaiting">
                My Documents (
                {documents.filter((doc) => doc.status === "Draft").length})
              </option>
              <option value="mydocs">
                Awaiting My Acknowledgment (
                {
                  documents.filter(
                    (doc) => doc.status === "Acknowledgement Required",
                  ).length
                }
                )
              </option>
              <option value="approved">
                Documents Approved (
                {documents.filter((doc) => doc.status === "Approved").length})
              </option>
            </select>
          </div>
        ) : (
          // DESKTOP VIEW
          <div className="flex flex-col md:flex-row gap-2">
            <Button
              variant={activeTab === "awaiting" ? "contain" : "subtle"}
              className={`px-5 py-2 rounded-md font-medium transition-all border border-primary/40`}
              onClick={() => setActiveTab("awaiting")}
            >
              My Documents{" "}
              <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
                {documents.filter((doc) => doc.type === "Personal").length}
              </span>
            </Button>

            <Button
              variant={activeTab === "mydocs" ? "contain" : "subtle"}
              className={`px-5 py-2 rounded-md font-medium transition-all border border-primary/40`}
              onClick={() => setActiveTab("mydocs")}
            >
              Awaiting My Acknowledgment{" "}
              <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
                {
                  documents.filter(
                    (doc) => doc.status === "Acknowledgement Required",
                  ).length
                }
              </span>
            </Button>

            <Button
              variant={activeTab === "approved" ? "contain" : "subtle"}
              className={`px-5 py-2 rounded-md font-medium transition-all border border-primary/40`}
              onClick={() => setActiveTab("approved")}
            >
              Documents Approved{" "}
              <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
                {
                  documents.filter(
                    (doc) =>
                      doc.type?.trim().toLowerCase() !== "personal" &&
                      doc.status === "Approved",
                  ).length
                }
              </span>
            </Button>
          </div>
        )}
      </div>

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
                    <td className="py-4 px-6 font-medium">{doc.file_name}</td>
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


                        {/* Personal or Approved → show View + Download buttons */}
                        {(doc.type === "Personal" || doc.status === "Approved") && (
                          <>
                            {canViewDocument && (
                              <Button
                                variant="soft"
                                onClick={() => setSelectedFile(doc.file_name)}
                              >
                                View
                              </Button>
                            )}
                            {canDownloadDocument && (
                              <a
                                href={getFileUrl(doc.file_name)}
                                download
                              // className="inline-flex items-center px-4 py-1 rounded-md bg-primary-500 hover:bg-primary-600 text-white hover:text-white transition-colors text-xs font-brand"
                              >
                                <Button variant="contain" >
                                  Download
                                </Button>
                              </a>
                            )}
                          </>
                        )}
                        {/* Acknowledgement Required → show Acknowledge button */}
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
