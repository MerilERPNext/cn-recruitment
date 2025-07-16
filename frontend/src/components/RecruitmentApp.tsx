import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InterviewPage from "./interview";
import JobRequisition from "./JobRequisition";
import ReferralList from "./RafarralList";
import JobApplicantList from "./JobApplicantList";
import JobOpeningsUI from "./JobOpening/JobOpening";

type TabName =
  | "Referrals"
  | "Interviews"
  | "Requisitions"
  | "Job Opening"
  | "Job Applicants";

const RecruitmentApp: React.FC = () => {
  const navigate = useNavigate();
  const storedTab = sessionStorage.getItem("activeTab") as TabName | null;
  const [activeTab, setActiveTab] = useState<TabName>(storedTab || "Referrals");

  const tabs: TabName[] = [
    "Requisitions",
    "Referrals",
    "Interviews",
    "Job Opening",
    "Job Applicants",
  ];

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    sessionStorage.setItem("activeTab", tab);
  };
  const handleAddNew = () => {
    if (activeTab === "Referrals") {
      navigate("/webapp/recruitment-app/add-new-referral");
    } else if (activeTab === "Requisitions") {
      window.open("/app/job-requisition/new");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <style>{`
        :root {
          --primary-color: #0c7ff2;
          --secondary-color: #60758a;
          --text-primary: #111418;
          --text-secondary: #60758a;
          --background-light: #ffffff;
          --background-medium: #f0f2f5;
          --border-light: #dbe0e6;
        }
        .checkbox-custom:checked {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }
        .checkbox-custom:checked::before {
          content: "✔";
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 10px;
        }
        .material-icons {
          font-family: 'Material Icons';
          font-size: 24px;
        }
          .scrollbar-hidden {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none;  /* IE and Edge */
        }

       .scrollbar-hidden::-webkit-scrollbar {
       display: none; /* Chrome, Safari, Opera */
       }
      `}</style>

      {/* Header */}
      <header className="sticky z-50 top-0 bg-white shadow-sm">
        <div className="flex items-center p-1 justify-center">
          <h1 className="text-xl font-semibold justify-center px-4  text-slate-900 text-center">
            {activeTab}
          </h1>
          <div className="w-8"></div>
        </div>

        {/* Tabs */}
        <nav className="border-b border-[var(--border-light)] px-2 flex overflow-x-auto scrollbar-hidden">
          {tabs.map((tab) => (
            <a
              key={tab}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleTabChange(tab);
              }}
              className={`inline-block whitespace-nowrap px-4 py-3 border-b-2 text-sm font-medium ${
                activeTab === tab
                  ? "border-[var(--primary-color)] text-[var(--primary-color)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:border-[var(--primary-color)]"
              }`}
            >
              {tab}
            </a>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        {(() => {
          switch (activeTab) {
            case "Interviews":
              return <InterviewPage />;
            case "Referrals":
              return <ReferralList />;
            case "Requisitions":
              return <JobRequisition />;
            case "Job Opening":
              return <JobOpeningsUI />;

            case "Job Applicants":
              return <JobApplicantList />;

            default:
              return null;
          }
        })()}
      </main>
      {(activeTab === "Requisitions" || activeTab === "Referrals") && (
        <button
          onClick={handleAddNew}
          className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-full hover:bg-blue-700 fixed bottom-20 right-4 z-50"
        >
          +
        </button>
      )}
    </div>
  );
};

export default RecruitmentApp;
