"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CurrentBalanceTab from "./tabs/CurrentBalance";
import PassbookTab from "./tabs/PassbookTab";
import PolicyQATab from "./tabs/PolicyQATab";
import AccrualJournalTab from "./tabs/AccrualJournalTab";
import { LeaveBalance } from "../../../types/leaves";
import NavigationTabs from "../../NavigationTab";

type TabType = "current" | "passbook" | "policy" | "accrual";

interface BalanceDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType: string;
  leaveData: LeaveBalance;
}

const TABS = [
  { key: "current", label: "Current Balance" },
  { key: "passbook", label: "Passbook" },
  { key: "policy", label: "Policy Q&A" },
  { key: "accrual", label: "Accrual Journal" },
];

const BalanceDetailsDrawer: React.FC<BalanceDetailsDrawerProps> = ({
  isOpen,
  onClose,
  leaveType,
  leaveData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("current");

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("current");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[900px] lg:w-[1000px] bg-white z-50 flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h2 className="base-title md:text-lg font-semibold">{leaveType}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </div>

        <NavigationTabs
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        />

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
