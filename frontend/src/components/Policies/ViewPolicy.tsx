import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import SecurePdfViewer from "../SecurePdfViewer_CookieAuth";
import { useFrappeDocument } from "../../hooks/useFrappeQuery";
import HeaderBar from "../HeaderBar";

const ViewPolicy: React.FC = () => {
  const navigate = useNavigate();
  const { policyName } = useParams<{ policyName: string }>();

  const { data, isLoading, error } = useFrappeDocument(
    "Policy Details", // Using correct doctype name
    policyName!,
    ["policy_document"] // Using correct field name
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfUrl = (data as any)?.policy_document;

  const DownloadPdf: React.FC = () => (
    <a
      href={pdfUrl}
      download
      className="flex items-center text-primary hover:text-primary-700 transition-colors"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Download
    </a>
  );

  if (isLoading) return <div className="p-4 text-center text-sm">Loading…</div>;

  if (error || !pdfUrl)
    return (
      <>
        <HeaderBar title="View Policy" onBack={() => navigate(-1)} />
        <div className="p-4 text-center text-red-500 text-sm">
          No PDF document found for “{policyName}”.
        </div>
      </>
    );

  return (
    <>
      <HeaderBar
        title="View Policy"
        onBack={() => navigate(-1)}
        rightSlot={<DownloadPdf />}
      />
      <div className="h-screen w-full flex flex-col bg-white">
        <main className="flex-1 overflow-hidden">
          <SecurePdfViewer fetchUrl={pdfUrl} className="w-full h-full" />
        </main>
      </div>
    </>
  );
};

export default ViewPolicy;
