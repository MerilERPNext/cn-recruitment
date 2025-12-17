"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CurrentBalanceTab from "./tabs/CurrentBalance";
import PassbookTab from "./tabs/PassbookTab";
import PolicyQATab from "./tabs/PolicyQATab";
import AccrualJournalTab from "./tabs/AccrualJournalTab";

type TabType = "current" | "passbook" | "policy" | "accrual";

interface BalanceDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType: string;
  leaveData: any;
}

const BalanceDetailsDrawer: React.FC<BalanceDetailsDrawerProps> = ({
  isOpen,
  onClose,
  leaveType,
  leaveData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("current");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    // Reset to current tab when drawer opens
    if (isOpen) {
      setActiveTab("current");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[900px] lg:w-[1000px] bg-white z-50 flex flex-col shadow-xl">
        {/* <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-lg bg-white z-50 flex flex-col shadow-xl"> */}
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold">{leaveType}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white px-4">
          <button
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "current"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("current")}
          >
            Current Balance
          </button>
          <button
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "passbook"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("passbook")}
          >
            Passbook
          </button>
          <button
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "policy"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("policy")}
          >
            Policy Q&A
          </button>
          <button
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "accrual"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("accrual")}
          >
            Accrual Journal
          </button>
        </div>

        {/* Content - Only render active tab */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "current" && (
            <CurrentBalanceTab leaveData={leaveData} />
          )}
          {activeTab === "passbook" && <PassbookTab leaveData={leaveData} />}
          {activeTab === "policy" && <PolicyQATab leaveData={leaveData} />}
          {activeTab === "accrual" && (
            <AccrualJournalTab leaveData={leaveData} />
          )}
        </div>
      </div>
    </>
  );
};

export default BalanceDetailsDrawer;
