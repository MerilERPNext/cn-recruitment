"use client";

import type React from "react";
import { useEffect, useState } from "react";
import CurrentBalanceTab from "./tabs/CurrentBalance";
import PassbookTab from "./tabs/PassbookTab";
import PolicyQATab from "./tabs/PolicyQATab";
import AccrualJournalTab from "./tabs/AccrualJournalTab";
import { LeaveBalance } from "../../../types/leaves";
import NavigationTabs from "../../NavigationTab";
import SideDrawer from "../../shared/SideDrawer";

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
    if (isOpen) {
      setActiveTab("current");
    }
  }, [isOpen]);

  return (
    <SideDrawer
      open={isOpen}
      onClose={onClose}
      side="right"
      size="xxl"
      title={leaveType}
    >
      <div className="flex flex-col h-full">
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
    </SideDrawer>
  );
};

export default BalanceDetailsDrawer;
