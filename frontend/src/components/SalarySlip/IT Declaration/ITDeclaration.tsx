import { useState } from "react";
import InvestmentDeclaration from "./Component/InvestmentDeclaration";
import HouseProperty from "./Component/HouseProperty";
import OtherDeclaration from "./Component/OtherDeclaration";

const tabs = [
  {
    id: "houseProperty",
    label: "House Property (U/S 24)",
    component: HouseProperty,
  },
  {
    id: "investment",
    label: "Investment Declaration (U/S 80C & Others)",
    component: InvestmentDeclaration,
  },
  { id: "others", label: "Others", component: OtherDeclaration },
];

const ITDeclarationForm = () => {
  const [activeTab, setActiveTab] = useState("houseProperty");

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || null;

  return (
    <div className="bg-gray-50 min-h-screen px-3 sm:px-6 py-4">
      {/* HEADER */}
      <header className="bg-blue-50 rounded-lg p-4 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* LEFT INFO */}
          <div>
            <h1 className="text-sm font-semibold text-gray-800 flex flex-wrap items-center gap-2">
              IT Declaration for the Financial Year 2025 - 2026
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                UPDATED
              </span>
            </h1>

            <p className="text-xs text-gray-600 mt-1">
              Go Ahead with New Tax Regime :{" "}
              <span className="font-medium">NEW</span>
            </p>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 w-full sm:w-auto">
              COMPARE TAX
            </button>

            <span className="border border-gray-300 px-4 py-1.5 rounded text-sm bg-white text-center w-full sm:w-auto">
              Form 12BB
            </span>
          </div>
        </div>

        {/* TABS */}
        <nav className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-1.5 text-sm rounded-2xl border-1 transition
                ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* CONTENT CARD */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
        {ActiveComponent && (
          <div className="w-full overflow-x-auto">
            <ActiveComponent investments={[]} />
          </div>
        )}

        {/* FOOTER LINKS */}
        <div className="mt-6 pt-4 border-t text-xs text-gray-600 space-y-1">
          <p>VIEW VERSIONS OF IT DECLARATION (0)</p>
          <p>VIEW VERSIONS OF I/O (0)</p>
        </div>
      </div>
    </div>
  );
};

export default ITDeclarationForm;
