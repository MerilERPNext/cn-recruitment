/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import ApprovalStages from "./ApprovalStages";

interface ApprovalStage {
  stage_name: string | null;
  user: string | null;
  role: string | null;
  status: "Approved" | "Pending" | "Rejected";
}

interface ReferenceDocument {
  name: string;
  employee_name: string;
  [key: string]: any;
}

interface ApprovalData {
  reference_type: string;
  reference_name: string;
  approval_stages_status: ApprovalStage[];
  reference_document: ReferenceDocument;
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ApprovalData;
}

export default function SeparationApprovalModal({
  isOpen,
  onClose,
  data,
}: ApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto">
          {/* Header */}
          <div className=" border-slate-200 p-6 flex justify-between items-center">
            <div className=" border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {data.reference_type} - Approval Status
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Reference: {data.reference_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition-colors"
            >
              X
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <ApprovalStages stages={data.approval_stages_status} />
          </div>
        </div>
      </div>
    </>
  );
}
