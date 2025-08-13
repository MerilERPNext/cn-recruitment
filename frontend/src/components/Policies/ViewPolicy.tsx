import React from "react";
import { useParams } from "react-router-dom";
import SecurePdfViewer from "../SecurePdfViewer_CookieAuth";
import { useFrappeDocument } from "../../hooks/useFrappeQuery";

const ViewPolicy: React.FC = () => {
  const { policyName } = useParams<{ policyName: string }>();

  const { data, isLoading, error } = useFrappeDocument(
    "HR Policies",
    policyName!,
    ["  add_policy_document"]
  );


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfUrl = (data as any)?.add_policy_document;

  if (isLoading) return <div className="p-4 text-center text-sm">Loading…</div>;

  if (error || !pdfUrl)
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        No PDF document found for “{policyName}”.
      </div>
    );

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      <main className="flex-1 overflow-hidden">
        <SecurePdfViewer fetchUrl={pdfUrl} className="w-full h-full" />
      </main>
    </div>
  );
};

export default ViewPolicy;
