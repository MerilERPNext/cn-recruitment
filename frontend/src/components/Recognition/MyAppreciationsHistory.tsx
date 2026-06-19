import React, { useMemo, useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import {
  APPRECIATIONS,
  HistoryCardList,
  HistoryPagination,
  HistoryTable,
  HistoryTabs,
  HistoryToolbar,
  type AppreciationHistoryTab,
} from "./components/MyAppreciationsHistory";

const MyAppreciationsHistory: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] =
    useState<AppreciationHistoryTab>("received");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAppreciations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return APPRECIATIONS.filter((item) => {
      if (item.tab !== activeTab) return false;
      if (!normalizedSearch) return true;

      return [item.title, item.value, item.person, item.date].some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [activeTab, searchTerm]);

  const relationLabel = activeTab === "received" ? "Received From" : "Given To";

  const content = (
    <main className="min-h-full bg-[#f6f7fb] p-3 font-sans sm:p-5 lg:p-6">
      <section className="mx-auto w-full max-w-screen rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <HistoryToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {isDesktop ? (
          <HistoryTable
            items={filteredAppreciations}
            relationLabel={relationLabel}
          />
        ) : (
          <HistoryCardList items={filteredAppreciations} />
        )}

        <HistoryPagination totalRecords={filteredAppreciations.length} />
      </section>
    </main>
  );

  const tabs = (
    <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          My Appreciations History
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Manage your appreciations history
        </p>
      </div>
      {tabs}
      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
    </div>
  );
};

export default MyAppreciationsHistory;
