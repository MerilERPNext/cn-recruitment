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
  <div className="-mx-4 sm:mx-0 overflow-x-auto border-b border-slate-100 px-4 sm:px-0 scrollbar-none">
    <div className="flex min-w-max gap-5 sm:gap-8">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`shrink-0 pb-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 relative -mb-px ${
            activeTab === tab
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-700"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  </div>
);

export default memo(OnboardingTabs);
