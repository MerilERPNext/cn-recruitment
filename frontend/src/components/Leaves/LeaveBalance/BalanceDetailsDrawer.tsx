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
import { Typography } from "../../shared/atoms/Typography";

type TabType = "current" | "passbook" | "policy" | "accrual";
type DrawerSize = "sm" | "md" | "lg" | "xl" | "xxl" | "full";

interface BalanceDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType: string;
  leaveData: LeaveBalance;
  size?: DrawerSize;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: "w-screen sm:w-64",
  md: "w-screen sm:w-80",
  lg: "w-screen sm:w-96",
  xl: "w-screen sm:w-[32rem]",
  xxl: "w-screen sm:w-[42rem]",
  full: "w-screen",
};

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
  size = "xxl",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("current");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("current");
    }
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div
        className={`
          fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto
          bg-white z-50 flex flex-col shadow-xl
          transition-transform duration-300 ease-in-out
          ${sizeClasses[size]}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
          <Typography variant="subheading">{leaveType}</Typography>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="sticky top-0 z-10 bg-white border-b">
          <NavigationTabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as TabType)}
          />
        </div>

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
