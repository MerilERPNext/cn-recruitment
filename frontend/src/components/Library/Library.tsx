/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useEmployeeDocument } from "../../hooks/useEmployeeDocuments";

const DocumentLibrary = () => {
  const [activeTab, setActiveTab] = useState("awaiting");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { data } = useEmployeeDocument();
  const [isMobile, setIsMobile] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAcknowledged(e.target.checked);
  };

  const documents = data || [];
  const filteredDocuments = documents.filter((doc: any) => {
    if (activeTab === "awaiting") {
      return doc.status === "Draft";
    } else if (activeTab === "mydocs") {
      return doc.status === "Acknowledgement Required";
    } else if (activeTab === "approved") {
      return doc.status === "Approved";
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
      doc.status === "Acknowledgement Required"
  );

  const getFileUrl = (path: string) => `${path}`;

  return (
    <div className="bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="border-gray-200 my-2 pb-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Document Library
          </h2>
          <p className="text-gray-600">
            Your document library
          </p>
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
                    (doc) => doc.status === "Acknowledgement Required"
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
            <button
              className={`px-5 py-2 rounded-md font-medium transition-all ${activeTab === "awaiting"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => setActiveTab("awaiting")}
            >
              My Documents{" "}
              <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
                {documents.filter((doc) => doc.status === "Draft").length}
              </span>
            </button>

            <button
              className={`px-5 py-2 rounded-md font-medium transition-all ${activeTab === "mydocs"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => setActiveTab("mydocs")}
            >
              Awaiting My Acknowledgment{" "}
              <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
                {
                  documents.filter(
                    (doc) => doc.status === "Acknowledgement Required"
                  ).length
                }
              </span>
            </button>

            <button
              className={`px-5 py-2 rounded-md font-medium transition-all ${activeTab === "approved"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => setActiveTab("approved")}
            >
              Documents Approved{" "}
              <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
                {documents.filter((doc) => doc.status === "Approved").length}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-scroll shadow-sm">
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
          <tbody className="text-gray-800">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc: any, i: number) => (
                <tr
                  key={i}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-6 font-medium">{doc.name}</td>
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
                    {/* Acknowledgement Required → show Acknowledge button */}
                    {doc.status === "Acknowledgement Required" && (
                      <button
                        onClick={() => setSelectedFile(doc.file_name)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                      >
                        Acknowledge
                      </button>
                    )}

                    {/* Draft or Approved → show View + Download buttons */}
                    {(doc.status === "Draft" || doc.status === "Approved") && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedFile(doc.file_name)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-all"
                        >
                          View
                        </button>
                        <a
                          href={getFileUrl(doc.file_name)}
                          download
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                        >
                          Download
                        </a>
                      </div>
                    )}
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
        </table>
      </div>

      {/* PDF Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50  flex items-center justify-center z-50">
          <div className="bg-white  shadow-lg w-full h-screen flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Document Preview
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            {/* PDF viewer */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={getFileUrl(selectedFile + "#toolbar=0")}
                title="Document PDF"
                className="w-full h-[80vh]"
              ></iframe>
            </div>
            {showAcknowledgement && (
              <div
                className={`border-t p-4 w-full transition-all duration-300 ${acknowledged ? "bg-green-100" : "bg-red-100"
                  }`}
              >
                <p
                  className={`font-medium transition-all duration-300 ${acknowledged ? "text-green-700" : "text-red-700"
                    }`}
                >
                  {acknowledged
                    ? "Confirm Acknowledge Complete"
                    : "Confirm Acknowledgement Required by checkbox"}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center p-4">
              <div className="flex justify-between items-center p-4">
                {showAcknowledgement && (
                  <div className="flex justify-start items-center">
                    <input
                      type="checkbox"
                      id="acknowledgeCheckbox"
                      checked={acknowledged}
                      onChange={handleCheckboxChange}
                      className="mr-2 accent-green-600 w-4 h-4 cursor-pointer"
                    />
                    <label
                      htmlFor="acknowledgeCheckbox"
                      className={`font-bold cursor-pointer ${acknowledged ? "text-green-700" : "text-gray-700"
                        }`}
                    >
                      Acknowledgement Required
                    </label>
                  </div>
                )}
              </div>

              <div className=" flex justify-end">
                <button
                  onClick={closeModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-md"
                >
                  Close
                </button>
                {/* Only show Acknowledge button if status = "Acknowledgement Required" */}
                {showAcknowledgement && acknowledged && (
                  <button
                    onClick={() => alert("submit! ✅")}
                    className="ml-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md"
                  >
                    Submit
                  </button>
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
