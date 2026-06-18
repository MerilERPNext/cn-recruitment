import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
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
  const navigate = useNavigate();
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

  if (!isDesktop) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f7fb]">
        <HeaderBar
          title="My Appreciations History"
          onBack={() => navigate("/webapp/recognition/leaderboard")}
        />
        {tabs}
        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </div>
    );
  }

  return (
    <DesktopLayoutWrapper title="My Appreciations History">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-3 text-sm font-semibold">
          <button
            type="button"
            onClick={() => navigate("/webapp/recognition/leaderboard")}
            className="text-gray-500 transition hover:text-gray-900"
          >
            Leaderboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900">My Appreciations History</span>
        </div>
        {tabs}
        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </div>
    </DesktopLayoutWrapper>
  );
};

export default MyAppreciationsHistory;
