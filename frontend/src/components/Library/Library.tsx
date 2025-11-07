import  { useState } from "react";

const DocumentLibrary = () => {
  const [activeTab, setActiveTab] = useState("awaiting");

  const documents = [
    {
      name: "Employee Handbook 2024",
      category: "HR Policies",
      date: "July 15, 2024",
      status: "Awaiting Acknowledgment",
    },
    {
      name: "Q3 Performance Review",
      category: "Performance",
      date: "June 28, 2024",
      status: "Awaiting Acknowledgment",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">
        Document Library
      </h1>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-col md:flex-row gap-2">
          <button
            className={`px-5 py-2 rounded-md font-medium transition-all ${
              activeTab === "awaiting"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("awaiting")}
          >
            My Documents{" "}
            <span className="ml-2 inline-block bg-white text-blue-600 rounded-full px-2 text-sm">
              2
            </span>
          </button>
          <button
            className={`px-5 py-2 rounded-md font-medium transition-all ${
              activeTab === "mydocs"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("mydocs")}
          >
            Awaiting My Acknowledgment
          </button>
          <button
            className={`px-5 py-2 rounded-md font-medium transition-all ${
              activeTab === "approved"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("approved")}
          >
            Documents Approved
          </button>
        </div>

      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-scroll shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 text-sm font-semibold">
            <tr>
              <th className="py-3 px-6">Document Name</th>
              <th className="py-3 px-6">Category</th>
              <th className="py-3 px-6">Date Uploaded</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6"></th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            {documents.map((doc, i) => (
              <tr
                key={i}
                className="border-t hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-6 font-medium">{doc.name}</td>
                <td className="py-4 px-6 text-gray-600">{doc.category}</td>
                <td className="py-4 px-6 text-gray-600">{doc.date}</td>
                <td className="py-4 px-6">
                  <span className="bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-xl">
                    {doc.status}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-all">
                    Acknowledge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentLibrary;
