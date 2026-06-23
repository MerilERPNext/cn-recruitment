import type { AppreciationHistoryTab } from "./types";

type HistoryTabsProps = {
  activeTab: AppreciationHistoryTab;
  onTabChange: (tab: AppreciationHistoryTab) => void;
};

const HistoryTabs = ({ activeTab, onTabChange }: HistoryTabsProps) => (
  <div className="flex items-center justify-center gap-1 border-b border-gray-200 bg-white">
    {(["received", "given"] as AppreciationHistoryTab[]).map((tab) => {
      const isActive = activeTab === tab;
      return (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`min-w-20 border-b-2 px-4 py-3 text-sm font-semibold capitalize transition ${
            isActive
              ? "border-primary text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab}
        </button>
      );
    })}
  </div>
);

export default HistoryTabs;
