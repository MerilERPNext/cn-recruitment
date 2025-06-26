import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Types and Interfaces
interface Referral {
  id: number;
  title: string;
  source: string;
  submitted: string;
  status: string;
  statusIcon: string;
  statusColor: string;
  avatar: string;
}

interface NavItem {
  name: string;
  icon: string;
  active?: boolean;
}

type TabName = 'Referrals' | 'Interviews' | 'Requirements' | 'Requisitions';

const RecruitmentApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReferrals, setSelectedReferrals] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabName>('Referrals');

  const referrals: Referral[] = [
    {
      id: 1,
      title: "Referral for Software Engineer",
      source: "LinkedIn",
      submitted: "2023-10-26",
      status: "Pending",
      statusIcon: "hourglass_empty",
      statusColor: "text-yellow-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAt-FELbIBS5TVSC3TTO57mgqbRaprRIvMJA_ApPyXsxrKThPhD1CtHhmjBsC-LeP5U6APs_mtgkbDyqAIJRtz030j-mIucU9hDMYCMPl2-_sa1WWDnfu2OBtu8bEGnZTKTpHekmZ60ntESo_fEc9iRgTCMz6sDfgFkbFng7kq-pFEueonDMvgzUdJj1fQSEHJTpeqb0a7AmMTU5QTkdx9gVdSA7TmEeZ3U9tyQCp8K81AFu7RO_Q89t-yrM0dl_s_xBFNkGdotO9Gq"
    },
    {
      id: 2,
      title: "Referral for Product Manager",
      source: "Employee Referral",
      submitted: "2023-10-25",
      status: "Interview Scheduled",
      statusIcon: "event",
      statusColor: "text-blue-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuARlg8-IucoXnEsIYIeyN9EHMTNXweoRf5ETsXg-Xm4-9odowTzfa1Rd-2OBpiuLyK6aka_1sgccNF6fC0jYXN9nLiIQ6p8Tzxn7S2bw5988z8FIrsK6ZV_B1fRyAO7zkXrt05wmmWgGp__6TziNqMRIGnfeQ1vfBqmqxF6oIiOit8ce6EhxXRNJGn6vcyomPWB9TXPAhkqnRcv3Bl9X4uKJ27LsoY0CjuHrx73CjWV7lWbNTNZ4xSYL91jEynbDMe-NHmP6w3g_9N3"
    },
    {
      id: 3,
      title: "Referral for Data Analyst",
      source: "Company Website",
      submitted: "2023-10-24",
      status: "Accepted",
      statusIcon: "check_circle_outline",
      statusColor: "text-green-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFWtQeInXYsky7NDsIIpeMhXAzcxYHT-2hkvgFObNXz_lprM3ZF2M5id6hPTVc22i5y631iL5QG8ZjZk-PzpzFDWYUkBglsLRIahrwrIMupyua-6zswy4dPTHGI95GKroufXdLqzpHiPTFjr-aIbL1DSj04oYg85Iwr3FsVl4fK-ZRkY8k7-1h7u8i6HnHccH4iBmUA4PwqKWJcPGnTvnDZvZqclW5wGy7cXQVCRJJ6djXWN6zopJzB_tzq2TgLH3W86fdHf5hjL5D"
    },
    {
      id: 4,
      title: "Referral for UX Designer",
      source: "Job Board",
      submitted: "2023-10-23",
      status: "Rejected",
      statusIcon: "cancel_outline",
      statusColor: "text-red-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_xeSUO1ugCDjr_plPCzzg1Y-ISj9j7_foaFpRejFZS2LNaKoWvTg0nd-vhTOSlmVCXkkSXWDs65xc5R44TIkbljYCp2qTJSlFEwIli6LgNfOm_jNfBECNhxGbIUAIiV1xe18hB-I9GLi4VW9SkvGOjH-v_qG_E-bWgHidiDrdMH2VqqOiDkJ_QIhgJiu0aCVcxW7XfXWqy8niIEqkVO1da3syzTJZ7NFYg3rrrm2GKPQjDel6FNIEyhGoMSdwH5Z14iLJitG2tu81"
    }
  ];

  const tabs: TabName[] = ['Referrals', 'Interviews', 'Requirements', 'Requisitions'];
  const navItems: (NavItem & { route?: string })[] = [
    { name: 'Home', icon: 'home', route: '/' },
    { name: 'IDs', icon: 'badge', route: '/id-card' },
    { name: 'Recruitment', icon: 'work', active: true, route: '/recruitment' },
    { name: 'Alerts', icon: 'notifications', route: '/alerts' },
    { name: 'Search', icon: 'search', route: '/search' }
  ];

  const handleCheckboxChange = (id: number): void => {
    const newSelected = new Set(selectedReferrals);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReferrals(newSelected);
  };

  const filteredReferrals: Referral[] = referrals.filter(referral =>
    referral.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative flex size-full min-h-screen flex-col justify-between group/design-root overflow-x-hidden bg-white" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      {/* Custom CSS Variables and Styles */}
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
          line-height: 1;
        }
        .material-icons {
          font-family: 'Material Icons';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: 'liga';
        }
      `}</style>

      <div className="flex-grow">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--background-light)] shadow-sm">
          <div className="flex items-center p-4 pb-2 justify-between">
            <button 
              onClick={() => navigate('/')}
              className="text-[var(--text-primary)] flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-[var(--background-medium)] transition-colors"
            >
              <span className="material-icons">arrow_back_ios_new</span>
            </button>
            <h1 className="text-[var(--text-primary)] text-xl font-semibold leading-tight tracking-tight flex-1 text-center">
              Recruitment
            </h1>
            <div className="size-10"></div>
          </div>

          {/* Navigation Tabs */}
          <nav className="pb-0">
            <div className="flex border-b border-[var(--border-light)] px-2 gap-x-1 sm:gap-x-2 overflow-x-auto whitespace-nowrap">
              {tabs.map((tab) => (
                <a
                  key={tab}
                  href="#"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    setActiveTab(tab);
                  }}
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-3 px-3 flex-1 transition-colors ${
                    activeTab === tab
                      ? 'border-b-[var(--primary-color)] text-[var(--primary-color)]'
                      : 'border-b-transparent text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:border-b-[var(--primary-color)]'
                  }`}
                >
                  <p className="text-sm font-medium leading-normal">{tab}</p>
                </a>
              ))}
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="px-4 pt-6 pb-20">
          {/* Section Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight">
              {activeTab}
            </h2>
            <div className="flex items-center gap-2">
              <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors">
                <span className="material-icons">delete</span>
              </button>
              <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors">
                <span className="material-icons">more_vert</span>
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-grow">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                search
              </span>
              <input
                className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)]"
                placeholder="Search referrals..."
                type="text"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] px-3 text-[var(--text-secondary)] hover:bg-[var(--background-medium)] transition-colors">
              <span className="material-icons">filter_list</span>
            </button>
          </div>

          {/* Referrals List */}
          <div className="space-y-3">
            {filteredReferrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center gap-3 bg-[var(--background-light)] p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-[var(--border-light)] cursor-pointer"
              >
                <input
                  className="checkbox-custom size-4 rounded border-[var(--border-light)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] appearance-none shrink-0"
                  type="checkbox"
                  checked={selectedReferrals.has(referral.id)}
                  onChange={() => handleCheckboxChange(referral.id)}
                />
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12 shrink-0"
                  style={{ backgroundImage: `url("${referral.avatar}")` }}
                ></div>
                <div className="flex-grow min-w-0">
                  <p className="text-[var(--text-primary)] text-base font-medium leading-tight line-clamp-1">
                    {referral.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Source: {referral.source}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Submitted: {referral.submitted}
                  </p>
                  <div className="flex items-center text-xs text-[var(--text-secondary)] mt-1">
                    <span className={`material-icons text-sm mr-1 ${referral.statusColor}`}>
                      {referral.statusIcon}
                    </span>
                    <span>Status: {referral.status}</span>
                  </div>
                </div>
                <span className="material-icons text-[var(--text-secondary)]">chevron_right</span>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 z-10 bg-[var(--background-light)] shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around border-t border-[var(--border-light)] px-2 py-2 sm:px-4">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => item.route && navigate(item.route)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors group ${
                item.active
                  ? 'text-[var(--primary-color)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--primary-color)]'
              }`}
            >
              <span className="material-icons">{item.icon}</span>
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          ))}
        </div>
        <div className="h-safe-area-bottom bg-[var(--background-light)]"></div>
      </footer>

      {/* Floating Action Button */}
      <button className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full bg-[var(--primary-color)] p-4 text-white shadow-lg hover:bg-blue-600 transition-colors">
        <span className="material-icons">add</span>
      </button>
    </div>
  );
};

export default RecruitmentApp; 