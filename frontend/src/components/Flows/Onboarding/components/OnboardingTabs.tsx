import { memo } from "react";
import { OnboardingTab } from "./types";

interface OnboardingTabsProps {
  tabs: OnboardingTab[];
  activeTab: OnboardingTab;
  onTabChange: (tab: OnboardingTab) => void;
}

const OnboardingTabs = ({
  tabs,
  activeTab,
  onTabChange,
}: OnboardingTabsProps) => (
  <div className="-mx-4 sm:mx-0 overflow-x-auto border-b border-border px-4 sm:px-0 scrollbar-none">
    <div className="flex min-w-max gap-5 sm:gap-8">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`shrink-0 pb-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 relative -mb-px ${
            activeTab === tab
              ? "text-text-link border-primary"
              : "text-text-body2 border-transparent hover:text-text-title"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  </div>
);

export default memo(OnboardingTabs);
