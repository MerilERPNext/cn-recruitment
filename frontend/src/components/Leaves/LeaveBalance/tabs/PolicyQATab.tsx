"use client";
import type React from "react";

interface PolicyQATabProps {
  leaveData: any;
}

const PolicyQATab: React.FC<PolicyQATabProps> = ({ leaveData }) => {
  return (
    <div className="p-4">
      <div className="text-center py-12 text-gray-500">
        <h3 className="text-lg font-semibold mb-2">Policy Q&A</h3>
        <p>Content coming soon</p>
      </div>
    </div>
  );
};

export default PolicyQATab;
