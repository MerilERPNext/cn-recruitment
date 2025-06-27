import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReferralDetails from './ReferralDetails';
import { MdArrowBackIosNew } from 'react-icons/md';

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
  const [showReferralDetails, setShowReferralDetails] = useState<boolean>(false); // ✅ Added

  useEffect(() => {
    setShowReferralDetails(activeTab === 'Referrals'); // ✅ Show ReferralDetails when tab is Referrals
  }, [activeTab]);

  const referrals: Referral[] = [
    {
      id: 1,
      title: "Referral for Software Engineer",
      source: "LinkedIn",
      submitted: "2023-10-26",
      status: "Pending",
      statusIcon: "hourglass_empty",
      statusColor: "text-yellow-500",
      avatar: "https://cdn-icons-png.flaticon.com/512/219/219983.png"
    },
    {
      id: 2,
      title: "Referral for Product Manager",
      source: "Employee Referral",
      submitted: "2023-10-25",
      status: "Interview Scheduled",
      statusIcon: "event",
      statusColor: "text-blue-500",
      avatar: "https://cdn-icons-png.flaticon.com/512/219/219983.png"
    },
    {
      id: 3,
      title: "Referral for Data Analyst",
      source: "Company Website",
      submitted: "2023-10-24",
      status: "Accepted",
      statusIcon: "check_circle_outline",
      statusColor: "text-green-500",
      avatar: "https://cdn-icons-png.flaticon.com/512/219/219983.png"
    },
    {
      id: 4,
      title: "Referral for UX Designer",
      source: "Job Board",
      submitted: "2023-10-23",
      status: "Rejected",
      statusIcon: "cancel_outline",
      statusColor: "text-red-500",
      avatar: "https://cdn-icons-png.flaticon.com/512/219/219983.png"
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
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedReferrals(newSelected);
  };

  const handleReferralClick = () => {
    alert("Referral clicked - implement detailed view if needed.");
  };

  const filteredReferrals: Referral[] = referrals.filter(referral =>
    referral.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-white overflow-x-hidden" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      <style>{`
        :root {
          --primary-color: #0c7ff2;
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
      `}</style>

      <div className="flex-grow">
        <header className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex items-center p-4 pb-2 justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-[var(--text-primary)] flex size-10 items-center justify-center rounded-full hover:bg-[var(--background-medium)]"
            >
              <MdArrowBackIosNew className="text-xl" />
            </button>
            <h1 className="text-[var(--text-primary)] text-xl font-semibold text-center flex-1">Recruitment</h1>
            <div className="size-10"></div>
          </div>

          <nav className="pb-0">
            <div className="flex border-b border-[var(--border-light)] px-2 gap-x-2 overflow-x-auto">
              {tabs.map((tab) => (
                <a
                  key={tab}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(tab);
                  }}
                  className={`flex flex-col items-center border-b-[3px] pb-3 pt-3 px-3 flex-1 ${activeTab === tab
                    ? 'border-b-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-b-transparent text-[var(--text-secondary)] hover:text-[var(--primary-color)]'
                    }`}
                >
                  <p className="text-sm font-medium">{tab}</p>
                </a>
              ))}
            </div>
          </nav>
        </header>

        <main className="px-4 pt-6 pb-20">
          {showReferralDetails ? (
            <ReferralDetails />
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                <div className="relative flex-grow">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                    search
                  </span>
                  <input
                    className="w-full rounded-lg border border-[var(--border-light)] bg-white py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)]"
                    placeholder="Search referrals..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-white px-3 text-[var(--text-secondary)] hover:bg-[var(--background-medium)]">
                  <span className="material-icons">filter_list</span>
                </button>
              </div>

              <div className="space-y-3">
                {filteredReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    onClick={handleReferralClick}
                    className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-[var(--border-light)] cursor-pointer"
                  >
                    <input
                      className="checkbox-custom size-4 rounded border-[var(--border-light)] appearance-none shrink-0"
                      type="checkbox"
                      checked={selectedReferrals.has(referral.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleCheckboxChange(referral.id)}
                    />
                    <div
                      className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12 shrink-0"
                      style={{ backgroundImage: `url("${referral.avatar}")` }}
                    ></div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[var(--text-primary)] text-base font-medium line-clamp-1">{referral.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Source: {referral.source}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Submitted: {referral.submitted}</p>
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
            </>
          )}
        </main>
      </div>

      <button
        className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full bg-[var(--primary-color)] p-4 text-white shadow-lg hover:bg-blue-600"
        onClick={() => navigate('/add-new-referral')}
      >
        <span className="material-icons">add</span>
      </button>
    </div>
  );
};

export default RecruitmentApp;
