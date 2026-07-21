import { DownloadIcon } from "lucide-react";
import React from "react";
import { useParams } from "react-router-dom";
import { useFrappeDocument } from "../../hooks/useFrappeQuery";
import HeaderBar from "../HeaderBar";
import SecurePdfViewer from "../SecurePdfViewer_CookieAuth";
import { FilePreview } from "../shared/molecules/FilePreview";
import { getFileTypeInfo } from "../../utils/fileUtils";

const ViewPolicy: React.FC = () => {
  const { policyName } = useParams<{ policyName: string }>();

  const { data, isLoading, error } = useFrappeDocument(
    "Policy Details",
    policyName!,
    ["policy_document"],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentUrl = (data as any)?.policy_document;

  const DownloadDocument: React.FC = () => (
    <a
      href={documentUrl}
      download
      className="flex items-center gap-1.5 text-primary hover:text-primary-700 transition-colors font-brand text-sm font-medium"
    >
      <DownloadIcon className="w-5 h-5 md:w-6 md:h-6" />
    </a>
  );

  if (isLoading)
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <HeaderBar title="View Policy" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-100 border-t-primary mx-auto"></div>
            <p className="mt-3 font-brand text-sm text-text-body2">
              Loading document…
            </p>
          </div>
        </div>
      </div>
    );

  if (error || !documentUrl)
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <HeaderBar title="View Policy" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-error-50 border border-error-200 rounded-2xl p-8 text-center max-w-md w-full">
            <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-brand text-error text-sm">
              No document found for "{policyName}".
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-full bg-surface flex flex-col overflow-hidden">
      <HeaderBar
        title="View Policy"
        rightSlot={<DownloadDocument />}
      />
      <main className="flex-1 min-h-0 flex flex-col px-1 md:px-2 pb-2 overflow-hidden">
        <div className="flex-1 min-h-0 border border-primary-100 rounded-xl bg-white overflow-hidden shadow-sm">
          {getFileTypeInfo(documentUrl).category === "pdf" ? (
            <SecurePdfViewer fetchUrl={documentUrl} className="w-full h-full" />
          ) : (
            <FilePreview fileUrl={documentUrl} className="w-full h-full" />
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewPolicy;
